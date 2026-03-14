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

interface ImageEntry {
  url: string;
  alt: string;
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
/* Returns { url, alt } pairs — alt is used as fallback matching signal when
   CDNs serve images with opaque UUID filenames. */
function extractImageEntries(html: string, baseUrl: string): ImageEntry[] {
  const seen  = new Set<string>();
  const entries: ImageEntry[] = [];

  function resolve(raw: string): string | null {
    if (!raw || raw.startsWith("data:")) return null;
    try {
      return new URL(raw, baseUrl).href;
    } catch { return null; }
  }

  /* Decode common HTML entities in URL strings before parsing */
  function decodeEntities(s: string): string {
    return s.replace(/&amp;/gi, "&")
            .replace(/&lt;/gi,  "<")
            .replace(/&gt;/gi,  ">")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'");
  }

  function push(raw: string, alt = "") {
    const abs = resolve(decodeEntities(raw.trim()));
    if (abs && !seen.has(abs) && /\.(jpe?g|png|svg|webp|gif|avif)(\?|$)/i.test(abs)) {
      seen.add(abs);
      entries.push({ url: abs, alt: alt.trim() });
    }
  }

  /* <img src="…" alt="…"> and <img data-src="…" alt="…"> */
  for (const m of html.matchAll(/<img([^>]+?)>/gi)) {
    const attrs  = m[1];
    const srcM   = attrs.match(/(?:data-)?src=["']([^"']+)["']/i);
    const altM   = attrs.match(/alt=["']([^"']*)["']/i);
    if (srcM) push(srcM[1], altM?.[1] ?? "");
  }

  /* <source srcset="…"> — take first URL of each srcset */
  for (const m of html.matchAll(/<source([^>]+?)>/gi)) {
    const attrs  = m[1];
    const srcset = attrs.match(/srcset=["']([^"']+)["']/i);
    const altM   = attrs.match(/alt=["']([^"']*)["']/i);
    if (srcset) {
      const first = srcset[1].split(",")[0].trim().split(/\s+/)[0];
      if (first) push(first, altM?.[1] ?? "");
    }
  }

  /* og:image / twitter:image meta tags */
  for (const m of html.matchAll(/<meta[^>]+?(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+?content=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/<meta[^>]+?content=["']([^"']+)["'][^>]+?(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) push(m[1]);

  return entries;
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

/* Score image URL path against entity slug/name. */
function scorePathMatch(imagePath: string, entity: Entity): { score: number; reason: string } {
  const slug      = entity.slug.toLowerCase();
  const slugParts = slug.split("-").filter(Boolean);
  const nameParts = entity.name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(s => s.length > 2);

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

/* Score image alt text against entity slug/name.
   Used when CDNs serve UUID-named files with no readable path information.
   Alt text like "Bath Rugby logo" or "Harlequins crest" carries the entity name. */
function scoreAltMatch(alt: string, entity: Entity): { score: number; reason: string } {
  if (!alt) return { score: 0, reason: "" };

  const normAlt  = alt.toLowerCase().replace(/[^a-z0-9\s-]/g, "");
  const altWords = normAlt.split(/\s+/).filter(Boolean);
  const slug     = entity.slug.toLowerCase();

  /* Build a hyphen-joined version of the alt tokens for slug comparison */
  const altAsSlug = normAlt.replace(/\s+/g, "-");

  /* 1. Exact slug in alt (e.g. alt="bath-rugby") */
  if (altAsSlug === slug || altAsSlug.includes(slug)) {
    return { score: 0.95, reason: `slug match in alt text ("${alt}")` };
  }

  /* 2. All slug parts present as alt words (e.g. alt="Bath Rugby" → ["bath","rugby"] ✓) */
  const slugParts = slug.split("-").filter(p => p.length > 2);
  if (slugParts.length >= 1 && slugParts.every(p => altWords.includes(p))) {
    return { score: 0.85, reason: `all slug parts found in alt text ("${alt}")` };
  }

  /* 3. Entity name words in alt — majority match */
  const nameParts = entity.name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(s => s.length > 2);
  const nameHits = nameParts.filter(p => altWords.includes(p)).length;
  if (nameParts.length >= 2 && nameHits >= 2) {
    return { score: 0.80, reason: `name words in alt text ("${alt}")` };
  }
  if (nameParts.length >= 1 && nameHits >= Math.ceil(nameParts.length * 0.6)) {
    return { score: 0.65, reason: `partial name match in alt text ("${alt}")` };
  }

  return { score: 0, reason: "" };
}

function matchImagesToEntities(entries: ImageEntry[], entities: Entity[]): Candidate[] {
  const candidates: Candidate[] = [];
  const THRESHOLD = 0.55;

  for (const entity of entities) {
    let best: { url: string; score: number; reason: string } | null = null;

    for (const { url, alt } of entries) {
      const path      = normPath(url);
      const pathScore = scorePathMatch(path, entity);
      const altScore  = scoreAltMatch(alt, entity);

      /* Take whichever signal is stronger */
      const match = pathScore.score >= altScore.score ? pathScore : altScore;

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

  /* Extract image entries (url + alt) from the page */
  const imageEntries = extractImageEntries(html, source_url);

  if (imageEntries.length === 0) {
    return new Response(
      JSON.stringify({ candidates: [], images_found: 0, message: "No image URLs found on source page." }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  /* Load series entity roster */
  const entities = await getSeriesEntities(supabase, series_slug);

  /* Match — uses both URL path and alt text as signals */
  const candidates = matchImagesToEntities(imageEntries, entities);

  return new Response(
    JSON.stringify({
      candidates,
      images_found:     imageEntries.length,
      entities_checked: entities.length,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
});
