/* ── Daily ingest cron schedules — multi-platform social ingestion ────────────
   Stagger start times to avoid overlapping function timeouts:
     02:00 UTC — X (fast: batch API, ~1 min for 100 accounts)
     02:15 UTC — YouTube (fast: batch API, ~1 min)
     02:30 UTC — Instagram (slow: sequential scrape, ~10 min for 50 accounts)
     03:00 UTC — TikTok (slowest: sequential HTML parse, ~15 min for 50 accounts)

   All functions are idempotent — safe to re-run manually at any time.

   Prerequisites:
     CREATE EXTENSION IF NOT EXISTS pg_cron;
     CREATE EXTENSION IF NOT EXISTS pg_net;
─────────────────────────────────────────────────────────────────────────── */

/* X — 02:00 UTC daily */
SELECT cron.schedule(
  'ingest-x-profile-daily',
  '0 2 * * *',
  $cmd$
  SELECT net.http_post(
    url     := 'https://kyjpxxyaebxvpprugmof.supabase.co/functions/v1/ingest-x-profile-daily',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  )
  $cmd$
);

/* YouTube — 02:15 UTC daily */
SELECT cron.schedule(
  'ingest-youtube-daily',
  '15 2 * * *',
  $cmd$
  SELECT net.http_post(
    url     := 'https://kyjpxxyaebxvpprugmof.supabase.co/functions/v1/ingest-youtube-daily',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  )
  $cmd$
);

/* Instagram — 02:30 UTC daily */
SELECT cron.schedule(
  'ingest-instagram-daily',
  '30 2 * * *',
  $cmd$
  SELECT net.http_post(
    url     := 'https://kyjpxxyaebxvpprugmof.supabase.co/functions/v1/ingest-instagram-daily',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  )
  $cmd$
);

/* TikTok — 03:00 UTC daily */
SELECT cron.schedule(
  'ingest-tiktok-daily',
  '0 3 * * *',
  $cmd$
  SELECT net.http_post(
    url     := 'https://kyjpxxyaebxvpprugmof.supabase.co/functions/v1/ingest-tiktok-daily',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  )
  $cmd$
);
