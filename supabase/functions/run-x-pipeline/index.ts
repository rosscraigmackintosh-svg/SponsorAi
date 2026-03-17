import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── run-x-pipeline ───────────────────────────────────────────────────────────
   Orchestrator for the full X social ingestion pipeline.

   Execution order:
     1. RESOLVE   — batch-resolve any pending_resolution accounts via X API
     2. INGEST    — call ingest-x-profile-daily  (collects today's snapshots)
     3. ROLLUP    — call compute-x-rollups-daily (derives growth metrics)

   Every run is logged to pipeline_runs. Failures in any phase are recorded
   and do not prevent subsequent phases from running.

   Idempotency:
     - Resolution: upsert — re-running a resolved account is a no-op.
     - Ingest: skips accounts that already have a snapshot for today.
     - Rollup: upsert on (social_account_id, as_of_date).
     Safe to call multiple times per day without data corruption.

   Request body (optional JSON):
     {} — standard run
     { "dry_run": true } — load and log only; skip API calls and sub-functions

   Response:
     200  { ok, run_id, status, resolved_count, ingested_count,
                rollups_updated, error_count, duration_ms }
     500  { ok: false, error }  — fatal error (pipeline_runs record not created)
─────────────────────────────────────────────────────────────────────────── */

const JSON_HEADERS = { "Content-Type": "application/json" };

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const X_BEARER_TOKEN   = Deno.env.get("X_BEARER_TOKEN");

const BASE    = `${SUPABASE_URL}/rest/v1`;
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

const PIPELINE_NAME         = "x-pipeline";
const RESOLUTION_BATCH_SIZE = 25;  // X /2/users/by accepts up to 100; 25 is conservative
const X_USER_FIELDS         = "public_metrics,verified,verified_type,protected,profile_image_url,description";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface SocialAccount {
  id:               string;
  property_id:      string;
  username:         string;
  status:           string;
  failure_count:    number;
}

interface XUser {
  id:                string;
  name:              string;
  username:          string;
  verified:          boolean;
  verified_type:     string | null;
  protected:         boolean;
  profile_image_url: string;
  description:       string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count:     number;
    listed_count:    number;
  };
}

interface XByUsernamesResponse {
  data?:   XUser[];
  errors?: {
    resource_id:   string; // the username that failed
    resource_type: string;
    title:         string;
    detail:        string;
  }[];
}

interface PipelineResult {
  resolved_count:  number;
  ingested_count:  number;
  rollups_updated: number;
  error_count:     number;
}

/* ── Supabase REST helpers ────────────────────────────────────────────────── */

async function dbSelect(table: string, params: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/${table}?${params}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`DB select ${table}: ${await res.text()}`);
  return res.json();
}

async function dbInsert(
  table: string,
  data:  Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB insert ${table}: ${await res.text()}`);
  const rows = await res.json() as Record<string, unknown>[];
  return rows[0];
}

async function dbPatch(
  table:  string,
  filter: string,
  data:   Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${BASE}/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB patch ${table}: ${await res.text()}`);
}

/* ── Sub-function caller ─────────────────────────────────────────────────── */

async function callSubFunction(
  name:       string,
  timeoutMs = 180_000,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body:   "{}",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`${name} HTTP ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

/* ── Phase 1: Resolution ─────────────────────────────────────────────────── */
/*
 * Batch-resolves all pending_resolution accounts using GET /2/users/by?usernames=...
 * This endpoint accepts up to 100 comma-separated usernames in one call.
 * We use RESOLUTION_BATCH_SIZE (25) to stay well within rate limits.
 *
 * On success: promotes account to active, resets failure_count.
 * On X-level error (not_found / suspended): marks account accordingly.
 * On network error: marks all accounts in batch as error, increments failure_count.
 *
 * Returns: number of accounts successfully resolved.
 */
async function resolvePhase(
  accounts:   SocialAccount[],
  errors:     string[],
  dryRun:     boolean,
): Promise<number> {
  const pending = accounts.filter(a => a.status === "pending_resolution");
  if (!pending.length) return 0;

  if (!X_BEARER_TOKEN) {
    errors.push("Resolution skipped: X_BEARER_TOKEN not configured");
    return 0;
  }

  if (dryRun) {
    return 0; // dry run: report count only
  }

  const now = new Date().toISOString();
  let resolved = 0;

  for (let i = 0; i < pending.length; i += RESOLUTION_BATCH_SIZE) {
    const batch    = pending.slice(i, i + RESOLUTION_BATCH_SIZE);
    const usernames = batch
      .map(a => a.username.replace(/^@/, ""))
      .join(",");

    const url = `https://api.twitter.com/2/users/by?usernames=${encodeURIComponent(usernames)}&user.fields=${X_USER_FIELDS}`;

    let result: XByUsernamesResponse;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
        signal:  AbortSignal.timeout(15_000),
      });

      if (res.status === 429) throw new Error("X API rate limit hit during resolution");
      if (!res.ok) throw new Error(`X API ${res.status}: ${await res.text()}`);
      result = await res.json();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const batchNum = Math.floor(i / RESOLUTION_BATCH_SIZE) + 1;
      errors.push(`Resolution batch ${batchNum} network error: ${msg}`);

      /* Mark each account in this batch with an error — don't leave them dangling */
      for (const acct of batch) {
        await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
          last_ingest_status:  "error",
          last_error_message:  `Resolution batch failed: ${msg}`,
          failure_count:       (acct.failure_count ?? 0) + 1,
          updated_at:          now,
        }).catch(() => {/* best-effort */});
      }
      continue; // next batch — do not abort
    }

    /* Build case-insensitive username → account map for result matching */
    const accountByUsername = new Map(
      batch.map(a => [a.username.replace(/^@/, "").toLowerCase(), a]),
    );

    /* ── Successful lookups ── */
    for (const user of result.data ?? []) {
      const acct = accountByUsername.get(user.username.toLowerCase());
      if (!acct) continue;

      try {
        await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
          platform_user_id:    user.id,
          display_name:        user.name,
          status:              "active",
          status_detail:       null,
          last_ingest_status:  "ok",
          last_error_message:  null,
          last_ingested_at:    now,
          last_verified_at:    now,
          failure_count:       0,
          updated_at:          now,
        });
        resolved++;
        accountByUsername.delete(user.username.toLowerCase());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to save resolved @${acct.username}: ${msg}`);
      }
    }

    /* ── X-level per-user errors (not_found, suspended) ── */
    for (const xErr of result.errors ?? []) {
      const acct = accountByUsername.get((xErr.resource_id ?? "").toLowerCase());
      if (!acct) continue;

      const newStatus = xErr.title?.toLowerCase().includes("suspend")
        ? "suspended" : "not_found";

      errors.push(`@${acct.username}: ${xErr.detail} (${xErr.title})`);

      await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
        status:             newStatus,
        status_detail:      xErr.detail,
        last_ingest_status: "error",
        last_error_message: xErr.detail,
        failure_count:      (acct.failure_count ?? 0) + 1,
        updated_at:         now,
      }).catch(() => {});

      accountByUsername.delete((xErr.resource_id ?? "").toLowerCase());
    }

    /* ── Accounts not returned and not in errors — truly missing ── */
    for (const [, acct] of accountByUsername) {
      const reason = "Username not returned by X API — may not exist or be deactivated";
      errors.push(`@${acct.username}: ${reason}`);

      await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
        status:             "not_found",
        status_detail:      reason,
        last_ingest_status: "error",
        last_error_message: reason,
        failure_count:      (acct.failure_count ?? 0) + 1,
        updated_at:         now,
      }).catch(() => {});
    }
  }

  return resolved;
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS },
    );
  }

  /* Parse optional body */
  let dryRun = false;
  try {
    const body = await req.json() as { dry_run?: boolean };
    dryRun = body.dry_run === true;
  } catch {/* empty body is fine */}

  const startedAt  = new Date();
  const startedIso = startedAt.toISOString();
  const errors: string[] = [];
  const result: PipelineResult = {
    resolved_count:  0,
    ingested_count:  0,
    rollups_updated: 0,
    error_count:     0,
  };

  /* ── Create pipeline_run record ───────────────────────────────────────── */
  let runId: string;
  try {
    const run = await dbInsert("pipeline_runs", {
      pipeline_name: PIPELINE_NAME,
      started_at:    startedIso,
      status:        "running",
      notes:         dryRun ? { dry_run: true } : null,
    });
    runId = run.id as string;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    /* Cannot log to DB — return immediately */
    return new Response(
      JSON.stringify({ ok: false, error: `Failed to create pipeline run record: ${msg}` }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  /* ── Load all non-terminal X accounts ────────────────────────────────── */
  let accounts: SocialAccount[];
  try {
    const rows = await dbSelect(
      "property_social_accounts",
      "platform=eq.x" +
      "&status=not.in.(not_found,suspended)" +
      "&select=id,property_id,username,status,failure_count",
    );
    accounts = rows as unknown as SocialAccount[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Fatal: failed to load accounts — ${msg}`);

    await dbPatch("pipeline_runs", `id=eq.${runId}`, {
      status:       "failed",
      completed_at: new Date().toISOString(),
      error_count:  1,
      notes:        { errors },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ ok: false, run_id: runId, error: msg }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const pendingCount = accounts.filter(a => a.status === "pending_resolution").length;
  const activeCount  = accounts.filter(a => a.status === "active").length;

  /* ── Phase 1: Resolve pending accounts ───────────────────────────────── */
  try {
    result.resolved_count = await resolvePhase(accounts, errors, dryRun);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Resolution phase uncaught error: ${msg}`);
    /* Continue — ingest should still run for already-active accounts */
  }

  /* ── Phase 2: Ingest profiles ────────────────────────────────────────── */
  if (!dryRun) {
    try {
      const ingestResult = await callSubFunction("ingest-x-profile-daily");
      result.ingested_count =
        (ingestResult.snapshots_written as number | undefined) ?? 0;

      if ((ingestResult.errors_count as number | undefined) ?? 0 > 0) {
        errors.push(
          `Ingest: ${ingestResult.errors_count} account-level error(s)`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Ingest phase failed: ${msg}`);
      /* Continue to rollup — existing snapshots can still be rolled up */
    }
  }

  /* ── Phase 3: Compute rollups ────────────────────────────────────────── */
  if (!dryRun) {
    try {
      const rollupResult = await callSubFunction("compute-x-rollups-daily");
      result.rollups_updated =
        (rollupResult.rollups_written as number | undefined) ?? 0;

      if ((rollupResult.errors_count as number | undefined) ?? 0 > 0) {
        errors.push(`Rollup: ${rollupResult.errors_count} error(s)`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Rollup phase failed: ${msg}`);
    }
  }

  /* ── Finalise ─────────────────────────────────────────────────────────── */
  result.error_count = errors.length;

  const anySuccess = result.resolved_count > 0
    || result.ingested_count > 0
    || result.rollups_updated > 0;

  const finalStatus: string =
    errors.length === 0  ? "completed" :
    anySuccess           ? "partial"   :
                           "failed";

  const completedAt   = new Date();
  const durationMs    = completedAt.getTime() - startedAt.getTime();
  const completedIso  = completedAt.toISOString();

  await dbPatch("pipeline_runs", `id=eq.${runId}`, {
    status:          finalStatus,
    completed_at:    completedIso,
    resolved_count:  result.resolved_count,
    ingested_count:  result.ingested_count,
    rollups_count:   result.rollups_updated,
    error_count:     result.error_count,
    notes:           {
      ...(dryRun ? { dry_run: true } : {}),
      accounts_seen:   accounts.length,
      pending_count:   pendingCount,
      active_count:    activeCount,
      ...(errors.length ? { errors } : {}),
    },
  }).catch(() => {/* best-effort — don't fail the response if this fails */});

  return new Response(
    JSON.stringify({
      ok:              finalStatus !== "failed",
      run_id:          runId,
      status:          finalStatus,
      resolved_count:  result.resolved_count,
      ingested_count:  result.ingested_count,
      rollups_updated: result.rollups_updated,
      error_count:     result.error_count,
      duration_ms:     durationMs,
      dry_run:         dryRun || undefined,
      errors:          errors.length ? errors : undefined,
    }),
    { status: 200, headers: JSON_HEADERS },
  );
});
