/* =============================================
   SPONSORAI — Resend Subscribe Handler
   Vercel Serverless Function: /api/subscribe

   On POST { email, source }:
     1. Adds contact to Resend "General" audience
     2. Sends the welcome email (HTML inlined)

   Required Vercel Environment Variable:
     RESEND_API_KEY
   ============================================= */

const https = require('https');

const AUDIENCE_ID  = '5c12f4b6-0404-4d16-a55c-89fb6514d988';
const FROM_ADDRESS = 'SponsorAI <hello@sponsorai.com>';
const SUBJECT      = "You're on the list \u2014 SponsorAI";

const EMAIL_HTML = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>You're on the list \u2014 SponsorAI</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #000000; }
    a { color: inherit; text-decoration: none; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .hero-headline { font-size: 34px !important; line-height: 1.15 !important; }
      .content-pad { padding: 0 24px !important; }
      .email-bg { background-image: url('https://www.sponsorai.com/images/email-mob.jpg') !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#000000;line-height:1px;">
    We have your details. We'll be in touch when we have a release date to share.&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;
  </div>

  <!-- Background table -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-bg"
    style="background-color:#000000;background-image:url('https://www.sponsorai.com/images/email.jpg');background-size:cover;background-position:center top;background-repeat:no-repeat;">
    <tr>
      <td align="center" style="background-color:rgba(0,0,0,0.88);background-image:linear-gradient(to bottom,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.90) 60%,rgba(0,0,0,0.97) 100%);">

        <!--[if gte mso 9]>
        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"
          style="width:600px;mso-wrap-style:square;v-text-anchor:top;">
          <v:fill type="frame" src="https://www.sponsorai.com/images/email.jpg" color="#08080e" />
          <v:textbox inset="0,0,0,0">
        <![endif]-->

        <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="560"
          style="max-width:560px;width:100%;">

          <!-- Spacer -->
          <tr><td style="height:48px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Header: logo + pill -->
          <tr>
            <td class="content-pad" style="padding:0 0 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <img src="https://www.sponsorai.com/images/logo-whitepng.png" alt="SponsorAI" height="20"
                      style="display:block;border:0;outline:none;text-decoration:none;" />
                  </td>
                  <td align="right">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,0.45);border:1px solid rgba(255,255,255,0.30);padding:5px 12px;border-radius:100px;display:inline-block;">Early Access</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 0 52px 0;border-top:1px solid rgba(255,255,255,0.10);font-size:0;line-height:0;"></td></tr>

          <!-- Hero -->
          <tr>
            <td class="content-pad" style="padding:0 0 52px 0;">
              <p style="margin:0 0 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:1.8px;text-transform:uppercase;color:rgba(255,255,255,0.32);">
                &#9679; &nbsp; You're on the list
              </p>
              <h1 class="hero-headline" style="margin:0 0 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:400;line-height:1.1;letter-spacing:-1.5px;color:#ffffff;">
                We have your details.<br />
                <span style="color:rgba(255,255,255,0.55);font-style:italic;">We'll be in touch.</span>
              </h1>
              <p style="margin:0 0 20px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:300;line-height:1.8;color:rgba(255,255,255,0.58);">
                Thanks for signing up. SponsorAI is still in development and we're keeping details close for now \u2014 but you'll be among the first to hear when we have a release date to share.
              </p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:300;line-height:1.8;color:rgba(255,255,255,0.32);font-style:italic;">
                If sponsorship sits anywhere near your world, being early here will matter.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 0 40px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:0;line-height:0;"></td></tr>

          <!-- What happens next -->
          <tr>
            <td class="content-pad" style="padding:0 0 52px 0;">
              <p style="margin:0 0 24px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:1.4px;text-transform:uppercase;color:rgba(120,220,120,0.70);">What happens next</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="20" valign="top" style="padding-top:2px;color:rgba(255,255,255,0.20);font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:14px;">&#8211;</td>
                  <td style="padding:0 0 14px 10px;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.7;color:rgba(255,255,255,0.52);">We'll email you when we have a confirmed release date.</td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="padding-top:2px;color:rgba(255,255,255,0.20);font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:14px;">&#8211;</td>
                  <td style="padding:0 0 14px 10px;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.7;color:rgba(255,255,255,0.52);">Early access will be limited. Being on this list puts you ahead of the queue.</td>
                </tr>
                <tr>
                  <td width="20" valign="top" style="padding-top:2px;color:rgba(255,255,255,0.20);font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:14px;">&#8211;</td>
                  <td style="padding:0 0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:300;line-height:1.7;color:rgba(255,255,255,0.52);">We won't send noise. If you hear from us, it's worth reading.</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 0 32px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:0;line-height:0;"></td></tr>

          <!-- Footer -->
          <tr>
            <td class="content-pad" style="padding:0 0 48px 0;">
              <p style="margin:0 0 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.20);">
                &copy; 2026 SponsorAI &nbsp;&middot;&nbsp; Intelligence for sponsorship decisions
              </p>
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:300;line-height:1.6;color:rgba(255,255,255,0.15);">
                You received this because you signed up at sponsorai.com.
                &nbsp;<a href="https://sponsorai.com" style="color:rgba(255,255,255,0.28);text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>

        <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>`;

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

    /* ── 2. Send welcome email (HTML inlined) ───────────────────────── */
    var emailResult = await resendPost('/emails', RESEND_API_KEY, {
      from:    FROM_ADDRESS,
      to:      [email],
      subject: SUBJECT,
      html:    EMAIL_HTML
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
