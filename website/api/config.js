/* SponsorAI Website Config -- Vercel Serverless Function
   Serves config variables from Vercel Environment Variables as a JS file.
   This replaces the gitignored website/config.js on the live site.

   Route: /config.js -> /api/config  (rewrite in vercel.json)

   Required Vercel Environment Variables:
     WEBSITE_SUPABASE_URL
     WEBSITE_API_URL
     WEBSITE_API_KEY
     WEBSITE_PORTAL_USERNAME
     WEBSITE_PORTAL_PASSWORD

   Also required (server-side only, NOT exposed to frontend):
     RESEND_API_KEY  — used by /api/subscribe for Resend email + audience
*/

module.exports = function handler(req, res) {
  var supabaseUrl    = process.env.WEBSITE_SUPABASE_URL    || '';
  var apiUrl         = process.env.WEBSITE_API_URL         || '';
  var apiKey         = process.env.WEBSITE_API_KEY         || '';
  var portalUsername = process.env.WEBSITE_PORTAL_USERNAME || '';
  var portalPassword = process.env.WEBSITE_PORTAL_PASSWORD || '';

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  res.send(
    'var WEBSITE_SUPABASE_URL = '      + JSON.stringify(supabaseUrl)    + ';\n' +
    'var WEBSITE_API_URL = '           + JSON.stringify(apiUrl)          + ';\n' +
    'var WEBSITE_API_KEY = '           + JSON.stringify(apiKey)          + ';\n' +
    'var WEBSITE_PORTAL_USERNAME = '   + JSON.stringify(portalUsername)  + ';\n' +
    'var WEBSITE_PORTAL_PASSWORD = '   + JSON.stringify(portalPassword)  + ';\n'
  );
};
