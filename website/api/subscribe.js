/* =============================================
   SPONSORAI — Resend Subscribe Handler
   Vercel Serverless Function: /api/subscribe

   On POST { email, source }:
     1. Adds contact to Resend "General" audience
     2. Sends the welcome email (email-welcome.html)

   Required Vercel Environment Variable:
     RESEND_API_KEY
   ============================================= */

const fs   = require('fs');
const path = require('path');

const AUDIENCE_ID  = '5c12f4b6-0404-4d16-a55c-89fb6514d988';
const FROM_ADDRESS = 'SponsorAI <hello@sponsorai.com>';
const EMAIL_SUBJECT = "You're on the list — SponsorAI";
const SITE_URL = 'https://sponsorai.com';

module.exports = async function handler(req, res) {
  /* Only allow POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('[subscribe] RESEND_API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    /* ── 1. Add contact to Resend audience ──────────────────────────── */
    const contactRes = await fetch(
      `https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + RESEND_API_KEY,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ email: email.trim(), unsubscribed: false })
      }
    );

    if (!contactRes.ok) {
      const contactBody = await contactRes.json().catch(() => ({}));
      /* 422 with "already exists" is fine — treat as success */
      if (contactRes.status !== 422) {
        console.error('[subscribe] Resend audience error:', contactBody);
      }
    }

    /* ── 2. Load & prepare the welcome email HTML ───────────────────── */
    let emailHtml = fs.readFileSync(
      path.join(process.cwd(), 'email-welcome.html'),
      'utf8'
    );

    /* Replace relative image paths with absolute URLs */
    emailHtml = emailHtml
      .replace(/src='images\//g,  "src='" + SITE_URL + "/images/")
      .replace(/src="images\//g,  'src="' + SITE_URL + '/images/')
      .replace(/url\('images\//g, "url('" + SITE_URL + "/images/")
      .replace(/url\("images\//g, 'url("' + SITE_URL + '/images/')
      .replace(/YOUR_IMAGE_URL_HERE/g, SITE_URL + '/images/email.png');

    /* Remove the Vercel analytics scripts (not needed in email) */
    emailHtml = emailHtml.replace(/<script[^>]*_vercel[^>]*><\/script>\s*/g, '');

    /* Swap Mailchimp unsubscribe tag for a plain anchor */
    emailHtml = emailHtml.replace(/\*\|UNSUB\|\*/g, SITE_URL);

    /* ── 3. Send the welcome email ───────────────────────────────────── */
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        from:    FROM_ADDRESS,
        to:      [email.trim()],
        subject: EMAIL_SUBJECT,
        html:    emailHtml
      })
    });

    if (!emailRes.ok) {
      const emailBody = await emailRes.json().catch(() => ({}));
      console.error('[subscribe] Resend send error:', emailBody);
      /* Still return 200 — contact was added even if email failed */
      return res.status(200).json({ success: true, email_sent: false });
    }

    return res.status(200).json({ success: true, email_sent: true });

  } catch (err) {
    console.error('[subscribe] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
