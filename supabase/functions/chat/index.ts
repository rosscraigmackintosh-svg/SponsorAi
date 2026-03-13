import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── CORS ──────────────────────────────────────────────────────────────────
   Required for browser fetch calls from explore.html.
   All responses — including errors — must include these headers.
   ──────────────────────────────────────────────────────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

/* ── Error helper ──────────────────────────────────────────────────────────
   Always returns HTTP 200 with an Anthropic-shaped error body.
   sendChat() in ai.js detects errors via data.error, not HTTP status.
   ──────────────────────────────────────────────────────────────────────── */
function proxyError(type: string, message: string): Response {
  return new Response(
    JSON.stringify({ error: { type, message } }),
    { status: 200, headers: JSON_HEADERS },
  );
}

/* ── Handler ───────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {

  /* CORS preflight */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return proxyError("invalid_request_error", "Method not allowed");
  }

  /* Anthropic key from Supabase project secret — never in any file */
  const key = Deno.env.get("ANTHROPIC_KEY");
  if (!key) {
    return proxyError("server_error", "ANTHROPIC_KEY secret not configured");
  }

  /* Parse request body */
  let body: { system?: string; messages?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return proxyError("invalid_request_error", "Request body must be valid JSON");
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return proxyError("invalid_request_error", "messages must be a non-empty array");
  }

  /* Build Anthropic request.
     model and max_tokens are fixed server-side to match current sendChat() values.
     system is optional — passed through if present, omitted if absent. */
  const payload: Record<string, unknown> = {
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages:   body.messages,
  };
  if (body.system) payload.system = body.system;

  /* Forward to Anthropic */
  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return proxyError(
      "server_error",
      "Failed to reach Anthropic API: " + (e as Error).message,
    );
  }

  /* Return Anthropic response body verbatim.
     HTTP status is always 200 regardless of what Anthropic returned —
     sendChat() reads data.error to detect API errors, not the HTTP status.
     This preserves the existing retry logic for overloaded_error and 5xx. */
  const data = await upstream.json();
  return new Response(JSON.stringify(data), { status: 200, headers: JSON_HEADERS });
});
