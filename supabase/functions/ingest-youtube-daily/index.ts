import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── ingest-youtube-daily ─────────────────────────────────────────────────────
   Scheduled daily job. Fetches YouTube channel statistics for all properties
   that have a linked YouTube account in property_social_accounts.

   For accounts in pending_resolution state (no platform_user_id yet), the
   function first resolves the channel handle to a channel ID via the YouTube
   API, then stores the ID for subsequent runs.

   Data source: YouTube Data API v3
   Endpoint: GET /youtube/v3/channels?part=snippet,statistics&id={ids}&key={key}
   Cost: 1 quota unit per channel (very cheap; free tier = 10,000 units/day)

   Required secrets (supabase secrets set KEY=value):
     YOUTUBE_API_KEY           — Google API key with YouTube Data API v3 enabled
     SUPABASE_SERVICE_ROLE_KEY — provided automatically by Supabase runtime

   Response:
     200  { ok: true,  date, accounts_checked, snapshots_written, errors_count }
     500  { ok: false, error }
─────────────────────────────────────────────────────────────────────────────── */

const JSON_HEADERS = { "Content-Type": "application/json" };

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const YOUTUBE_API_KEY   = Deno.env.get("YOUTUBE_API_KEY");

const BASE              = `${SUPABASE_URL}/rest/v1`;
const YOUTUBE_BASE      = "https://www.googleapis.com/youtube/v3";
const SOURCE_DETAIL     = "youtube-data-api-v3-channels";
const BATCH_SIZE        = 50; // YouTube allows up to 50 IDs per channels.list call

/* ── Types ───────────────────────────────────────────────────────────────── */

interface SocialAccount {
  id:               string;
  property_id:      string;
  platform_user_id: string | null;
  username:         string;
  status:           string;
}

interface YTChannelStats {
  id: string;
  snippet: {
    title:       string;
    description: string;
  };
  statistics: {
    viewCount:       string;
    subscriberCount: string;
    videoCount:      string;
    hiddenSubscriberCount: boolean;
  };
}

interface YTChannelsResponse {
  items?: YTChannelStats[];
  error?: { message: string; code: number };
}

/* ── Supabase REST helpers ────────────────────────────────────────────────── */

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
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`DB insert ${table} failed: ${await res.text()}`);
}

async function dbPatch(table: string, filter: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB patch ${table} failed: ${await res.text()}`);
}

/* ── YouTube API helpers ──────────────────────────────────────────────────── */

/** Resolve a @handle or custom URL slug to a YouTube channel ID. */
async function resolveChannelByHandle(handle: string): Promise<YTChannelStats | null> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY secret not set");

  // Try forHandle param first (supports @handle format; newer API)
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const url = `${YOUTUBE_BASE}/channels?part=snippet,statistics&forHandle=${encodeURIComponent(cleanHandle)}&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 429) throw new Error("YouTube API quota exceeded");
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`);

  const data = await res.json() as YTChannelsResponse;
  if (data.error) throw new Error(`YouTube API error ${data.error.code}: ${data.error.message}`);
  return data.items?.[0] ?? null;
}

/** Fetch a batch of channels by their numeric channel IDs. */
async function fetchChannelsBatch(ids: string[]): Promise<YTChannelStats[]> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY secret not set");

  const url = `${YOUTUBE_BASE}/channels?part=snippet,statistics&id=${ids.join(",")}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (res.status === 429) throw new Error("YouTube API quota exceeded");
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`);

  const data = await res.json() as YTChannelsResponse;
  if (data.error) throw new Error(`YouTube API error ${data.error.code}: ${data.error.message}`);
  return data.items ?? [];
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });
  }

  if (!YOUTUBE_API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "YOUTUBE_API_KEY secret not set" }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const today       = new Date().toISOString().slice(0, 10);
  const ingestedAt  = new Date().toISOString();

  /* ── 1. Load all active + pending_resolution YouTube accounts ───────────── */
  let accounts: SocialAccount[];
  try {
    const rows = await dbSelect(
      "property_social_accounts",
      "platform=eq.youtube&status=in.(active,pending_resolution)&select=id,property_id,platform_user_id,username,status",
    );
    accounts = rows as unknown as SocialAccount[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: `Failed to load accounts: ${msg}` }), { status: 500, headers: JSON_HEADERS });
  }

  if (!accounts.length) {
    return new Response(JSON.stringify({ ok: true, date: today, accounts_checked: 0, snapshots_written: 0, errors_count: 0, message: "No YouTube accounts configured" }), { status: 200, headers: JSON_HEADERS });
  }

  /* ── 2. Resolve pending_resolution accounts (no channel ID yet) ─────────── */
  const errors: { username: string; reason: string }[] = [];

  for (const acct of accounts.filter(a => a.status === "pending_resolution")) {
    try {
      const channel = await resolveChannelByHandle(acct.username);
      if (!channel) {
        errors.push({ username: acct.username, reason: "Channel not found via forHandle lookup" });
        await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
          status: "not_found", status_detail: "Channel not found via YouTube API forHandle lookup", updated_at: ingestedAt,
        });
        continue;
      }
      // Promote to active
      await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
        platform_user_id: channel.id,
        display_name:     channel.snippet.title,
        status:           "active",
        status_detail:    null,
        last_verified_at: ingestedAt,
        updated_at:       ingestedAt,
      });
      acct.platform_user_id = channel.id;
      acct.status = "active";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ username: acct.username, reason: msg });
    }
  }

  /* ── 3. Skip accounts already ingested today ────────────────────────────── */
  const activeAccounts = accounts.filter(a => a.status === "active" && a.platform_user_id);
  if (!activeAccounts.length) {
    return new Response(JSON.stringify({ ok: true, date: today, accounts_checked: accounts.length, snapshots_written: 0, errors_count: errors.length, message: "No active YouTube accounts with resolved channel ID" }), { status: 200, headers: JSON_HEADERS });
  }

  const allIds = activeAccounts.map(a => a.id);
  const existing = await dbSelect(
    "social_account_snapshots",
    `snapshot_date=eq.${today}&social_account_id=in.(${allIds.join(",")})&select=social_account_id`,
  );
  const alreadyDone = new Set(existing.map(r => r.social_account_id as string));
  const pending     = activeAccounts.filter(a => !alreadyDone.has(a.id));

  if (!pending.length) {
    return new Response(JSON.stringify({ ok: true, date: today, accounts_checked: accounts.length, snapshots_written: 0, errors_count: errors.length, message: "All YouTube accounts already ingested today" }), { status: 200, headers: JSON_HEADERS });
  }

  /* ── 4. Batch fetch channel statistics ──────────────────────────────────── */
  const channelById = new Map(pending.map(a => [a.platform_user_id!, a]));
  const channelIds  = [...channelById.keys()];
  const snapshots: Record<string, unknown>[] = [];

  for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
    const batch = channelIds.slice(i, i + BATCH_SIZE);
    let channels: YTChannelStats[];

    try {
      channels = await fetchChannelsBatch(batch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Save what we have so far, then bail
      await dbInsertMany("social_account_snapshots", snapshots);
      return new Response(JSON.stringify({ ok: false, error: `Batch failed: ${msg}`, snapshots_written: snapshots.length, errors_count: errors.length }), { status: 502, headers: JSON_HEADERS });
    }

    for (const ch of channels) {
      const acct = channelById.get(ch.id);
      if (!acct) continue;

      const stats   = ch.statistics;
      const subHide = stats.hiddenSubscriberCount;

      snapshots.push({
        social_account_id: acct.id,
        snapshot_date:     today,
        platform:          "youtube",
        followers_count:   subHide ? null : parseInt(stats.subscriberCount, 10),
        following_count:   null,
        posts_count:       parseInt(stats.videoCount, 10),
        views_count:       parseInt(stats.viewCount, 10),
        tweet_count:       null,
        listed_count:      null,
        data_source:       "api",
        source_detail:     SOURCE_DETAIL,
        completeness_pct:  subHide ? 70 : 100, // subscribers hidden on some channels
        ingested_at:       ingestedAt,
        collected_at:      ingestedAt,
      });

      // Update last_verified_at
      await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
        last_verified_at: ingestedAt,
        status: "active",
        status_detail: null,
        updated_at: ingestedAt,
      });
    }

    // Handle channels not returned (deleted / not found)
    const returnedIds = new Set(channels.map(c => c.id));
    for (const id of batch) {
      if (!returnedIds.has(id)) {
        const acct = channelById.get(id);
        if (!acct) continue;
        errors.push({ username: acct.username, reason: "Channel ID not returned by YouTube API (may be deleted)" });
        await dbPatch("property_social_accounts", `id=eq.${acct.id}`, {
          status: "not_found", status_detail: "Channel not returned by YouTube API", updated_at: ingestedAt,
        });
      }
    }
  }

  await dbInsertMany("social_account_snapshots", snapshots);

  return new Response(JSON.stringify({
    ok: true, date: today, accounts_checked: accounts.length,
    snapshots_written: snapshots.length, errors_count: errors.length,
    errors: errors.length ? errors : undefined,
  }), { status: 200, headers: JSON_HEADERS });
});
