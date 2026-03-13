import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/* ── CORS ─────────────────────────────────────────────────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Entity {
  id:            string;
  slug:          string;
  name:          string;
  property_type: string;
}

interface Candidate {
  property_id:   string;
  slug:          string;
  name:          string;
  property_type: string;
  image_url:     string;
  confidence:    number;
  match_reason:  string;
}

/* ── Image extraction ─────────────────────────────────────────────────────── */
function extractImageUrls(html: string, baseUrl: string): string[] {
  const seen  = new Set<string>();
  const urls: string[] = [];

  function resolve(raw: string): string | null {
    if (!raw || raw.startsWith("data:")) return null;
    try {
      return new URL(raw, baseUrl).href;
    } catch { return null; }
  }

  function push(raw: string) {
    const abs = resolve(raw.trim());
    if (abs && !seen.has(abs) && /\.(jpe?g|png|svg|webp|gif|avif)(\?|$)/i.test(abs)) {
      seen.add(abs);
      urls.push(abs);
    }
  }

  /* <img src="…"> and <img data-src="…"> */
  for (const m of html.matchAll(/<img[^>]+?(?:data-)?src=["']([^"']+)["']/gi)) push(m[1]);

  /* <source srcset="…"> — take first URL of each srcset */
  for (const m of html.matchAll(/<source[^>]+?srcset=["']([^"']+)["']/gi)) {
    const first = m[1].split(",")[0].trim().split(/\s+/)[0];
    if (first) push(first);
  }

  /* og:image / twitter:image meta tags */
  for (const m of html.matchAll(/<meta[^>]+?(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+?content=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/<meta[^>]+?content=["']([^"']+)["'][^>]+?(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) push(m[1]);

  return urls;
}

/* ── Matching ─────────────────────────────────────────────────────────────── */
function normPath(url: string): string {
  try {
    return new URL(url).pathname
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")   // strip extension
      .replace(/_/g, "-")             // underscores → hyphens
      .replace(/[^a-z0-9-/]/g, "");  // strip non-alnum/hyphen/slash
  } catch { return ""; }
}

function scoreMatch(imagePath: string, entity: Entity): { score: number; reason: string } {
  const slug      = entity.slug.toLowerCase();
  const slugParts = slug.split("-").filter(Boolean);
  const nameParts = entity.name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(s => s.length > 2);     // skip very short words

  /* 1. Exact slug in path segment */
  const segments = imagePath.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === slug)           return { score: 1.0,  reason: `exact slug match in path ("${seg}")` };
    if (seg.includes(slug))     return { score: 0.90, reason: `slug substring match in path segment ("${seg}")` };
  }

  /* 2. Whole-path slug match */
  if (imagePath.includes(slug)) return { score: 0.85, reason: `slug found in path` };

  /* 3. All slug parts present in path */
  if (slugParts.length >= 2 && slugParts.every(p => p.length > 2 && imagePath.includes(p))) {
    return { score: 0.70, reason: `all slug words found in path (${slugParts.join(", ")})` };
  }

  /* 4. Entity name words in path (skip single-word slug entities to avoid noise) */
  if (nameParts.length >= 2 && nameParts.filter(p => imagePath.includes(p)).length >= 2) {
    return { score: 0.60, reason: `name words found in path (${nameParts.slice(0, 3).join(", ")})` };
  }

  return { score: 0, reason: "" };
}

function matchImagesToEntities(imageUrls: string[], entities: Entity[]): Candidate[] {
  const candidates: Candidate[] = [];
  const THRESHOLD = 0.55;

  for (const entity of entities) {
    let best: { url: string; score: number; reason: string } | null = null;

    for (const url of imageUrls) {
      const path  = normPath(url);
      const match = scoreMatch(path, entity);
      if (match.score >= THRESHOLD && (!best || match.score > best.score)) {
        best = { url, score: match.score, reason: match.reason };
      }
    }

    if (best) {
      candidates.push({
        property_id:   entity.id,
        slug:          entity.slug,
        name:          entity.name,
        property_type: entity.property_type,
        image_url:     best.url,
        confidence:    Math.round(best.score * 100) / 100,
        match_reason:  best.reason,
      });
    }
  }

  /* Sort by confidence descending */
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

/* ── Supabase entity query ────────────────────────────────────────────────── */
async function getSeriesEntities(supabase: ReturnType<typeof createClient>, seriesSlug: string): Promise<Entity[]> {
  /* Get the series property id */
  const { data: seriesRows, error: sErr } = await supabase
    .from("properties")
    .select("id, slug, name, property_type")
    .eq("slug", seriesSlug)
    .limit(1);

  if (sErr || !seriesRows?.length) return [];
  const series = seriesRows[0];

  /* Get IDs of all properties related to this series (forward + reverse) */
  const [fwd, rev] = await Promise.all([
    supabase.from("property_relationships").select("to_id").eq("from_id", series.id),
    supabase.from("property_relationships").select("from_id").eq("to_id", series.id),
  ]);

  const relatedIds = new Set<string>();
  (fwd.data ?? []).forEach(r => relatedIds.add(r.to_id));
  (rev.data ?? []).forEach(r => relatedIds.add(r.from_id));

  if (relatedIds.size === 0) {
    /* No relationships yet — return just the series itself */
    return [series];
  }

  const idList = [...relatedIds];
  const { data: entities, error: eErr } = await supabase
    .from("properties")
    .select("id, slug, name, property_type")
    .in("id", idList);

  if (eErr || !entities) return [series];

  /* Include the series itself in the matchable set */
  return [series, ...entities];
}

/* ── Handler ──────────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });
  }

  let source_url: string | undefined;
  let series_slug: string | undefined;

  try {
    ({ source_url, series_slug } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: JSON_HEADERS });
  }

  if (!source_url || !series_slug) {
    return new Response(JSON.stringify({ error: "source_url and series_slug are required" }), { status: 400, headers: JSON_HEADERS });
  }

  /* Create Supabase admin client */
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  /* Fetch the source page */
  let html: string;
  try {
    const pageResp = await fetch(source_url, {
      headers: {
        "User-Agent": "SponsorAI-ImageScanner/1.0 (internal operator tool)",
        "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!pageResp.ok) {
      return new Response(
        JSON.stringify({ error: `Source URL returned HTTP ${pageResp.status}`, candidates: [] }),
        { status: 200, headers: JSON_HEADERS }
      );
    }
    html = await pageResp.text();
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    return new Response(
      JSON.stringify({ error: `Failed to fetch source URL: ${msg}`, candidates: [] }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  /* Extract image URLs from the page */
  const imageUrls = extractImageUrls(html, source_url);

  if (imageUrls.length === 0) {
    return new Response(
      JSON.stringify({ candidates: [], images_found: 0, message: "No image URLs found on source page." }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  /* Load series entity roster */
  const entities = await getSeriesEntities(supabase, series_slug);

  /* Match */
  const candidates = matchImagesToEntities(imageUrls, entities);

  return new Response(
    JSON.stringify({
      candidates,
      images_found:    imageUrls.length,
      entities_checked: entities.length,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
});
