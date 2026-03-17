-- ── pg_cron: schedule ingest-x-profile-daily ─────────────────────────────
-- Run this once in the Supabase SQL editor after deploying the edge function.
-- This is NOT a Supabase migration — it must be run manually because it
-- requires your live project URL and service role key.
--
-- Prerequisites:
--   1. pg_cron extension enabled:
--      Dashboard → Database → Extensions → pg_cron → Enable
--   2. pg_net extension enabled:
--      Dashboard → Database → Extensions → pg_net → Enable
--   3. Edge function deployed:
--      supabase functions deploy ingest-x-profile-daily
--   4. X_BEARER_TOKEN secret set:
--      supabase secrets set X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAABe...
--
-- Before running: substitute the two placeholder values below.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: store connection settings on the database so the cron job
-- can read them without embedding secrets in the schedule definition.
-- Run this ONCE. Replace both values with your actual project credentials.
-- Your project ref is in Supabase Dashboard → Settings → General.
-- Your service role key is in Supabase Dashboard → Settings → API.

ALTER DATABASE postgres
  SET app.supabase_project_url  = 'https://YOUR_PROJECT_REF.supabase.co';

ALTER DATABASE postgres
  SET app.supabase_service_role = 'YOUR_SERVICE_ROLE_KEY';

-- Step 2: create the scheduled job.
-- Runs every day at 06:00 UTC.
-- Adjust the cron expression if a different time is preferred.

SELECT cron.schedule(
  'ingest-x-profile-daily',          -- job name — must be unique
  '0 6 * * *',                       -- daily at 06:00 UTC
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_project_url')
               || '/functions/v1/ingest-x-profile-daily',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role')
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Verify the job was registered ────────────────────────────────────────
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'ingest-x-profile-daily';

-- ── To remove the job ────────────────────────────────────────────────────
-- SELECT cron.unschedule('ingest-x-profile-daily');

-- ── To run immediately (manual trigger / backfill) ────────────────────────
-- SELECT net.http_post(
--   url     := current_setting('app.supabase_project_url') || '/functions/v1/ingest-x-profile-daily',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer ' || current_setting('app.supabase_service_role')
--   ),
--   body    := '{}'::jsonb
-- );
