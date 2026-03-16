import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* ── Env ───────────────────────────────────────────────────────────────── */
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL       = Deno.env.get("INTRO_FROM_EMAIL") ?? "introductions@sponsorai.com";
const BASE             = `${SUPABASE_URL}/rest/v1`;

const HTML_HEADERS = { "Content-Type": "text/html;charset=UTF-8" };

/* ── Supabase REST helpers ─────────────────────────────────────────────── */
async function dbSelect(table: string, params: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/${table}?${params}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`DB select ${table} failed: ${await res.text()}`);
  return res.json();
}

async function dbInsert(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=representation",
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
      apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
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
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
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

/* ── Confirmation page ─────────────────────────────────────────────────── */
function htmlPage(title: string, body: string, isError = false): Response {
  const color = isError ? "#c0392b" : "#2d6a4f";
  return new Response(
    `<!DOCTYPE html><html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)} — SponsorAI</title>
  <style>
    body{font-family:system-ui,sans-serif;color:#1a1a1a;max-width:480px;margin:64px auto;padding:0 24px}
    .brand{font-size:13px;color:#aaa;margin:0 0 28px;letter-spacing:.02em}h1{font-size:22px;font-weight:600;margin:0 0 16px;color:${color}}
    p{color:#555;line-height:1.65;margin:0 0 12px}hr{border:none;border-top:1px solid #eee;margin:24px 0}
    .note{font-size:12px;color:#aaa}
  </style>
</head><body>
  <p class="brand">SponsorAI</p>
  <h1>${esc(title)}</h1>
  ${body}
  <hr><p class="note">SponsorAI facilitates introductions between brands and properties. It does not participate in conversations or negotiations.</p>
</body></html>`,
    { headers: HTML_HEADERS }
  );
}

/* ── Email templates ───────────────────────────────────────────────────── */
function buildAcceptEmailToBrand(opts: {
  brandName: string; propertyName: string; propertyContactName: string;
  propertyEmail: string; propertyWebsite?: string | null; propertyLinkedin?: string | null;
}): string {
  const { brandName, propertyName, propertyContactName, propertyEmail, propertyWebsite, propertyLinkedin } = opts;
  const website  = propertyWebsite  ? `<p style="margin:0 0 8px"><strong>Website:</strong> <a href="${esc(propertyWebsite)}">${esc(propertyWebsite)}</a></p>` : "";
  const linkedin = propertyLinkedin ? `<p style="margin:0"><strong>LinkedIn:</strong> <a href="${esc(propertyLinkedin)}">${esc(propertyLinkedin)}</a></p>` : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;color:#aaa;margin:0 0 24px">SponsorAI</p>
  <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;color:#2d6a4f">Introduction accepted</h2>
  <p style="color:#555;margin:0 0 24px">Hi ${esc(brandName)}, <strong>${esc(propertyName)}</strong> has accepted your introduction request. Here are their contact details:</p>
  <div style="background:#f0faf5;border-radius:8px;padding:20px 24px;margin-bottom:28px">
    <p style="margin:0 0 8px"><strong>Name:</strong> ${esc(propertyContactName)}</p>
    <p style="margin:0 0 8px"><strong>Email:</strong> <a href="mailto:${esc(propertyEmail)}">${esc(propertyEmail)}</a></p>
    ${website}${linkedin}
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#aaa">SponsorAI has facilitated this introduction and is now stepping back. Good luck!</p>
</body></html>`;
}

function buildAcceptEmailToProperty(opts: {
  propertyName: string; brandName: string; brandCompany?: string | null;
  brandEmail: string; brandWebsite?: string | null; brandLinkedin?: string | null;
}): string {
  const { propertyName, brandName, brandCompany, brandEmail, brandWebsite, brandLinkedin } = opts;
  const company  = brandCompany  ? `<p style="margin:0 0 8px"><strong>Company:</strong> ${esc(brandCompany)}</p>` : "";
  const website  = brandWebsite  ? `<p style="margin:0 0 8px"><strong>Website:</strong> <a href="${esc(brandWebsite)}">${esc(brandWebsite)}</a></p>` : "";
  const linkedin = brandLinkedin ? `<p style="margin:0"><strong>LinkedIn:</strong> <a href="${esc(brandLinkedin)}">${esc(brandLinkedin)}</a></p>` : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;color:#aaa;margin:0 0 24px">SponsorAI</p>
  <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;color:#2d6a4f">You accepted an introduction</h2>
  <p style="color:#555;margin:0 0 24px">Hi ${esc(propertyName)}, here are the contact details for the brand you connected with:</p>
  <div style="background:#f0faf5;border-radius:8px;padding:20px 24px;margin-bottom:28px">
    <p style="margin:0 0 8px"><strong>Name:</strong> ${esc(brandName)}</p>
    ${company}
    <p style="margin:0 0 8px"><strong>Email:</strong> <a href="mailto:${esc(brandEmail)}">${esc(brandEmail)}</a></p>
    ${website}${linkedin}
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#aaa">SponsorAI has facilitated this introduction and is now stepping back. Good luck!</p>
</body></html>`;
}

function buildDeclineEmail(opts: { brandName: string; propertySlug: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:13px;color:#aaa;margin:0 0 24px">SponsorAI</p>
  <h2 style="font-size:20px;font-weight:600;margin:0 0 8px">Introduction update</h2>
  <p style="color:#555;margin:0 0 24px">Hi ${esc(opts.brandName)},</p>
  <p style="color:#555;margin:0 0 24px">The property has declined to connect at this time.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#aaa">You can explore other opportunities on SponsorAI.</p>
</body></html>`;
}

/* ── Handler ───────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "GET") return htmlPage("Error", "<p>Method not allowed.</p>", true);

  const url    = new URL(req.url);
  const token  = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  if (!token || !action || !["accept", "decline"].includes(action)) {
    return htmlPage("Invalid link", "<p>This link is not valid. Please check your email and try again.</p>", true);
  }

  console.log("[intro-respond] received", {
    action,
    token_prefix: token.slice(0, 8) + "...",
  });

  try {
    /* Find request by token */
    const requests = await dbSelect("introduction_requests", `response_token=eq.${encodeURIComponent(token)}&limit=1`);
    if (requests.length === 0) {
      console.warn("[intro-respond] token not found", { token_prefix: token.slice(0, 8) });
      return htmlPage("Link not found", "<p>This introduction link could not be found. It may have already been processed.</p>", true);
    }

    const introReq = requests[0];
    console.log("[intro-respond] request found", {
      request_id: introReq.id,
      current_status: introReq.status,
      to_property_slug: introReq.to_property_slug,
    });

    /* Already responded or closed? */
    if (["accepted", "declined", "intro_completed", "closed_no_response"].includes(introReq.status as string)) {
      let msg: string;
      if (introReq.status === "declined") {
        msg = "You previously declined this introduction request.";
      } else if (introReq.status === "closed_no_response") {
        msg = "This introduction request has been closed by the brand after receiving no response.";
      } else {
        msg = "This introduction has already been completed.";
      }
      console.log("[intro-respond] already processed — returning early", { status: introReq.status });
      return htmlPage("Already processed", `<p>${msg}</p>`);
    }

    /* Accept nudged (reminder sent) as well as sent — property can still respond */
    if (introReq.status !== "sent" && introReq.status !== "nudged") {
      console.warn("[intro-respond] request not in actionable state", { status: introReq.status });
      return htmlPage("Not ready", "<p>This introduction request is not yet ready for a response. It may still be pending property profile activation.</p>");
    }

    /* Load profiles */
    const brandProfiles = await dbSelect("profiles", `id=eq.${introReq.from_profile_id}&limit=1`);
    const brandProfile  = brandProfiles[0] ?? null;

    const propertyProfiles = introReq.to_profile_id
      ? await dbSelect("profiles", `id=eq.${introReq.to_profile_id}&limit=1`)
      : [];
    const propertyProfile = propertyProfiles[0] ?? null;

    console.log("[intro-respond] profiles loaded", {
      brand_found: !!brandProfile,
      property_found: !!propertyProfile,
    });

    /* ── DECLINE ──────────────────────────────────────────────────────── */
    if (action === "decline") {
      console.log("[intro-respond] processing decline", { request_id: introReq.id });
      await dbUpdate("introduction_requests", `id=eq.${introReq.id}`, { status: "declined" });
      await dbInsert("introduction_events", {
        introduction_request_id: introReq.id,
        event_type: "request_declined",
        actor_type: "property",
        actor_profile_id: introReq.to_profile_id ?? null,
        meta: { property_slug: introReq.to_property_slug },
      });

      if (brandProfile) {
        await sendEmail(
          brandProfile.email as string,
          "Update on your SponsorAI introduction request",
          buildDeclineEmail({ brandName: brandProfile.contact_name as string, propertySlug: introReq.to_property_slug as string })
        );
      }

      console.log("[intro-respond] decline complete", { request_id: introReq.id });
      return htmlPage("Introduction declined", `
        <p>You have declined this introduction request.</p>
        <p>The brand has been notified.</p>
      `);
    }

    /* ── ACCEPT ───────────────────────────────────────────────────────── */
    if (action === "accept") {
      console.log("[intro-respond] processing accept", { request_id: introReq.id });
      await dbUpdate("introduction_requests", `id=eq.${introReq.id}`, { status: "accepted" });
      await dbInsert("introduction_events", {
        introduction_request_id: introReq.id,
        event_type: "request_accepted",
        actor_type: "property",
        actor_profile_id: introReq.to_profile_id ?? null,
        meta: { property_slug: introReq.to_property_slug },
      });

      if (brandProfile && propertyProfile) {
        console.log("[intro-respond] sending contact-exchange emails", {
          brand_email: brandProfile.email,
          property_email: propertyProfile.email,
        });
        await Promise.all([
          sendEmail(
            brandProfile.email as string,
            "Your SponsorAI introduction has been accepted",
            buildAcceptEmailToBrand({
              brandName: brandProfile.contact_name as string,
              propertyName: (propertyProfile.organisation_name ?? introReq.to_property_slug) as string,
              propertyContactName: propertyProfile.contact_name as string,
              propertyEmail: propertyProfile.email as string,
              propertyWebsite: propertyProfile.website as string | null,
              propertyLinkedin: propertyProfile.linkedin as string | null,
            })
          ),
          sendEmail(
            propertyProfile.email as string,
            "Introduction accepted — here are the brand's details",
            buildAcceptEmailToProperty({
              propertyName: (propertyProfile.organisation_name ?? introReq.to_property_slug) as string,
              brandName: brandProfile.contact_name as string,
              brandCompany: brandProfile.organisation_name as string | null,
              brandEmail: brandProfile.email as string,
              brandWebsite: brandProfile.website as string | null,
              brandLinkedin: brandProfile.linkedin as string | null,
            })
          ),
        ]);
      } else {
        console.warn("[intro-respond] skipping contact-exchange emails — one or both profiles missing", {
          brand_found: !!brandProfile,
          property_found: !!propertyProfile,
        });
      }

      await dbUpdate("introduction_requests", `id=eq.${introReq.id}`, { status: "intro_completed" });
      await dbInsert("introduction_events", {
        introduction_request_id: introReq.id,
        event_type: "intro_emails_sent",
        actor_type: "system",
        meta: { brand_email: brandProfile?.email ?? null, property_email: propertyProfile?.email ?? null },
      });

      console.log("[intro-respond] accept complete — intro_completed", { request_id: introReq.id });
      return htmlPage("Introduction accepted", `
        <p>You have accepted this introduction request.</p>
        <p>Both parties have been sent each other's contact details directly.</p>
        <p>SponsorAI has exited the conversation. Good luck!</p>
      `);
    }

    return htmlPage("Error", "<p>Unknown action.</p>", true);

  } catch (err) {
    console.error("introduction-respond error:", err);
    return htmlPage("Error", "<p>Something went wrong. Please try again later.</p>", true);
  }
});
