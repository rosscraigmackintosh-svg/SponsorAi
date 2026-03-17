-- ── Social Rollups Daily ──────────────────────────────────────────────────
-- Applied: 2026-03-17
-- Table: social_rollups_daily
--
-- One row per (social_account_id, as_of_date).
-- Written by the compute-x-rollups-daily Edge Function.
-- Derived entirely from social_account_snapshots — no external API calls.
--
-- Naming:
--   followers_delta_* = absolute change in follower count
--   followers_growth_pct_* = percentage change relative to the baseline snapshot
--   tweet_count_delta_30d = net tweets published in the window (from cumulative total)
--   momentum_score_30d = composite score 0-100, see function for formula
--   coverage_confidence = High / Medium / Low based on history depth
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.social_rollups_daily (
  id                       bigserial    PRIMARY KEY,
  property_id              uuid         NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  social_account_id        uuid         NOT NULL REFERENCES public.property_social_accounts(id) ON DELETE CASCADE,
  platform                 text         NOT NULL DEFAULT 'x',

  as_of_date               date         NOT NULL,

  -- Current snapshot values
  followers_count          bigint,
  tweet_count              bigint,       -- cumulative total at as_of_date

  -- Absolute follower deltas
  followers_delta_7d       bigint,       -- null when baseline unavailable
  followers_delta_30d      bigint,
  followers_delta_90d      bigint,

  -- Percentage growth relative to baseline (e.g. 2.5 = 2.5%)
  followers_growth_pct_7d  numeric(10,4),
  followers_growth_pct_30d numeric(10,4),
  followers_growth_pct_90d numeric(10,4),

  -- Activity: number of tweets published in window (derived from cumulative count)
  tweet_count_delta_30d    bigint,

  -- Audience Momentum Score (0-100) and human label
  -- Formula: see compute-x-rollups-daily edge function
  -- source_version identifies the formula version; increment when formula changes
  momentum_score_30d       numeric(6,1),
  momentum_label           text         CHECK (momentum_label IN ('Rising', 'Stable', 'Cooling')),
  source_version           text         NOT NULL DEFAULT 'x-profile-v1',

  -- Coverage confidence: based on available snapshot history depth
  --   High   = 30d+ baseline available
  --   Medium = 7d baseline available, no 30d
  --   Low    = fewer than 7 days of history
  coverage_confidence      text         CHECK (coverage_confidence IN ('High', 'Medium', 'Low')),

  created_at               timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (social_account_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS srd_property_id_idx    ON public.social_rollups_daily (property_id);
CREATE INDEX IF NOT EXISTS srd_as_of_date_idx     ON public.social_rollups_daily (as_of_date DESC);
CREATE INDEX IF NOT EXISTS srd_account_date_idx   ON public.social_rollups_daily (social_account_id, as_of_date DESC);

COMMENT ON TABLE public.social_rollups_daily IS
  'Daily rollup of derived X audience metrics per social account. '
  'One row per (social_account_id, as_of_date). '
  'Written by compute-x-rollups-daily. Read by the property page.';
