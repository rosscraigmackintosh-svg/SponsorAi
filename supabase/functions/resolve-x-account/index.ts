import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── resolve-x-account ───────────────────────────────────────────────────────
   Operator tool. Given a property_id + either username or user_id, looks up
   the X API v2 user record, then upserts a row in property_social_accounts.

   Called once per property when an X account is first linked, or to refresh
   the mapping if a handle changes. Not called by the daily scheduler.

   Required secrets  (set via: supabase secrets set KEY=value):
     X_BEARER_TOKEN          — X API v2 app-only Bearer Token
     SUPABASE_SERVICE_ROLE_KEY — provided automatically by Supabase runtime

   Request body (JSON):
     { property_id: string, username?: string, user_id?: string }
     Either username or user_id must be present; username is preferred
     because it validates the handle you intend to link.

   Response:
     200  { ok: true,  account: property_social_accounts row }
     400  { error: string }   — bad input
     404  { error: string }   — property or X user not found
     502  { error: string }   — X API failure
─────────────────────────────────────────────────────────────────────────── */

/* ── CORS ────────────────────────────────────────────────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

/* ── Env ─────────────────────────────────────────────────────────────────── */
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const X_BEARER_TOKEN   = Deno.env.get("X_BEARER_TOKEN");

const BASE = `${SUPABASE_URL}/rest/v1`;

/* Fields requested from X API v2 for account resolution.
   We fetch public_metrics here so we can write an initial snapshot
   at resolve time, reducing the gap until the first scheduled ingest. */
const X_USER_FIELDS =
  "public_metrics,verified,verified_type,protected,profile_image_url,description";

/* ── Types ───────────────────────────────────────────────────────────────── */
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

/* ── Supabase REST helpers ────────────────────────────────────────────────── */
async function dbSelect(table: string, params: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/${table}?${params}`, {
    headers: {
      apikey:        SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`DB select ${table} failed: ${await res.text()}`);
  return res.json();
}

async function dbUpsert(
  table:      string,
  data:       Record<string, unknown>,
  onConflict: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      apikey:          SERVICE_ROLE_KEY,
      Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type":  "application/json",
      Prefer:          "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB upsert ${table} failed: ${await res.text()}`);
  const rows = await res.json() as Record<string, unknown>[];
  return rows[0];
}

async function dbInsert(
  table: string,
  data:  Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: {
      apikey:          SERVICE_ROLE_KEY,
      Authorization:   `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type":  "application/json",
      Prefer:          "resolution=ignore-duplicates",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB insert ${table} failed: ${await res.text()}`);
}

/* ── X API helper ────────────────────────────────────────────────────────── */
async function fetchXUser(
  lookup: { by: "username"; value: string } | { by: "id"; value: string },
): Promise<XUser | null> {
  if (!X_BEARER_TOKEN) throw new Error("X_BEARER_TOKEN secret not set");

  const url =
    lookup.by === "username"
      ? `https://api.twitter.com/2/users/by/username/${encodeURIComponent(lookup.value)}?user.fields=${X_USER_FIELDS}`
      : `https://api.twitter.com/2/users/${encodeURIComponent(lookup.value)}?user.fields=${X_USER_FIELDS}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
    signal:  AbortSignal.timeout(10_000),
  });

  if (res.status === 429) throw new Error("X API rate limit reached");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`X API error ${res.status}: ${await res.text()}`);

  const json = await res.json() as { data?: XUser; errors?: { detail: string }[] };

  /* X returns 200 with an errors array when the user does not exist */
  if (json.errors?.length && !json.data) return null;

  return json.data ?? null;
}

/* ── Handler ─────────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS },
    );
  }

  /* ── Parse body ──────────────────────────────────────────────────────── */
  let property_id: string | undefined;
  let username:    string | undefined;
  let user_id:     string | undefined;

  try {
    ({ property_id, username, user_id } = await req.json());
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (!property_id) {
    return new Response(
      JSON.stringify({ error: "property_id is required" }),
      { status: 400, headers: JSON_HEADERS },
    );
  }
  if (!username && !user_id) {
    return new Response(
      JSON.stringify({ error: "username or user_id is required" }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  /* ── Verify property exists ──────────────────────────────────────────── */
  const props = await dbSelect("properties", `id=eq.${property_id}&select=id,name`);
  if (!props.length) {
    return new Response(
      JSON.stringify({ error: "Property not found", property_id }),
      { status: 404, headers: JSON_HEADERS },
    );
  }

  /* ── Fetch from X API ────────────────────────────────────────────────── */
  let xUser: XUser | null;
  try {
    xUser = username
      ? await fetchXUser({ by: "username", value: username })
      : await fetchXUser({ by: "id",       value: user_id! });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `X API lookup failed: ${msg}` }),
      { status: 502, headers: JSON_HEADERS },
    );
  }

  if (!xUser) {
    return new Response(
      JSON.stringify({
        error:    "X user not found",
        username: username ?? null,
        user_id:  user_id  ?? null,
      }),
      { status: 404, headers: JSON_HEADERS },
    );
  }

  /* ── Upsert property_social_accounts ────────────────────────────────── */
  const now = new Date().toISOString();

  const account = await dbUpsert(
    "property_social_accounts",
    {
      property_id,
      platform:          "x",
      platform_user_id:  xUser.id,
      username:          xUser.username,
      display_name:      xUser.name,
      resolved_at:       now,
      status:            "active",
      status_detail:     null,
      updated_at:        now,
    },
    "property_id,platform",
  );

  /* ── Write an initial snapshot for today ─────────────────────────────
     This means the account has at least one data point immediately after
     being linked, without waiting for the next scheduled ingest run.   */
  const today = now.slice(0, 10);
  try {
    await dbInsert("social_account_snapshots", {
      social_account_id: account.id,
      snapshot_date:     today,
      platform:          "x",
      followers_count:   xUser.public_metrics.followers_count,
      following_count:   xUser.public_metrics.following_count,
      tweet_count:       xUser.public_metrics.tweet_count,
      posts_count:       xUser.public_metrics.tweet_count,
      listed_count:      xUser.public_metrics.listed_count,
      verified:          xUser.verified,
      verified_type:     xUser.verified_type ?? null,
      protected:         xUser.protected,
      profile_image_url: xUser.profile_image_url ?? null,
      description:       xUser.description ?? null,
      data_source:       "api",
      source_detail:     "x-api-v2-users-by-username",
      completeness_pct:  90,
      ingested_at:       now,
      collected_at:      now,
    });
  } catch {
    /* Snapshot conflict (already exists for today) is fine — ignore. */
  }

  return new Response(
    JSON.stringify({ ok: true, account }),
    { status: 200, headers: JSON_HEADERS },
  );
});
