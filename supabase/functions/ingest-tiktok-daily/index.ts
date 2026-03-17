import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── ingest-tiktok-daily ──────────────────────────────────────────────────────
   Scheduled daily job. Fetches public TikTok profile statistics for all
   properties that have a linked TikTok account.

   Data source: TikTok public profile page (HTML scrape)
   Target URL: https://www.tiktok.com/@{username}
   Method: Fetch page HTML, parse __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON block.

   ── Fragility notice ──────────────────────────────────────────────────────
   TikTok actively works to prevent scraping. This function uses a browser-like
   User-Agent and may fail due to:
   - Cloudflare bot protection (HTTP 403/503)
   - Changed JSON structure in __UNIVERSAL_DATA_FOR_REHYDRATION__
   - Regional blocking

   On failure, the snapshot is written with data_source = 'scraper_failed'
   and completeness_pct = 0. Account status is set to 'error'.
   On next successful run, status reverts to 'active'.

   Fields collected:
     followers_count (followerCount)
     likes_count     (heartCount — total accumulated likes across all videos)
     posts_count     (videoCount)

   Fields NOT collected:
     following, per-video metrics, duet/stitch stats

   Required secrets: none
   SUPABASE_SERVICE_ROLE_KEY — provided automatically by Supabase runtime

   Response:
     200  { ok: true,  date, accounts_checked, snapshots_written, errors_count }
─────────────────────────────────────────────────────────────────────────────── */

const JSON_HEADERS     = { "Content-Type": "application/json" };

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE             = `${SUPABASE_URL}/rest/v1`;

const SOURCE_DETAIL    = "tiktok-public-html-v1";
const MIN_DELAY_MS     = 4_000;
const MAX_DELAY_MS     = 8_000;

/* ── Types ───────────────────────────────────────────────────────────────── */

interface SocialAccount {
  id:       string;
  username: string;
  status:   string;
}

interface TikTokStats {
  followerCount: number;
  heartCount:    number;
  videoCount:    number;
  followingCount: number;
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

/* ── TikTok page scraper ──────────────────────────────────────────────────── */

async function fetchTikTokStats(username: string): Promise<TikTokStats | null> {
  const handle = username.startsWith("@") ? username : `@${username}`;
  const url    = `https://www.tiktok.com/${handle}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept":           "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language":  "en-US,en;q=0.9",
      "Accept-Encoding":  "gzip, deflate, br",
      "Cache-Control":    "no-cache",
      "Sec-Fetch-Dest":   "document",
      "Sec-Fetch-Mode":   "navigate",
      "Sec-Fetch-Site":   "none",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (res.status === 404) return null;
  if (res.status === 429 || res.status === 403 || res.status === 503) {
    throw new Error(`TikTok blocked request (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(`TikTok page returned HTTP ${res.status}`);

  const html = await res.text();

  /* Parse the __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON block embedded in the page.
     This is the primary data source used by the TikTok web client itself. */
  const scriptMatch = html.match(
    /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!scriptMatch?.[1]) {
    /* Fallback: look for SIGI_STATE (older page format) */
    const sigiMatch = html.match(/window\.__INIT_PROPS__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (!sigiMatch) throw new Error("TikTok: could not find user data in page HTML — structure may have changed");
    return parseTikTokSigi(sigiMatch[1]);
  }

  return parseTikTokRehydration(scriptMatch[1]);
}

function parseTikTokRehydration(rawJson: string): TikTokStats | null {
  try {
    const data = JSON.parse(rawJson);
    // Path: __DEFAULT_SCOPE__ → webapp.user-detail → userInfo → stats
    const userInfo = data?.["__DEFAULT_SCOPE__"]?.["webapp.user-detail"]?.userInfo;
    if (!userInfo) return null;

    const stats = userInfo.stats;
    if (!stats) return null;

    return {
      followerCount:  Number(stats.followerCount  ?? 0),
      heartCount:     Number(stats.heartCount     ?? 0),
      videoCount:     Number(stats.videoCount     ?? 0),
      followingCount: Number(stats.followingCount ?? 0),
    };
  } catch {
    return null;
  }
}

function parseTikTokSigi(rawJson: string): TikTokStats | null {
  try {
    const data = JSON.parse(rawJson);
    // Older structure varies — attempt best-effort parse
    const userModule = data?.UserModule?.users;
    if (!userModule) return null;
    const firstUser = Object.values(userModule as Record<string, unknown>)[0] as Record<string, unknown>;
    const stats = firstUser?.stats as Record<string, number> | undefined;
    if (!stats) return null;
    return {
      followerCount:  Number(stats.followerCount  ?? 0),
      heartCount:     Number(stats.heartCount     ?? 0),
      videoCount:     Number(stats.videoCount     ?? 0),
      followingCount: Number(stats.followingCount ?? 0),
    };
  } catch {
    return null;
  }
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
  const now        = () => new Date().toISOString();

  /* ── 1. Load TikTok accounts ─────────────────────────────────────────── */
  let accounts: SocialAccount[];
  try {
    const rows = await dbSelect(
      "property_social_accounts",
      "platform=eq.tiktok&status=in.(active,pending_resolution)&select=id,username,status",
    );
    accounts = rows as unknown as SocialAccount[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: `Failed to load accounts: ${msg}` }), { status: 500, headers: JSON_HEADERS });
  }

  if (!accounts.length) {
    return new Response(JSON.stringify({ ok: true, date: today, accounts_checked: 0, snapshots_written: 0, errors_count: 0, message: "No TikTok accounts configured" }), { status: 200, headers: JSON_HEADERS });
  }

  /* ── 2. Skip already-ingested accounts ──────────────────────────────── */
  const allIds  = accounts.map(a => a.id);
  const existing = await dbSelect(
    "social_account_snapshots",
    `snapshot_date=eq.${today}&social_account_id=in.(${allIds.join(",")})&select=social_account_id`,
  );
  const alreadyDone = new Set(existing.map(r => r.social_account_id as string));
  const pending     = accounts.filter(a => !alreadyDone.has(a.id));

  if (!pending.length) {
    return new Response(JSON.stringify({ ok: true, date: today, accounts_checked: accounts.length, snapshots_written: 0, errors_count: 0, message: "All TikTok accounts already ingested today" }), { status: 200, headers: JSON_HEADERS });
  }

  /* ── 3. Scrape each profile sequentially ────────────────────────────── */
  const snapshots: Record<string, unknown>[] = [];
  const errors: { username: string; reason: string }[] = [];

  for (let i = 0; i < pending.length; i++) {
    const acct = pending[i];
    if (i > 0) await jitter(MIN_DELAY_MS, MAX_DELAY_MS);

    let stats: TikTokStats | null;
    let fetchError: string | null = null;

    try {
      stats = await fetchTikTokStats(acct.username);
    } catch (err: unknown) {
      stats      = null;
      fetchError = err instanceof Error ? err.message : String(err);
    }

    if (!stats || fetchError) {
      const reason = fetchError ?? `Profile not found for @${acct.username}`;
      errors.push({ username: acct.username, reason });

      snapshots.push({
        social_account_id: acct.id,
        snapshot_date:     today,
        platform:          "tiktok",
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

    snapshots.push({
      social_account_id: acct.id,
      snapshot_date:     today,
      platform:          "tiktok",
      followers_count:   stats.followerCount,
      following_count:   stats.followingCount,
      posts_count:       stats.videoCount,
      likes_count:       stats.heartCount,
      tweet_count:       null,
      listed_count:      null,
      data_source:       "scraper",
      source_detail:     SOURCE_DETAIL,
      completeness_pct:  90, // followers, videos, total likes — no per-video breakdown
      ingested_at:       now(),
      collected_at:      now(),
    });

    // Reset to active on success
    await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
      status:           "active",
      status_detail:    null,
      last_verified_at: now(),
      updated_at:       now(),
    });
  }

  await dbInsertMany("social_account_snapshots", snapshots);

  return new Response(JSON.stringify({
    ok: true, date: today, accounts_checked: accounts.length,
    snapshots_written: snapshots.filter(s => s.data_source !== "scraper_failed").length,
    failed_count:  errors.length,
    errors:        errors.length ? errors : undefined,
  }), { status: 200, headers: JSON_HEADERS });
});
