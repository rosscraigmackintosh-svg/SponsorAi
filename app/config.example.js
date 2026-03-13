/* ── SponsorAI — config.example.js ──────────────────────────────────────────
   This is a tracked template. Copy it to config.js and fill in real values.
   config.js is gitignored and must never be committed.

   Usage:
     cp app/config.example.js app/config.js
     # then edit app/config.js with your real credentials

   Both variables are required. The app will fail silently if either is missing.
────────────────────────────────────────────────────────────────────────────── */

/* Supabase project REST endpoint.
   Format: https://<project-ref>.supabase.co
   Found in: Supabase dashboard → Project Settings → API → Project URL */
var API_URL = 'https://your-project-ref.supabase.co';

/* Supabase anon (public) key.
   Found in: Supabase dashboard → Project Settings → API → Project API keys → anon public
   This key is used for both REST queries (data.js) and to authorise the Edge Function
   chat proxy (ai.js). It is safe to use client-side, but RLS must be enabled before
   this project is shared beyond the local prototype. */
var API_KEY = 'your-supabase-anon-key';
