/* ── SponsorAI Website Config — config.example.js ────────────────────────────
   This is a tracked template. Copy it to config.js and fill in real values.
   website/config.js is gitignored and must never be committed.

   Usage:
     cp website/config.example.js website/config.js
     # then edit website/config.js with your real credentials

   Both variables are required for email signup capture to work.
   Without them the form falls back to a graceful offline error.
──────────────────────────────────────────────────────────────────────────── */

/* Supabase project base URL (used by the Supabase JS Auth client).
   Format: https://<project-ref>.supabase.co
   Found in: Supabase dashboard → Project Settings → API → Project URL */
var WEBSITE_SUPABASE_URL = 'https://your-project-ref.supabase.co';

/* Supabase project REST endpoint (same project as app/config.js).
   Format: https://<project-ref>.supabase.co/rest/v1
   Found in: Supabase dashboard → Project Settings → API → Project URL */
var WEBSITE_API_URL = 'https://your-project-ref.supabase.co/rest/v1';

/* Supabase anon (public) key.
   Found in: Supabase dashboard → Project Settings → API → Project API keys → anon public
   Permissions enforced by RLS:
     - INSERT into email_signups (website + investor portal)
     - SELECT from investor_allowlist (authenticated users, own row only)
   It cannot read, update, or delete beyond what RLS allows. */
var WEBSITE_API_KEY = 'your-supabase-anon-key';
