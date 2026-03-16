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

/* ── Reminder eligibility constants ───────────────────────────────────── */
const REMIND_AFTER_DAYS = 7;   /* min days since created_at before reminder is allowed */
const CLOSE_AFTER_DAYS  = 14;  /* min days since nudged_at before close is allowed    */

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

/* ── Reminder email template ───────────────────────────────────────────── */
function buildReminderEmail(opts: {
  brandName: string; brandCompany?: string | null; brandEmail: string;
  message: string; propertyName: string; acceptUrl: string; declineUrl: string;
}): string {
  const { brandName, brandCompany, brandEmail, message, propertyName, acceptUrl, declineUrl } = opts;
  const company = brandCompany
    ? `<p style="margin:0 0 8px"><strong>Company:</strong> ${esc(brandCompany)}</p>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;color:#aaa;margin:0 0 24px">SponsorAI — Introduction Request</p>
  <h2 style="font-size:20px;font-weight:600;margin:0 0 8px">Reminder — sponsorship enquiry via SponsorAI</h2>
  <p style="color:#555;margin:0 0 24px">This is a gentle reminder that a brand has requested an introduction to <strong>${esc(propertyName)}</strong> via SponsorAI. No action has been taken yet on this request.</p>
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
  <p style="font-size:12px;color:#aaa;margin:0">SponsorAI facilitates the introduction only. If you accept, both parties receive each other's contact details directly.</p>
</body></html>`;
}

/* ── Days elapsed helper ───────────────────────────────────────────────── */
function daysSince(isoStr: string): number {
  return (Date.now() - new Date(isoStr).getTime()) / (1000 * 60 * 60 * 24);
}

/* ── Handler ───────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS });
  }

  let body: { request_id: string; brand_email: string; action: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: JSON_HEADERS });
  }

  const { request_id, brand_email, action } = body;

  if (!request_id || !brand_email || !action) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: request_id, brand_email, action" }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  if (!["remind", "close"].includes(action)) {
    return new Response(
      JSON.stringify({ error: "action must be 'remind' or 'close'" }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  console.log("[intro-remind] received", { action, request_id, brand_email_domain: brand_email.split("@")[1] });

  try {
    /* 1. Load the introduction request */
    const requests = await dbSelect("introduction_requests", `id=eq.${encodeURIComponent(request_id)}&limit=1`);
    if (requests.length === 0) {
      return new Response(JSON.stringify({ error: "Request not found" }), { status: 404, headers: JSON_HEADERS });
    }
    const introReq = requests[0];

    /* 2. Authenticate: verify brand_email matches the from_profile */
    const brandProfiles = await dbSelect("profiles", `id=eq.${introReq.from_profile_id}&limit=1`);
    const brandProfile  = brandProfiles[0] ?? null;
    if (!brandProfile || (brandProfile.email as string).toLowerCase() !== brand_email.toLowerCase()) {
      console.warn("[intro-remind] auth failure — email mismatch", { request_id });
      return new Response(JSON.stringify({ error: "Not authorised" }), { status: 403, headers: JSON_HEADERS });
    }

    /* ── REMIND ──────────────────────────────────────────────────────── */
    if (action === "remind") {
      /* Eligibility checks */
      if (introReq.status !== "sent") {
        return new Response(
          JSON.stringify({ error: `Cannot send reminder: request status is '${introReq.status}'` }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
      if (introReq.nudged_at) {
        return new Response(
          JSON.stringify({ error: "A reminder has already been sent for this request" }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
      if (daysSince(introReq.created_at as string) < REMIND_AFTER_DAYS) {
        const waitDays = Math.ceil(REMIND_AFTER_DAYS - daysSince(introReq.created_at as string));
        return new Response(
          JSON.stringify({ error: `Reminder not yet available — please wait ${waitDays} more day(s)` }),
          { status: 409, headers: JSON_HEADERS }
        );
      }

      /* Load property profile */
      const propertyProfiles = introReq.to_profile_id
        ? await dbSelect("profiles", `id=eq.${introReq.to_profile_id}&limit=1`)
        : [];
      const propertyProfile = propertyProfiles[0] ?? null;

      if (!propertyProfile) {
        console.warn("[intro-remind] no property profile found — cannot send reminder email", { request_id });
        return new Response(
          JSON.stringify({ error: "Property profile not found — cannot send reminder" }),
          { status: 409, headers: JSON_HEADERS }
        );
      }

      /* Send reminder email */
      const acceptUrl  = `${FUNCTIONS_BASE}/introduction-respond?token=${introReq.response_token}&action=accept`;
      const declineUrl = `${FUNCTIONS_BASE}/introduction-respond?token=${introReq.response_token}&action=decline`;

      console.log("[intro-remind] sending reminder email", { to: propertyProfile.email, request_id });
      await sendEmail(
        propertyProfile.email as string,
        "Reminder — sponsorship enquiry via SponsorAI",
        buildReminderEmail({
          brandName:    brandProfile.contact_name as string,
          brandCompany: brandProfile.organisation_name as string | null,
          brandEmail:   brandProfile.email as string,
          message:      introReq.message as string,
          propertyName: (propertyProfile.organisation_name ?? introReq.to_property_slug) as string,
          acceptUrl,
          declineUrl,
        })
      );

      /* Update request + log event */
      const nudgedAt = new Date().toISOString();
      await dbUpdate("introduction_requests", `id=eq.${introReq.id}`, {
        status:    "nudged",
        nudged_at: nudgedAt,
      });
      await dbInsert("introduction_events", {
        introduction_request_id: introReq.id,
        event_type:              "reminder_sent",
        actor_type:              "brand",
        actor_profile_id:        brandProfile.id,
        meta: { sent_to: propertyProfile.email },
      });

      console.log("[intro-remind] reminder complete — status: nudged", { request_id });
      return new Response(
        JSON.stringify({ success: true, status: "nudged", nudged_at: nudgedAt }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    /* ── CLOSE ───────────────────────────────────────────────────────── */
    if (action === "close") {
      if (introReq.status !== "nudged") {
        return new Response(
          JSON.stringify({ error: `Cannot close: request status is '${introReq.status}' (must be 'nudged')` }),
          { status: 409, headers: JSON_HEADERS }
        );
      }
      if (introReq.nudged_at && daysSince(introReq.nudged_at as string) < CLOSE_AFTER_DAYS) {
        const waitDays = Math.ceil(CLOSE_AFTER_DAYS - daysSince(introReq.nudged_at as string));
        return new Response(
          JSON.stringify({ error: `Closure not yet available — please wait ${waitDays} more day(s) after the reminder` }),
          { status: 409, headers: JSON_HEADERS }
        );
      }

      const closedAt = new Date().toISOString();
      await dbUpdate("introduction_requests", `id=eq.${introReq.id}`, {
        status:    "closed_no_response",
        closed_at: closedAt,
      });
      await dbInsert("introduction_events", {
        introduction_request_id: introReq.id,
        event_type:              "closed_no_response",
        actor_type:              "brand",
        actor_profile_id:        brandProfile.id,
        meta: { note: "Closed by brand after no response to reminder" },
      });

      console.log("[intro-remind] request closed — status: closed_no_response", { request_id });
      return new Response(
        JSON.stringify({ success: true, status: "closed_no_response", closed_at: closedAt }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: JSON_HEADERS });

  } catch (err) {
    console.error("introduction-remind error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: JSON_HEADERS });
  }
});
