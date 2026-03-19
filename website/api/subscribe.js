/* =============================================
   SPONSORAI — Resend Subscribe Handler
   Vercel Serverless Function: /api/subscribe

   On POST { email, source }:
     1. Adds contact to Resend "General" audience
     2. Sends the welcome email via Resend template

   Required Vercel Environment Variable:
     RESEND_API_KEY
   ============================================= */

const https = require('https');

const AUDIENCE_ID   = '5c12f4b6-0404-4d16-a55c-89fb6514d988';
const TEMPLATE_ID   = '24ba5931-a170-4895-a56d-69679b0079a7';
const FROM_ADDRESS  = 'SponsorAI <hello@sponsorai.com>';

/* ── Helper: HTTPS POST to Resend ─────────────────────────────────────── */
function resendPost(endpoint, apiKey, payload) {
  return new Promise(function (resolve, reject) {
    var body = JSON.stringify(payload);
    var options = {
      hostname: 'api.resend.com',
      path:     endpoint,
      method:   'POST',
      headers: {
        'Authorization':  'Bearer ' + apiKey,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    var req = https.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ── Handler ───────────────────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var email = (req.body && req.body.email) ? req.body.email.trim() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  var RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('[subscribe] RESEND_API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    /* ── 1. Add contact to Resend audience ──────────────────────────── */
    var contactResult = await resendPost(
      '/audiences/' + AUDIENCE_ID + '/contacts',
      RESEND_API_KEY,
      { email: email, unsubscribed: false }
    );

    if (contactResult.status >= 400 && contactResult.status !== 422) {
      console.error('[subscribe] Resend audience error:', contactResult.body);
    }

    /* ── 2. Send welcome email via template ─────────────────────────── */
    var emailResult = await resendPost('/emails', RESEND_API_KEY, {
      from:        FROM_ADDRESS,
      to:          [email],
      template_id: TEMPLATE_ID
    });

    if (emailResult.status >= 400) {
      console.error('[subscribe] Resend send error:', emailResult.body);
      return res.status(200).json({ success: true, email_sent: false });
    }

    return res.status(200).json({ success: true, email_sent: true });

  } catch (err) {
    console.error('[subscribe] Unexpected error:', err.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
