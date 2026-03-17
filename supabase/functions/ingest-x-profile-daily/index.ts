import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── ingest-x-profile-daily ──────────────────────────────────────────────────
   Scheduled daily job (triggered by pg_cron via net.http_post).
   Also safe to trigger manually for backfill or testing.

   What it does per run:
     1. Load all property_social_accounts where platform = 'x' and status = 'active'.
     2. Skip any accounts that already have a snapshot for today (idempotent).
     3. Fetch remaining profiles from X API v2 in batches of up to 100 using
        GET /2/users?ids=...  (cheapest endpoint — one API call per 100 accounts).
     4. Insert snapshot rows. Conflict on (account, date) is silently ignored.
     5. Mark any suspended/not-found accounts in property_social_accounts so
        they are skipped on future runs.

   Required secrets  (set via: supabase secrets set KEY=value):
     X_BEARER_TOKEN          — X API v2 app-only Bearer Token
     SUPABASE_SERVICE_ROLE_KEY — provided automatically by Supabase runtime

   Response:
     200  { ok: true,  date, accounts_checked, accounts_pending,
                       snapshots_written, errors_count, api_calls }
     502  { ok: false, error, snapshots_written }   — X API hard failure mid-run
─────────────────────────────────────────────────────────────────────────── */

const JSON_HEADERS = { "Content-Type": "application/json" };

/* ── Env ─────────────────────────────────────────────────────────────────── */
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const X_BEARER_TOKEN   = Deno.env.get("X_BEARER_TOKEN");

const BASE = `${SUPABASE_URL}/rest/v1`;

/* X API v2: maximum IDs per batch call */
const BATCH_SIZE   = 100;
const SOURCE_DETAIL = "x-api-v2-users-batch";

/* Fields to request — mirrors what resolve-x-account fetches */
const X_USER_FIELDS =
  "public_metrics,verified,verified_type,protected,profile_image_url,description";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface SocialAccount {
  id:               string;
  platform_user_id: string;
  username:         string;
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

interface XBatchResponse {
  data?:   XUser[];
  errors?: {
    resource_id:   string;
    detail:        string;
    resource_type: string;
    title:         string;
  }[];
}

/* ── Supabase REST helpers ────────────────────────────────────────────────── */
async function dbSelect(
  table:  string,
  params: string,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/${table}?${params}`, {
    headers: {
      apikey:        SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`DB select ${table} failed: ${await res.text()}`);
  return res.json();
}

async function dbInsertMany(
  table: string,
  rows:  Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) return;
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: {
      apikey:          SERVICE_ROLE_KEY,
      Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type":  "application/json",
      /* Silently skip rows where (social_account_id, snapshot_date) already exists.
         Makes this function fully idempotent when run multiple times in one day. */
      Prefer:          "resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`DB insert ${table} failed: ${await res.text()}`);
}

async function dbPatch(
  table:  string,
  filter: string,
  data:   Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${BASE}/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey:          SERVICE_ROLE_KEY,
      Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB patch ${table} failed: ${await res.text()}`);
}

/* ── X API helper ────────────────────────────────────────────────────────── */

/* Fetches up to BATCH_SIZE users by numeric ID in a single API call.
   This is the cheapest X API v2 pattern — one request per 100 accounts. */
async function fetchXUserBatch(ids: string[]): Promise<XBatchResponse> {
  if (!X_BEARER_TOKEN) throw new Error("X_BEARER_TOKEN secret not set");

  const url = `https://api.twitter.com/2/users?ids=${ids.join(",")}&user.fields=${X_USER_FIELDS}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
    signal:  AbortSignal.timeout(15_000),
  });

  if (res.status === 429) throw new Error("X API rate limit reached");
  if (!res.ok) throw new Error(`X API error ${res.status}: ${await res.text()}`);

  return res.json() as Promise<XBatchResponse>;
}

/* ── Handler ─────────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {

  /* Only POST — pg_cron sends POST with an empty body. */
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS },
    );
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  /* ── 1. Load all active X accounts ──────────────────────────────────── */
  let accounts: SocialAccount[];
  try {
    const rows = await dbSelect(
      "property_social_accounts",
      "platform=eq.x&status=eq.active&select=id,platform_user_id,username,failure_count",
    );
    accounts = rows as unknown as SocialAccount[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: `Failed to load accounts: ${msg}` }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  if (!accounts.length) {
    return new Response(
      JSON.stringify({
        ok:                true,
        date:              today,
        accounts_checked:  0,
        accounts_pending:  0,
        snapshots_written: 0,
        errors_count:      0,
        api_calls:         0,
        message:           "No active X accounts configured",
      }),
      { status: 200, headers: JSON_HEADERS },
    );
  }

  /* ── 2. Skip accounts already ingested today ─────────────────────────
     Fetch all snapshot rows for today in one query.
     Uses the IN filter with all account IDs.                            */
  const allIds = accounts.map(a => a.id);
  const existing = await dbSelect(
    "social_account_snapshots",
    `snapshot_date=eq.${today}&social_account_id=in.(${allIds.join(",")})&select=social_account_id`,
  );
  const alreadyDone = new Set(existing.map(r => r.social_account_id as string));

  const pending = accounts.filter(a => !alreadyDone.has(a.id));

  if (!pending.length) {
    return new Response(
      JSON.stringify({
        ok:                true,
        date:              today,
        accounts_checked:  accounts.length,
        accounts_pending:  0,
        snapshots_written: 0,
        errors_count:      0,
        api_calls:         0,
        message:           "All accounts already ingested today",
      }),
      { status: 200, headers: JSON_HEADERS },
    );
  }

  /* ── 3. Fetch profiles from X API in batches ─────────────────────────
     Map platform_user_id → account for fast lookup after the API call. */
  const accountByXId = new Map(pending.map(a => [a.platform_user_id, a]));
  const xIds         = [...accountByXId.keys()];

  const snapshots: Record<string, unknown>[] = [];
  const errors:    { id: string; username: string; reason: string }[] = [];
  let   apiCalls   = 0;

  for (let i = 0; i < xIds.length; i += BATCH_SIZE) {
    const batch = xIds.slice(i, i + BATCH_SIZE);
    apiCalls++;

    let result: XBatchResponse;
    try {
      result = await fetchXUserBatch(batch);
    } catch (err: unknown) {
      /* Rate limit or network error mid-run.
         Return what we have so far; partial snapshots will be committed below.
         The next run (or a manual re-trigger) will pick up the remainder. */
      const msg = err instanceof Error ? err.message : String(err);
      await dbInsertMany("social_account_snapshots", snapshots);
      return new Response(
        JSON.stringify({
          ok:                false,
          date:              today,
          error:             `Batch ${apiCalls} failed: ${msg}`,
          accounts_checked:  accounts.length,
          accounts_pending:  pending.length,
          snapshots_written: snapshots.length,
          errors_count:      errors.length,
          api_calls:         apiCalls,
        }),
        { status: 502, headers: JSON_HEADERS },
      );
    }

    /* Per-user errors (suspended, not found, etc.) */
    if (result.errors?.length) {
      for (const e of result.errors) {
        const acct = accountByXId.get(e.resource_id);
        if (!acct) continue;

        const newStatus =
          e.title?.toLowerCase().includes("suspend") ? "suspended" : "not_found";

        errors.push({ id: acct.id, username: acct.username, reason: e.detail });

        /* Update account status + observability fields */
        await dbPatch(
          "property_social_accounts",
          `id=eq.${acct.id}`,
          {
            status:              newStatus,
            status_detail:       e.detail,
            last_ingest_status:  "error",
            last_error_message:  e.detail,
            failure_count:       (acct.failure_count ?? 0) + 1,
            updated_at:          new Date().toISOString(),
          },
        );
      }
    }

    /* Map successful users to snapshot rows */
    const collectedAt = new Date().toISOString();
    for (const user of result.data ?? []) {
      const acct = accountByXId.get(user.id);
      if (!acct) continue;

      snapshots.push({
        social_account_id: acct.id,
        snapshot_date:     today,
        platform:          "x",
        followers_count:   user.public_metrics.followers_count,
        following_count:   user.public_metrics.following_count,
        tweet_count:       user.public_metrics.tweet_count,
        posts_count:       user.public_metrics.tweet_count,  // generic alias
        listed_count:      user.public_metrics.listed_count,
        verified:          user.verified,
        verified_type:     user.verified_type ?? null,
        protected:         user.protected,
        profile_image_url: user.profile_image_url ?? null,
        description:       user.description ?? null,
        data_source:       "api",
        source_detail:     SOURCE_DETAIL,
        completeness_pct:  90,  // followers, tweet_count, verified — listed_count present
        ingested_at:       collectedAt,
        collected_at:      collectedAt,
      });
    }
  }

  /* ── 4. Persist snapshots ────────────────────────────────────────────
     ignore-duplicates Prefer header makes this idempotent.             */
  await dbInsertMany("social_account_snapshots", snapshots);

  /* ── 5. Update account-level observability fields ────────────────────
     Batch-update all successfully ingested accounts in one PATCH call.
     Resets failure_count to 0 and records the last successful ingest.  */
  const successIds = snapshots.map(s => s.social_account_id as string);
  if (successIds.length) {
    const finalCollectedAt = snapshots[0].collected_at as string;
    await dbPatch(
      "property_social_accounts",
      `id=in.(${successIds.join(",")})`,
      {
        last_ingest_status:  "ok",
        last_error_message:  null,
        last_ingested_at:    finalCollectedAt,
        failure_count:       0,
        updated_at:          finalCollectedAt,
      },
    ).catch(() => {/* non-fatal — snapshot is already written */});
  }

  return new Response(
    JSON.stringify({
      ok:                true,
      date:              today,
      accounts_checked:  accounts.length,
      accounts_pending:  pending.length,
      snapshots_written: snapshots.length,
      errors_count:      errors.length,
      errors:            errors.length ? errors : undefined,
      api_calls:         apiCalls,
    }),
    { status: 200, headers: JSON_HEADERS },
  );
});
