/* ── Pipeline observability schema ────────────────────────────────────────────
   Creates:
     - pipeline_runs        : per-run log for all named pipelines
     - Adds 4 observability columns to property_social_accounts

   Applied: 2026-03-18
─────────────────────────────────────────────────────────────────────────── */

/* ── pipeline_runs ───────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_name  text        NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  status         text        NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  resolved_count int         NOT NULL DEFAULT 0,
  ingested_count int         NOT NULL DEFAULT 0,
  rollups_count  int         NOT NULL DEFAULT 0,
  error_count    int         NOT NULL DEFAULT 0,
  notes          jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

/* Index: recent runs by pipeline name */
CREATE INDEX IF NOT EXISTS pipeline_runs_name_started_idx
  ON public.pipeline_runs (pipeline_name, started_at DESC);

/* RLS: service role only — no public or authenticated access */
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

/* ── property_social_accounts — observability columns ────────────────────── */

ALTER TABLE public.property_social_accounts
  ADD COLUMN IF NOT EXISTS last_ingest_status  text
    CHECK (last_ingest_status IN ('ok', 'error', 'pending')),
  ADD COLUMN IF NOT EXISTS last_error_message  text,
  ADD COLUMN IF NOT EXISTS last_ingested_at    timestamptz,
  ADD COLUMN IF NOT EXISTS failure_count       int NOT NULL DEFAULT 0;
