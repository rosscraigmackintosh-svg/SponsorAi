import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── ingest-instagram-daily ───────────────────────────────────────────────────
   Scheduled daily job. Fetches public Instagram profile statistics for all
   properties that have a linked Instagram account.

   Data source: Instagram public internal API endpoint
   Endpoint: GET https://i.instagram.com/api/v1/users/web_profile_info/?username={handle}
   Auth: None (public, unauthenticated — same endpoint the Instagram web client uses)
   Rate: Sequential requests, 1 per account, with jitter between requests.

   ── Fragility notice ──────────────────────────────────────────────────────
   This endpoint is undocumented and may be rate-limited or blocked by Instagram
   without notice. If it fails, the snapshot is written with data_source = 'scraper_failed'
   and completeness_pct = 0. Account status is updated to 'error'.
   On next successful run, status reverts to 'active'.

   Fields collected:
     followers_count (edge_followed_by.count)
     following_count (edge_follow.count)
     posts_count     (edge_owner_to_timeline_media.count)

   Fields NOT collected (not available without login):
     engagement metrics, story views, reel plays

   Required secrets: none (no API key needed)
   SUPABASE_SERVICE_ROLE_KEY — provided automatically by Supabase runtime

   Response:
     200  { ok: true,  date, accounts_checked, snapshots_written, errors_count }
     500  { ok: false, error }
─────────────────────────────────────────────────────────────────────────────── */

const JSON_HEADERS  = { "Content-Type": "application/json" };

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE             = `${SUPABASE_URL}/rest/v1`;

const SOURCE_DETAIL    = "instagram-web-profile-info-v1";

/* Jitter between requests (ms) to avoid triggering rate limiting */
const MIN_DELAY_MS = 3_000;
const MAX_DELAY_MS = 6_000;

/* ── Types ───────────────────────────────────────────────────────────────── */

interface SocialAccount {
  id:       string;
  username: string;
  status:   string;
}

interface IGProfileData {
  followers: number;
  following: number;
  posts:     number;
  is_private: boolean;
}

/* ── Supabase helpers ─────────────────────────────────────────────────────── */

async function dbSelect(table: string, params: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/${table}?${params}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`DB select ${table} failed: ${await res.text()}`);
  return res.json();
}

async function dbInsertMany(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`DB insert ${table} failed: ${await res.text()}`);
}

async function dbPatch(table: string, filter: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB patch ${table} failed: ${await res.text()}`);
}

/* ── Instagram scraper ────────────────────────────────────────────────────── */

async function fetchIGProfile(username: string): Promise<IGProfileData | null> {
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  const res = await fetch(url, {
    headers: {
      "X-IG-App-ID": "936619743392459",
      "User-Agent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept":      "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer":     "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 404) return null;
  if (res.status === 429 || res.status === 403) {
    throw new Error(`Instagram rate limited or blocked (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`Instagram API returned HTTP ${res.status}`);
  }

  const body = await res.json() as {
    data?: {
      user?: {
        edge_followed_by?:              { count: number };
        edge_follow?:                   { count: number };
        edge_owner_to_timeline_media?:  { count: number };
        is_private?:                    boolean;
      };
    };
  };

  const user = body?.data?.user;
  if (!user) return null;

  return {
    followers:  user.edge_followed_by?.count       ?? 0,
    following:  user.edge_follow?.count             ?? 0,
    posts:      user.edge_owner_to_timeline_media?.count ?? 0,
    is_private: user.is_private                    ?? false,
  };
}

/* ── Delay helper ────────────────────────────────────────────────────────── */
function jitter(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise(r => setTimeout(r, ms));
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });
  }

  const today      = new Date().toISOString().slice(0, 10);
  const ingestedAt = new Date().toISOString();

  /* ── 1. Load active Instagram accounts ─────────────────────────────────── */
  let accounts: SocialAccount[];
  try {
    const rows = await dbSelect(
      "property_social_accounts",
      "platform=eq.instagram&status=in.(active,pending_resolution)&select=id,username,status",
    );
    accounts = rows as unknown as SocialAccount[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: `Failed to load accounts: ${msg}` }), { status: 500, headers: JSON_HEADERS });
  }

  if (!accounts.length) {
    return new Response(JSON.stringify({ ok: true, date: today, accounts_checked: 0, snapshots_written: 0, errors_count: 0, message: "No Instagram accounts configured" }), { status: 200, headers: JSON_HEADERS });
  }

  /* ── 2. Skip accounts already ingested today ────────────────────────────── */
  const allIds  = accounts.map(a => a.id);
  const existing = await dbSelect(
    "social_account_snapshots",
    `snapshot_date=eq.${today}&social_account_id=in.(${allIds.join(",")})&select=social_account_id`,
  );
  const alreadyDone = new Set(existing.map(r => r.social_account_id as string));
  const pending     = accounts.filter(a => !alreadyDone.has(a.id));

  if (!pending.length) {
    return new Response(JSON.stringify({ ok: true, date: today, accounts_checked: accounts.length, snapshots_written: 0, errors_count: 0, message: "All Instagram accounts already ingested today" }), { status: 200, headers: JSON_HEADERS });
  }

  /* ── 3. Fetch each profile sequentially (with jitter) ──────────────────── */
  const snapshots: Record<string, unknown>[] = [];
  const errors: { username: string; reason: string }[] = [];
  const now = () => new Date().toISOString();

  for (let i = 0; i < pending.length; i++) {
    const acct = pending[i];

    // Add jitter between requests (not before first)
    if (i > 0) await jitter(MIN_DELAY_MS, MAX_DELAY_MS);

    let profile: IGProfileData | null;
    let fetchError: string | null = null;

    try {
      profile = await fetchIGProfile(acct.username);
    } catch (err: unknown) {
      profile     = null;
      fetchError  = err instanceof Error ? err.message : String(err);
    }

    if (profile === null || fetchError) {
      const reason = fetchError ?? `Profile not found for @${acct.username}`;
      errors.push({ username: acct.username, reason });

      // Write a failed snapshot so we have a timestamp record
      snapshots.push({
        social_account_id: acct.id,
        snapshot_date:     today,
        platform:          "instagram",
        data_source:       "scraper_failed",
        source_detail:     SOURCE_DETAIL,
        completeness_pct:  0,
        ingested_at:       now(),
        collected_at:      now(),
      });

      await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
        status: "error", status_detail: reason, updated_at: now(),
      });
      continue;
    }

    // Completeness: private accounts return all fields but actual counts may be 0
    const completeness = profile.is_private ? 60 : 100;

    snapshots.push({
      social_account_id: acct.id,
      snapshot_date:     today,
      platform:          "instagram",
      followers_count:   profile.followers,
      following_count:   profile.following,
      posts_count:       profile.posts,
      tweet_count:       null,
      listed_count:      null,
      data_source:       "scraper",
      source_detail:     SOURCE_DETAIL,
      completeness_pct:  completeness,
      ingested_at:       now(),
      collected_at:      now(),
    });

    // Mark active + update verified timestamp on success
    if (acct.status !== "active") {
      await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
        status:           "active",
        status_detail:    null,
        last_verified_at: now(),
        updated_at:       now(),
      });
    } else {
      await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
        last_verified_at: now(), updated_at: now(),
      });
    }
  }

  await dbInsertMany("social_account_snapshots", snapshots);

  return new Response(JSON.stringify({
    ok: true, date: today, accounts_checked: accounts.length,
    snapshots_written: snapshots.filter(s => s.data_source !== "scraper_failed").length,
    failed_count:  errors.length,
    errors:        errors.length ? errors : undefined,
  }), { status: 200, headers: JSON_HEADERS });
});
