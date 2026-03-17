-- ── pg_cron: schedule compute-x-rollups-daily ────────────────────────────
-- Run once in the Supabase SQL editor after deploying the edge function.
-- This is NOT a migration — it requires manual substitution and runs once.
--
-- Pipeline order:
--   06:00 UTC  ingest-x-profile-daily   — writes social_account_snapshots
--   06:30 UTC  compute-x-rollups-daily  — reads snapshots, writes social_rollups_daily
--
-- The 30-minute gap is intentional: it ensures the ingest job has completed
-- before the rollup job reads from social_account_snapshots.
--
-- Prerequisites:
--   1. ingest_x_profile_daily.sql already applied (pg_cron + pg_net enabled,
--      app.supabase_project_url and app.supabase_service_role already set)
--   2. Edge function deployed:
--      supabase functions deploy compute-x-rollups-daily
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: register the job.
-- Runs every day at 06:30 UTC, 30 minutes after the ingest job.

SELECT cron.schedule(
  'compute-x-rollups-daily',         -- unique job name
  '30 6 * * *',                      -- daily at 06:30 UTC
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_project_url')
               || '/functions/v1/compute-x-rollups-daily',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role')
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Verify ────────────────────────────────────────────────────────────────
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname IN ('ingest-x-profile-daily', 'compute-x-rollups-daily');

-- ── Unschedule ────────────────────────────────────────────────────────────
-- SELECT cron.unschedule('compute-x-rollups-daily');

-- ── Manual trigger ────────────────────────────────────────────────────────
-- SELECT net.http_post(
--   url     := current_setting('app.supabase_project_url') || '/functions/v1/compute-x-rollups-daily',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer ' || current_setting('app.supabase_service_role')
--   ),
--   body    := '{}'::jsonb
-- );
