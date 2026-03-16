import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── CORS ──────────────────────────────────────────────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

/* ── Env ───────────────────────────────────────────────────────────────── */
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL        = Deno.env.get("INTRO_FROM_EMAIL") ?? "introductions@sponsorai.com";
const BASE              = `${SUPABASE_URL}/rest/v1`;
const FUNCTIONS_BASE    = `${SUPABASE_URL}/functions/v1`;

/* ── Supabase REST helpers ─────────────────────────────────────────────── */
async function dbSelect(table: string, params: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/${table}?${params}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`DB select ${table} failed: ${await res.text()}`);
  return res.json();
}

async function dbInsert(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB insert ${table} failed: ${await res.text()}`);
  const rows = await res.json() as Record<string, unknown>[];
  return rows[0];
}

async function dbUpdate(table: string, filter: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`DB update ${table} failed: ${await res.text()}`);
}

/* ── Email helper ──────────────────────────────────────────────────────── */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[email skip] RESEND_API_KEY not set — skipping send", { to, subject });
    return;
  }
  console.log("[email] attempting send", { to, subject, from: FROM_EMAIL });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: `SponsorAI <${FROM_EMAIL}>`, to: [to], subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[email] send failed", { status: res.status, to, subject, response: data });
    } else {
      console.log("[email] sent OK", { to, subject, resend_id: (data as Record<string, unknown>).id });
    }
  } catch (err) {
    console.error("[email] network error — send failed", { to, subject, error: (err as Error).message });
  }
}

/* ── HTML escape ───────────────────────────────────────────────────────── */
function esc(str?: string | null): string {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

/* ── Email template: new request ──────────────────────────────────────── */
function buildRequestEmail(opts: {
  brandName: string; brandCompany?: string | null; brandEmail: string;
  message: string; propertyName: string; acceptUrl: string; declineUrl: string;
}): string {
  const { brandName, brandCompany, brandEmail, message, propertyName, acceptUrl, declineUrl } = opts;
  const company = brandCompany ? `<p style="margin:0 0 8px"><strong>Company:</strong> ${esc(brandCompany)}</p>` : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;color:#aaa;margin:0 0 24px">SponsorAI — Introduction Request</p>
  <h2 style="font-size:20px;font-weight:600;margin:0 0 8px">New sponsorship enquiry</h2>
  <p style="color:#555;margin:0 0 24px">A brand has requested an introduction to <strong>${esc(propertyName)}</strong> via SponsorAI.</p>
  <div style="background:#f8f8f8;border-radius:8px;padding:20px 24px;margin-bottom:28px">
    <p style="margin:0 0 8px"><strong>Name:</strong> ${esc(brandName)}</p>
    ${company}
    <p style="margin:0 0 8px"><strong>Email:</strong> ${esc(brandEmail)}</p>
    <p style="margin:0"><strong>Message:</strong><br><span style="white-space:pre-line;color:#444">${esc(message)}</span></p>
  </div>
  <p style="margin:0 0 20px;color:#333">Would you like to connect with this brand?</p>
  <table><tr>
    <td><a href="${acceptUrl}" style="display:inline-block;padding:10px 22px;background:#e85d75;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;font-size:14px">Accept introduction</a></td>
    <td style="padding-left:12px"><a href="${declineUrl}" style="display:inline-block;padding:10px 22px;background:#ebebeb;color:#444;text-decoration:none;border-radius:6px;font-weight:500;font-size:14px">Decline</a></td>
  </tr></table>
  <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
  <p style="font-size:12px;color:#aaa;margin:0">SponsorAI facilitates the introduction only. If you accept, both parties receive each other's contact details directly. SponsorAI does not participate in the conversation.</p>
</body></html>`;
}

/* ── Handler ───────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });
  }

  let body: {
    property_slug: string; property_name?: string;
    contact_name: string; organisation_name?: string;
    email: string; message: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: JSON_HEADERS });
  }

  const { property_slug, property_name, contact_name, organisation_name, email, message } = body;
  if (!property_slug || !contact_name || !email || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields: property_slug, contact_name, email, message" }), { status: 400, headers: JSON_HEADERS });
  }

  console.log("[intro-request] received", {
    property_slug,
    property_name: property_name ?? null,
    contact_name,
    email,
    has_company: !!organisation_name,
    message_length: message.length,
  });

  try {
    /* 1. Upsert brand profile */
    const existing = await dbSelect("profiles", `email=eq.${encodeURIComponent(email)}&profile_type=eq.brand&limit=1`);
    let brandProfile: Record<string, unknown>;
    if (existing.length > 0) {
      await dbUpdate("profiles", `id=eq.${existing[0].id}`, {
        contact_name, organisation_name: organisation_name || null, status: "complete",
      });
      brandProfile = { ...existing[0], contact_name, organisation_name, status: "complete" };
      console.log("[intro-request] brand profile updated", { id: brandProfile.id });
    } else {
      brandProfile = await dbInsert("profiles", {
        profile_type: "brand", contact_name,
        organisation_name: organisation_name || null, email, status: "complete",
      });
      console.log("[intro-request] brand profile created", { id: brandProfile.id });
    }

    /* 2. Look up claimed property profile */
    const propertyProfiles = await dbSelect("profiles",
      `entity_slug=eq.${encodeURIComponent(property_slug)}&profile_type=eq.property&status=in.(complete,verified)&limit=1`);
    const propertyProfile = propertyProfiles[0] ?? null;
    console.log("[intro-request] property profile lookup", {
      property_slug,
      found: !!propertyProfile,
      property_profile_id: propertyProfile?.id ?? null,
    });

    /* 3. Deduplication check — block if an active request already exists */
    const ACTIVE_STATUSES = "submitted,pending_property_claim,sent,nudged";
    const existingActive = await dbSelect(
      "introduction_requests",
      `from_profile_id=eq.${brandProfile.id}&to_property_slug=eq.${encodeURIComponent(property_slug)}&status=in.(${ACTIVE_STATUSES})&limit=1`
    );
    if (existingActive.length > 0) {
      const active = existingActive[0];
      console.log("[intro-request] duplicate blocked — active request exists", {
        existing_id: active.id,
        existing_status: active.status,
        from_profile_id: brandProfile.id,
        to_property_slug: property_slug,
      });
      return new Response(
        JSON.stringify({
          error: "duplicate_active_request",
          message: "You already have an active introduction request for this property.",
          existing_request_id: active.id,
          existing_status: active.status,
        }),
        { status: 409, headers: JSON_HEADERS }
      );
    }

    /* 4. Create introduction_request */
    const reqStatus = propertyProfile ? "submitted" : "pending_property_claim";
    const introReq = await dbInsert("introduction_requests", {
      from_profile_id: brandProfile.id,
      to_profile_id: propertyProfile ? propertyProfile.id : null,
      to_property_slug: property_slug,
      direction: "brand_to_property",
      message,
      status: reqStatus,
    });
    console.log("[intro-request] request created", { id: introReq.id, status: reqStatus });

    /* 5. Log request_submitted */
    await dbInsert("introduction_events", {
      introduction_request_id: introReq.id,
      event_type: "request_submitted",
      actor_type: "brand",
      actor_profile_id: brandProfile.id,
      meta: { property_slug, property_name: property_name ?? property_slug, brand_email: email },
    });

    /* 6a. Property not yet claimed */
    if (!propertyProfile) {
      await dbInsert("introduction_events", {
        introduction_request_id: introReq.id,
        event_type: "property_claim_invited",
        actor_type: "system",
        meta: { property_slug, note: "No claimed property profile found" },
      });
      console.log("[intro-request] returning pending_property_claim — no property profile");
      return new Response(JSON.stringify({ success: true, status: "pending_property_claim" }), { status: 200, headers: JSON_HEADERS });
    }

    /* 6b. Property claimed: send request email */
    const acceptUrl  = `${FUNCTIONS_BASE}/introduction-respond?token=${introReq.response_token}&action=accept`;
    const declineUrl = `${FUNCTIONS_BASE}/introduction-respond?token=${introReq.response_token}&action=decline`;

    console.log("[intro-request] sending request email to property", { to: propertyProfile.email });
    await sendEmail(
      propertyProfile.email as string,
      "New sponsorship enquiry via SponsorAI",
      buildRequestEmail({
        brandName: contact_name, brandCompany: organisation_name ?? null,
        brandEmail: email, message,
        propertyName: property_name ?? property_slug,
        acceptUrl, declineUrl,
      })
    );

    /* 7. Update status + log */
    await dbUpdate("introduction_requests", `id=eq.${introReq.id}`, { status: "sent" });
    await dbInsert("introduction_events", {
      introduction_request_id: introReq.id,
      event_type: "recipient_notified",
      actor_type: "system",
      meta: { sent_to: propertyProfile.email },
    });
    console.log("[intro-request] complete — status: sent", { request_id: introReq.id });

    return new Response(JSON.stringify({ success: true, status: "sent" }), { status: 200, headers: JSON_HEADERS });

  } catch (err) {
    console.error("introduction-request error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: JSON_HEADERS });
  }
});
