import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── compute-x-rollups-daily ─────────────────────────────────────────────────
   Scheduled daily job. Reads social_account_snapshots and writes
   derived metrics to social_rollups_daily.

   Makes zero external API calls — all data comes from the local DB.

   ── Momentum Score Formula (source_version = 'x-profile-v1') ─────────────
   Three components, each 0–100:

     growth_component    = CLIP(0, 100, followers_growth_pct_30d * 10)
                           10% monthly follower growth → 100
                           0% growth → 0

     velocity_component  = CLIP(0, 100, followers_growth_pct_7d * 10)
                           Rewards recent acceleration.
                           Uses the same multiplier as 30d so values are comparable.

     activity_component  = CLIP(0, 100, tweet_count_delta_30d / 30 * 100)
                           30 tweets/month → 100
                           0 tweets → 0

   Weighted sum:  score = growth * 0.5 + velocity * 0.3 + activity * 0.2

   When a baseline is missing, that component contributes 0.
   This is conservative — a new account scores low until history builds.

   ── Coverage Confidence ───────────────────────────────────────────────────
     High   = 30d baseline snapshot available
     Medium = 7d baseline available, no 30d
     Low    = less than 7 days of history

   ── Baseline lookup tolerance ────────────────────────────────────────────
   For each window (7d, 30d, 90d) we find the nearest snapshot where
   snapshot_date <= as_of_date - window_days.
   If a daily ingest was missed, this naturally falls back to the
   most recent earlier snapshot — no data is dropped.
   No upper tolerance cap: if the account was linked 5 days ago and
   the 90d baseline is requested, it simply returns null.
─────────────────────────────────────────────────────────────────────────── */

const JSON_HEADERS = { "Content-Type": "application/json" };

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE             = `${SUPABASE_URL}/rest/v1`;

const SOURCE_VERSION   = "x-profile-v1";

/* How far back to fetch snapshots (covers 90d window + buffer) */
const HISTORY_DAYS = 120;

/* ── Types ───────────────────────────────────────────────────────────────── */

interface SocialAccount {
  id:               string;
  property_id:      string;
  platform:         string;
  platform_user_id: string;
  username:         string;
  status:           string;
}

interface Snapshot {
  social_account_id: string;
  snapshot_date:     string; // YYYY-MM-DD
  followers_count:   number | null;
  tweet_count:       number | null;
}

interface Rollup {
  property_id:              string;
  social_account_id:        string;
  platform:                 string;
  as_of_date:               string;
  followers_count:          number | null;
  tweet_count:              number | null;
  followers_delta_7d:       number | null;
  followers_delta_30d:      number | null;
  followers_delta_90d:      number | null;
  followers_growth_pct_7d:  number | null;
  followers_growth_pct_30d: number | null;
  followers_growth_pct_90d: number | null;
  tweet_count_delta_30d:    number | null;
  momentum_score_30d:       number | null;
  momentum_label:           string | null;
  coverage_confidence:      string;
  source_version:           string;
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

async function dbUpsertMany(
  table: string,
  rows:  Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) return;
  const res = await fetch(`${BASE}/${table}?on_conflict=social_account_id,as_of_date`, {
    method: "POST",
    headers: {
      apikey:          SERVICE_ROLE_KEY,
      Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type":  "application/json",
      Prefer:          "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`DB upsert ${table} failed: ${await res.text()}`);
}

/* ── Date helpers ────────────────────────────────────────────────────────── */

/** Subtract `days` from a YYYY-MM-DD string. Returns a YYYY-MM-DD string. */
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/* ── Baseline lookup ─────────────────────────────────────────────────────── */

/**
 * Given a list of snapshots sorted ascending by snapshot_date, find the
 * most recent snapshot whose date is <= targetDate.
 * Returns null if no such snapshot exists (account too new for this window).
 */
function findBaseline(snapshots: Snapshot[], targetDate: string): Snapshot | null {
  let result: Snapshot | null = null;
  for (const s of snapshots) {
    if (s.snapshot_date <= targetDate) {
      result = s; // keep updating — last qualifying entry = nearest to target
    } else {
      break;      // sorted ascending, remaining entries are all later
    }
  }
  return result;
}

/* ── Numeric helpers ─────────────────────────────────────────────────────── */

function clip(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/* ── Metric computation ──────────────────────────────────────────────────── */

function computeRollup(
  account:   SocialAccount,
  snapshots: Snapshot[], // sorted ascending by snapshot_date
  asOfDate:  string,
): Rollup | null {
  /* Need at least the latest snapshot */
  const latest = findBaseline(snapshots, asOfDate);
  if (!latest) return null;

  const fc  = latest.followers_count ?? null;
  const tc  = latest.tweet_count     ?? null;

  /* Baseline snapshots (use nearest available, not exact date) */
  const base7d  = findBaseline(snapshots, subtractDays(asOfDate, 7));
  const base30d = findBaseline(snapshots, subtractDays(asOfDate, 30));
  const base90d = findBaseline(snapshots, subtractDays(asOfDate, 90));

  /* Prevent computing deltas against the same snapshot as latest
     (can happen on day 1 if the account was just resolved) */
  const safe7d  = base7d  && base7d.snapshot_date  < latest.snapshot_date ? base7d  : null;
  const safe30d = base30d && base30d.snapshot_date < latest.snapshot_date ? base30d : null;
  const safe90d = base90d && base90d.snapshot_date < latest.snapshot_date ? base90d : null;

  /* Absolute follower deltas */
  const delta7d  = (fc != null && safe7d?.followers_count  != null) ? fc - safe7d.followers_count  : null;
  const delta30d = (fc != null && safe30d?.followers_count != null) ? fc - safe30d.followers_count : null;
  const delta90d = (fc != null && safe90d?.followers_count != null) ? fc - safe90d.followers_count : null;

  /* Percentage growth (relative to baseline followers, not current) */
  const pct7d  = (delta7d  != null && safe7d!.followers_count!  > 0) ? round4(delta7d  / safe7d!.followers_count!  * 100) : null;
  const pct30d = (delta30d != null && safe30d!.followers_count! > 0) ? round4(delta30d / safe30d!.followers_count! * 100) : null;
  const pct90d = (delta90d != null && safe90d!.followers_count! > 0) ? round4(delta90d / safe90d!.followers_count! * 100) : null;

  /* Tweet count delta (net new tweets, floored at 0 to guard against deletions) */
  const tweetDelta30d = (tc != null && safe30d?.tweet_count != null)
    ? Math.max(0, tc - safe30d.tweet_count)
    : null;

  /* ── Momentum Score ──────────────────────────────────────────────────────
     Uses 30d and 7d windows. Missing baselines contribute 0 (conservative).

     growth_component    = CLIP(0,100, pct30d * 10)   10% monthly = 100
     velocity_component  = CLIP(0,100, pct7d  * 10)   10% weekly  = 100
     activity_component  = CLIP(0,100, tweets30d / 30 * 100)  30/mo = 100

     score = growth * 0.5 + velocity * 0.3 + activity * 0.2
  ──────────────────────────────────────────────────────────────────────── */
  const growthComp   = pct30d      != null ? clip(pct30d      * 10)        : 0;
  const velocityComp = pct7d       != null ? clip(pct7d       * 10)        : 0;
  const activityComp = tweetDelta30d != null ? clip(tweetDelta30d / 30 * 100) : 0;

  const momentumScore = round1(growthComp * 0.5 + velocityComp * 0.3 + activityComp * 0.2);

  const momentumLabel =
    momentumScore >= 70 ? "Rising"  :
    momentumScore >= 40 ? "Stable"  :
                          "Cooling";

  /* ── Coverage Confidence ─────────────────────────────────────────────────
     High   = 30d baseline available (enough history for the primary window)
     Medium = 7d baseline available  (growth trend has some basis)
     Low    = no 7d baseline         (account too new to score meaningfully)
  ──────────────────────────────────────────────────────────────────────── */
  const coverage =
    safe30d ? "High"   :
    safe7d  ? "Medium" :
              "Low";

  return {
    property_id:              account.property_id,
    social_account_id:        account.id,
    platform:                 account.platform,
    as_of_date:               asOfDate,
    followers_count:          fc,
    tweet_count:              tc,
    followers_delta_7d:       delta7d,
    followers_delta_30d:      delta30d,
    followers_delta_90d:      delta90d,
    followers_growth_pct_7d:  pct7d,
    followers_growth_pct_30d: pct30d,
    followers_growth_pct_90d: pct90d,
    tweet_count_delta_30d:    tweetDelta30d,
    momentum_score_30d:       momentumScore,
    momentum_label:           momentumLabel,
    coverage_confidence:      coverage,
    source_version:           SOURCE_VERSION,
  };
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS },
    );
  }

  const asOfDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cutoff   = subtractDays(asOfDate, HISTORY_DAYS);

  /* ── 1. Load active X accounts ──────────────────────────────────────── */
  let accounts: SocialAccount[];
  try {
    const rows = await dbSelect(
      "property_social_accounts",
      "platform=eq.x&status=eq.active&select=id,property_id,platform,platform_user_id,username,status",
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
        ok:              true,
        date:            asOfDate,
        accounts_found:  0,
        rollups_written: 0,
        message:         "No active X accounts",
      }),
      { status: 200, headers: JSON_HEADERS },
    );
  }

  /* ── 2. Batch-fetch snapshot history for all accounts ───────────────────
     One query fetches all rows for all accounts — sorted ascending.
     In-memory grouping avoids N+1 queries.                               */
  const accountIds = accounts.map(a => a.id);

  let allSnapshots: Snapshot[];
  try {
    const rows = await dbSelect(
      "social_account_snapshots",
      [
        `social_account_id=in.(${accountIds.join(",")})`,
        `snapshot_date=gte.${cutoff}`,
        `snapshot_date=lte.${asOfDate}`,
        "order=social_account_id.asc,snapshot_date.asc",
        "select=social_account_id,snapshot_date,followers_count,tweet_count",
        "limit=50000", // safety cap; 120 days * 400 accounts
      ].join("&"),
    );
    allSnapshots = rows as unknown as Snapshot[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: `Failed to load snapshots: ${msg}` }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  /* ── 3. Group snapshots by account_id ───────────────────────────────── */
  const snapshotsByAccount = new Map<string, Snapshot[]>();
  for (const s of allSnapshots) {
    const key = s.social_account_id;
    if (!snapshotsByAccount.has(key)) snapshotsByAccount.set(key, []);
    snapshotsByAccount.get(key)!.push(s);
  }

  /* ── 4. Compute rollups ─────────────────────────────────────────────── */
  const rollups: Rollup[]  = [];
  const skipped: string[]  = [];

  for (const account of accounts) {
    const snapshots = snapshotsByAccount.get(account.id) ?? [];
    const rollup = computeRollup(account, snapshots, asOfDate);
    if (rollup) {
      rollups.push(rollup);
    } else {
      skipped.push(account.username); // no snapshot at all — skip silently
    }
  }

  /* ── 5. Upsert rollups ──────────────────────────────────────────────── */
  try {
    await dbUpsertMany("social_rollups_daily", rollups as unknown as Record<string, unknown>[]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: `Failed to upsert rollups: ${msg}` }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  return new Response(
    JSON.stringify({
      ok:              true,
      date:            asOfDate,
      accounts_found:  accounts.length,
      rollups_written: rollups.length,
      skipped_count:   skipped.length,
      skipped:         skipped.length ? skipped : undefined,
      source_version:  SOURCE_VERSION,
    }),
    { status: 200, headers: JSON_HEADERS },
  );
});
