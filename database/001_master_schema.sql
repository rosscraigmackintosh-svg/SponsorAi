-- ============================================================
-- SponsorAI  -  Master Database Script
-- Target: Supabase Postgres 17  |  Region: eu-west-1
-- Generated: 2026-02-28
-- ============================================================
-- Run order:
--   1  Extensions + enums
--   2  Tables
--   3  Indexes
--   4  Functions (rollup, fanscore, windows)
--   5  Views
--   6  Seed raw data
--   7  Execute derived-data pipeline
--   8  Run-book (daily ops)
-- ============================================================


-- ============================================================
-- SECTION 1 : EXTENSIONS + ENUMS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- NOTE: live DB extended this enum via ALTER TYPE ADD VALUE in later migrations
-- (universal_property_model_phase1 + subsequent ingestion migrations).
-- On a clean rebuild the full 7-value set is created here in one pass.
-- On an existing DB these values already exist; the DO block is a no-op.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_type_enum') THEN
    CREATE TYPE property_type_enum AS ENUM (
      'driver',
      'team',
      'athlete',
      'series',
      'event',
      'venue',
      'governing_body'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_enum') THEN
    CREATE TYPE platform_enum AS ENUM ('instagram','tiktok','youtube','x','linkedin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type_enum') THEN
    CREATE TYPE content_type_enum AS ENUM ('image','video','carousel','reel','story','text');
  END IF;
END $$;


-- ============================================================
-- SECTION 2 : TABLES
-- ============================================================

-- 2a  Properties --------------------------------------------------

-- NOTE: columns from sport downward were added by later migrations
-- (universal_property_model_phase1, add_metadata_jsonb_to_properties,
--  add_visibility_to_properties, populate_country_codes, etc.).
-- Consolidated here so a clean rebuild produces the correct shape.
CREATE TABLE IF NOT EXISTS properties (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  property_type    property_type_enum NOT NULL,
  country          text,
  bio              text,
  event_start_date date,                       -- only for type = event
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Extended property fields (added by migrations after initial schema)
  sport            text,
  slug             text,                        -- unique; see idx below
  country_code     char(2),
  city             text,
  region           text,
  latitude         numeric,
  longitude        numeric,
  event_end_date   date,                        -- only for type = event
  metadata         jsonb       DEFAULT '{}',
  visible_in_ui    boolean     NOT NULL DEFAULT false,
  hidden_reason    text
);

-- 2b  Accounts ----------------------------------------------------

CREATE TABLE IF NOT EXISTS accounts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  platform          platform_enum NOT NULL,
  handle            text        NOT NULL,
  url               text,
  followers_baseline bigint     NOT NULL DEFAULT 0,
  is_verified       boolean     NOT NULL DEFAULT false,
  is_suspect_bot    boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  platform_user_id  text,                       -- added by add_platform_user_id_to_accounts
  UNIQUE (property_id, platform, handle)
);

-- 2c  Raw posts ---------------------------------------------------

CREATE TABLE IF NOT EXISTS raw_posts (
  id               uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid             NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform         platform_enum    NOT NULL,
  posted_at        timestamptz      NOT NULL,
  content_type     content_type_enum NOT NULL DEFAULT 'image',
  caption          text,
  url              text,
  is_viral         boolean          NOT NULL DEFAULT false,
  created_at       timestamptz      NOT NULL DEFAULT now(),
  platform_post_id text                         -- added by add_platform_post_id_to_raw_posts
);

-- 2d  Raw daily post metrics (high-volume, use bigserial) ---------

CREATE TABLE IF NOT EXISTS raw_post_daily_metrics (
  id              bigserial   PRIMARY KEY,
  post_id         uuid        NOT NULL REFERENCES raw_posts(id) ON DELETE CASCADE,
  metric_date     date        NOT NULL,
  impressions     bigint      NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  reach           bigint      NOT NULL DEFAULT 0 CHECK (reach >= 0),
  likes           bigint      NOT NULL DEFAULT 0 CHECK (likes >= 0),
  comments        bigint      NOT NULL DEFAULT 0 CHECK (comments >= 0),
  shares          bigint      NOT NULL DEFAULT 0 CHECK (shares >= 0),
  saves           bigint      NOT NULL DEFAULT 0 CHECK (saves >= 0),
  clicks          bigint      NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  watch_seconds   bigint      NOT NULL DEFAULT 0 CHECK (watch_seconds >= 0),
  collected_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, metric_date)
);

-- 2e  Raw account followers ---------------------------------------

CREATE TABLE IF NOT EXISTS raw_account_followers (
  id              bigserial   PRIMARY KEY,
  account_id      uuid        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  metric_date     date        NOT NULL,
  followers_count bigint      NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  followers_delta bigint      NOT NULL DEFAULT 0,
  collected_at    timestamptz NOT NULL DEFAULT now(),
  is_estimated    boolean     NOT NULL DEFAULT false,  -- added by add_data_provenance_to_raw_account_followers
  data_source     text        NOT NULL DEFAULT 'api',  -- added by add_data_provenance_to_raw_account_followers
  UNIQUE (account_id, metric_date)
);

-- 2f  Property-platform daily rollup (derived) --------------------

CREATE TABLE IF NOT EXISTS property_platform_daily_metrics (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  platform            platform_enum NOT NULL,
  metric_date         date        NOT NULL,
  posts_count         int         NOT NULL DEFAULT 0,
  impressions         bigint      NOT NULL DEFAULT 0,
  reach               bigint      NOT NULL DEFAULT 0,
  likes               bigint      NOT NULL DEFAULT 0,
  comments            bigint      NOT NULL DEFAULT 0,
  shares              bigint      NOT NULL DEFAULT 0,
  saves               bigint      NOT NULL DEFAULT 0,
  clicks              bigint      NOT NULL DEFAULT 0,
  watch_seconds       bigint      NOT NULL DEFAULT 0,
  followers_end_of_day bigint     DEFAULT 0,
  followers_delta     bigint      DEFAULT 0,
  completeness_pct    numeric(5,4) NOT NULL DEFAULT 1.0,
  anomaly_flags       text[]      NOT NULL DEFAULT '{}',
  computed_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, platform, metric_date)
);

-- 2g  FanScore model registry -------------------------------------

CREATE TABLE IF NOT EXISTS fanscore_models (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version   text        NOT NULL UNIQUE,
  is_active       boolean     NOT NULL DEFAULT false,
  description     text,
  weights_json    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2h  FanScore daily snapshots ------------------------------------

CREATE TABLE IF NOT EXISTS fanscore_daily (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  metric_date       date        NOT NULL,
  model_version     text        NOT NULL,
  fanscore_value    numeric(7,3),
  confidence_band   text        CHECK (confidence_band IN ('High','Medium','Low')),
  confidence_value  numeric(5,4) CHECK (confidence_value BETWEEN 0 AND 1),
  components_json   jsonb,
  reasons           text[]      NOT NULL DEFAULT '{}',
  suppression_reason text,
  inputs_hash       text,
  computed_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, metric_date, model_version)
);

-- 2i  FanScore rolling windows ------------------------------------

CREATE TABLE IF NOT EXISTS fanscore_windows (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  as_of_day           date        NOT NULL,
  window_days         int         NOT NULL CHECK (window_days IN (30,60,90)),
  model_version       text        NOT NULL,
  avg_score           numeric(7,3),
  median_score        numeric(7,3),
  trend_value         numeric(10,6),
  volatility_value    numeric(10,6),
  anomaly_days_count  int         NOT NULL DEFAULT 0,
  completeness_pct    numeric(5,4) NOT NULL DEFAULT 0,
  confidence_band     text        CHECK (confidence_band IN ('High','Medium','Low')),
  confidence_value    numeric(5,4) CHECK (confidence_value BETWEEN 0 AND 1),
  computed_at         timestamptz NOT NULL DEFAULT now(),
  suppression_reason  text,                    -- added by migration 008_fix_fanscore_windows_suppression
  UNIQUE (property_id, as_of_day, window_days, model_version)
);


-- ============================================================
-- SECTION 3 : INDEXES
-- ============================================================

-- properties
CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_unique       ON properties (slug);
CREATE INDEX IF NOT EXISTS idx_properties_property_type        ON properties (property_type);
CREATE INDEX IF NOT EXISTS idx_properties_slug                 ON properties (slug);
CREATE INDEX IF NOT EXISTS idx_properties_sport                ON properties (sport);
CREATE INDEX IF NOT EXISTS idx_properties_visible_in_ui        ON properties (visible_in_ui) WHERE visible_in_ui = true;

-- accounts
CREATE INDEX IF NOT EXISTS idx_accounts_property               ON accounts (property_id);
CREATE INDEX IF NOT EXISTS idx_accounts_platform               ON accounts (platform);
CREATE INDEX IF NOT EXISTS idx_accounts_platform_user_id       ON accounts (platform, platform_user_id) WHERE platform_user_id IS NOT NULL;

-- raw_posts
CREATE INDEX IF NOT EXISTS idx_raw_posts_account               ON raw_posts (account_id);
CREATE INDEX IF NOT EXISTS idx_raw_posts_posted_at             ON raw_posts (posted_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_posts_account_platform_post
  ON raw_posts (account_id, platform_post_id) WHERE platform_post_id IS NOT NULL;

-- raw_post_daily_metrics
CREATE INDEX IF NOT EXISTS idx_rpdm_post_date                  ON raw_post_daily_metrics (post_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_rpdm_date                       ON raw_post_daily_metrics (metric_date);

-- raw_account_followers
CREATE INDEX IF NOT EXISTS idx_raf_account_date                ON raw_account_followers (account_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_raf_is_estimated                ON raw_account_followers (account_id, metric_date) WHERE is_estimated = true;

-- property_platform_daily_metrics
CREATE INDEX IF NOT EXISTS idx_ppdm_prop_plat_date             ON property_platform_daily_metrics (property_id, platform, metric_date);
CREATE INDEX IF NOT EXISTS idx_ppdm_date                       ON property_platform_daily_metrics (metric_date);

-- fanscore_daily
CREATE INDEX IF NOT EXISTS idx_fsd_prop_date_model             ON fanscore_daily (property_id, metric_date, model_version);
CREATE INDEX IF NOT EXISTS idx_fsd_date                        ON fanscore_daily (metric_date);

-- fanscore_windows
CREATE INDEX IF NOT EXISTS idx_fsw_prop_day_win                ON fanscore_windows (property_id, as_of_day, window_days, model_version);


-- ============================================================
-- SECTION 4 : FUNCTIONS
-- ============================================================

-- 4a  compute_daily_rollups  (date range) -------------------------
--     Aggregates raw post metrics + follower data into
--     property_platform_daily_metrics.

CREATE OR REPLACE FUNCTION compute_daily_rollups(
  p_start_date date,
  p_end_date   date
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO property_platform_daily_metrics (
    property_id, platform, metric_date,
    posts_count, impressions, reach, likes, comments, shares, saves, clicks, watch_seconds,
    followers_end_of_day, followers_delta,
    completeness_pct, anomaly_flags, computed_at
  )
  SELECT
    a.property_id,
    a.platform,
    d.day,
    -- posts published on that day
    COUNT(DISTINCT rp.id) FILTER (WHERE rp.posted_at::date = d.day),
    COALESCE(SUM(m.impressions), 0),
    COALESCE(SUM(m.reach), 0),
    COALESCE(SUM(m.likes), 0),
    COALESCE(SUM(m.comments), 0),
    COALESCE(SUM(m.shares), 0),
    COALESCE(SUM(m.saves), 0),
    COALESCE(SUM(m.clicks), 0),
    COALESCE(SUM(m.watch_seconds), 0),
    -- followers: take latest follower snapshot for that account+day
    COALESCE(f.followers_count, 0),
    COALESCE(f.followers_delta, 0),
    -- completeness: fraction of accounts for this property+platform that have data
    CASE WHEN COUNT(DISTINCT a2.id) = 0 THEN 0
         ELSE COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN a.id END)::numeric
              / COUNT(DISTINCT a2.id)::numeric
    END,
    -- anomaly flags
    ARRAY_REMOVE(ARRAY[
      CASE WHEN bool_or(a.is_suspect_bot) THEN 'suspected_bot' END,
      CASE WHEN COALESCE(SUM(m.likes),0) > 0
            AND COALESCE(SUM(m.comments),0)::numeric / GREATEST(SUM(m.likes),1) < 0.005
           THEN 'low_comment_ratio' END,
      CASE WHEN COALESCE(SUM(m.impressions),0) > 100000 THEN 'spike' END
    ], NULL),
    now()
  FROM (
    SELECT DISTINCT a_inner.property_id, a_inner.platform, a_inner.id AS account_id
    FROM accounts a_inner
  ) a2
  CROSS JOIN generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(day)
  JOIN accounts a ON a.property_id = a2.property_id AND a.platform = a2.platform
  LEFT JOIN raw_posts rp ON rp.account_id = a.id
  LEFT JOIN raw_post_daily_metrics m ON m.post_id = rp.id AND m.metric_date = d.day::date
  LEFT JOIN LATERAL (
    SELECT raf.followers_count, raf.followers_delta
    FROM raw_account_followers raf
    WHERE raf.account_id = a.id AND raf.metric_date = d.day::date
    LIMIT 1
  ) f ON true
  GROUP BY a.property_id, a.platform, d.day, f.followers_count, f.followers_delta
  ON CONFLICT (property_id, platform, metric_date) DO UPDATE SET
    posts_count         = EXCLUDED.posts_count,
    impressions         = EXCLUDED.impressions,
    reach               = EXCLUDED.reach,
    likes               = EXCLUDED.likes,
    comments            = EXCLUDED.comments,
    shares              = EXCLUDED.shares,
    saves               = EXCLUDED.saves,
    clicks              = EXCLUDED.clicks,
    watch_seconds       = EXCLUDED.watch_seconds,
    followers_end_of_day = EXCLUDED.followers_end_of_day,
    followers_delta     = EXCLUDED.followers_delta,
    completeness_pct    = EXCLUDED.completeness_pct,
    anomaly_flags       = EXCLUDED.anomaly_flags,
    computed_at         = now();
END;
$$;


-- 4b  compute_fanscore_daily  (date range, model) -----------------
--     Reads property_platform_daily_metrics (rollups) and writes
--     one fanscore_daily row per property per day.

CREATE OR REPLACE FUNCTION compute_fanscore_daily(
  p_start_date    date,
  p_end_date      date,
  p_model_version text
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO fanscore_daily (
    property_id, metric_date, model_version,
    fanscore_value, confidence_band, confidence_value,
    components_json, reasons, suppression_reason, inputs_hash, computed_at
  )
  WITH
  -- Step 1: aggregate across platforms per property per day
  daily_agg AS (
    SELECT
      ppm.property_id,
      ppm.metric_date,
      SUM(ppm.likes)::numeric                                     AS total_likes,
      SUM(ppm.comments)::numeric                                  AS total_comments,
      SUM(ppm.shares)::numeric                                    AS total_shares,
      SUM(ppm.saves)::numeric                                     AS total_saves,
      SUM(ppm.clicks)::numeric                                    AS total_clicks,
      SUM(ppm.watch_seconds)::numeric                             AS total_watch,
      SUM(ppm.followers_end_of_day)::numeric                      AS total_followers,
      SUM(ppm.followers_delta)::numeric                           AS total_foll_delta,
      AVG(ppm.completeness_pct)                                   AS avg_completeness,
      bool_or('suspected_bot' = ANY(ppm.anomaly_flags))           AS has_bot,
      bool_or('spike' = ANY(ppm.anomaly_flags))                   AS has_spike,
      -- engagement points
      (SUM(ppm.likes)
       + SUM(ppm.comments) * 3
       + SUM(ppm.shares) * 4
       + SUM(ppm.saves) * 4
       + SUM(ppm.clicks) * 2
       + SUM(ppm.watch_seconds) / 10.0)                           AS ep
    FROM property_platform_daily_metrics ppm
    WHERE ppm.metric_date BETWEEN p_start_date AND p_end_date
    GROUP BY ppm.property_id, ppm.metric_date
  ),

  -- Step 2: also get ep for lookback windows (up to 90 days before start)
  daily_agg_extended AS (
    SELECT
      ppm.property_id,
      ppm.metric_date,
      (SUM(ppm.likes)
       + SUM(ppm.comments) * 3
       + SUM(ppm.shares) * 4
       + SUM(ppm.saves) * 4
       + SUM(ppm.clicks) * 2
       + SUM(ppm.watch_seconds) / 10.0) AS ep
    FROM property_platform_daily_metrics ppm
    WHERE ppm.metric_date BETWEEN (p_start_date - 90) AND p_end_date
    GROUP BY ppm.property_id, ppm.metric_date
  ),

  -- Step 3: compute window stats per property per day
  with_windows AS (
    SELECT
      da.property_id,
      da.metric_date,
      da.ep,
      da.total_likes, da.total_comments, da.total_shares, da.total_saves,
      da.total_clicks, da.total_watch,
      da.total_followers, da.total_foll_delta,
      da.avg_completeness, da.has_bot, da.has_spike,
      -- max ep in 90-day trailing window
      (SELECT MAX(dae.ep) FROM daily_agg_extended dae
       WHERE dae.property_id = da.property_id
         AND dae.metric_date BETWEEN (da.metric_date - 89) AND da.metric_date
      ) AS max_ep_90d,
      -- avg ep in 30-day trailing window
      (SELECT AVG(dae.ep) FROM daily_agg_extended dae
       WHERE dae.property_id = da.property_id
         AND dae.metric_date BETWEEN (da.metric_date - 29) AND da.metric_date
      ) AS avg_ep_30d,
      -- stddev ep in 30-day trailing window
      (SELECT STDDEV(dae.ep) FROM daily_agg_extended dae
       WHERE dae.property_id = da.property_id
         AND dae.metric_date BETWEEN (da.metric_date - 29) AND da.metric_date
      ) AS stddev_ep_30d
    FROM daily_agg da
  ),

  -- Step 4: compute components
  scored AS (
    SELECT
      w.*,
      -- norm: ln(1+ep) / ln(1+max_ep_90d)
      CASE WHEN COALESCE(w.max_ep_90d, 0) <= 0 THEN 0
           ELSE LN(1.0 + w.ep) / LN(1.0 + w.max_ep_90d)
      END AS norm_val,
      -- growth: clamp( (delta/followers)*20, -1, 1 ) then map to 0..1
      CASE WHEN w.total_followers <= 0 THEN 0.5
           ELSE LEAST(1.0, GREATEST(0.0,
                  0.5 + 0.5 * LEAST(1.0, GREATEST(-1.0,
                    (w.total_foll_delta / GREATEST(w.total_followers, 1.0)) * 20.0
                  ))
                ))
      END AS growth_val,
      -- consistency: 1 - clamp(stddev/(avg+1), 0, 1)
      CASE WHEN COALESCE(w.avg_ep_30d, 0) = 0 AND COALESCE(w.stddev_ep_30d, 0) = 0 THEN 0.5
           ELSE 1.0 - LEAST(1.0, GREATEST(0.0,
                  COALESCE(w.stddev_ep_30d, 0) / (COALESCE(w.avg_ep_30d, 0) + 1.0)
                ))
      END AS consistency_val,
      -- integrity multiplier
      CASE
        WHEN w.has_bot AND w.has_spike THEN 0.70
        WHEN w.has_bot                THEN 0.80
        WHEN w.has_spike              THEN 0.90
        ELSE 1.0
      END AS integrity_mult
    FROM with_windows w
  )

  SELECT
    s.property_id,
    s.metric_date,
    p_model_version,
    -- fanscore_value
    CASE WHEN s.avg_completeness < 0.6 THEN NULL
         ELSE LEAST(100.0, GREATEST(0.0,
                100.0 * (0.65 * s.norm_val + 0.15 * s.growth_val + 0.20 * s.consistency_val)
                      * s.integrity_mult
              ))
    END,
    -- confidence_band
    CASE
      WHEN s.avg_completeness < 0.6 THEN 'Low'
      WHEN (s.avg_completeness * (1.0 - LEAST(1.0, COALESCE(s.stddev_ep_30d,0) / (COALESCE(s.avg_ep_30d,0)+1.0)))) >= 0.8
        THEN 'High'
      WHEN (s.avg_completeness * (1.0 - LEAST(1.0, COALESCE(s.stddev_ep_30d,0) / (COALESCE(s.avg_ep_30d,0)+1.0)))) >= 0.55
        THEN 'Medium'
      ELSE 'Low'
    END,
    -- confidence_value
    LEAST(1.0, GREATEST(0.0,
      s.avg_completeness * (1.0 - 0.3 * LEAST(1.0, COALESCE(s.stddev_ep_30d,0) / (COALESCE(s.avg_ep_30d,0)+1.0)))
    )),
    -- components_json
    jsonb_build_object(
      'norm',        jsonb_build_object('value', ROUND(s.norm_val, 4),        'weight', 0.65),
      'growth',      jsonb_build_object('value', ROUND(s.growth_val, 4),      'weight', 0.15),
      'consistency', jsonb_build_object('value', ROUND(s.consistency_val, 4),  'weight', 0.20),
      'integrity_mult', s.integrity_mult,
      'engagement_points', ROUND(s.ep, 2),
      'max_ep_90d',  ROUND(COALESCE(s.max_ep_90d, 0), 2),
      'avg_ep_30d',  ROUND(COALESCE(s.avg_ep_30d, 0), 2)
    ),
    -- reasons
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s.norm_val > 0.8   THEN 'High engagement relative to recent history' END,
      CASE WHEN s.growth_val > 0.7 THEN 'Strong follower growth' END,
      CASE WHEN s.growth_val < 0.3 THEN 'Declining follower base' END,
      CASE WHEN s.consistency_val > 0.8 THEN 'Consistent posting pattern' END,
      CASE WHEN s.has_bot          THEN 'Suspected bot activity detected' END,
      CASE WHEN s.has_spike        THEN 'Unusual engagement spike flagged' END
    ], NULL),
    -- suppression_reason
    CASE WHEN s.avg_completeness < 0.6 THEN 'Insufficient data (completeness < 60%)' END,
    -- inputs_hash
    md5(
      s.property_id::text || s.metric_date::text || p_model_version
      || ROUND(s.ep,2)::text || ROUND(COALESCE(s.max_ep_90d,0),2)::text
      || ROUND(s.total_followers)::text || ROUND(COALESCE(s.stddev_ep_30d,0),2)::text
    ),
    now()
  FROM scored s
  ON CONFLICT (property_id, metric_date, model_version) DO UPDATE SET
    fanscore_value    = EXCLUDED.fanscore_value,
    confidence_band   = EXCLUDED.confidence_band,
    confidence_value  = EXCLUDED.confidence_value,
    components_json   = EXCLUDED.components_json,
    reasons           = EXCLUDED.reasons,
    suppression_reason = EXCLUDED.suppression_reason,
    inputs_hash       = EXCLUDED.inputs_hash,
    computed_at       = now();
END;
$$;


-- 4c  compute_fanscore_windows  (as_of_day, model) ----------------
--     Reads fanscore_daily and writes 30/60/90-day windows.
--     NOTE: this definition reflects migration 008 (008_fix_fanscore_windows_suppression).
--     Key differences from the original (pre-008) definition:
--       1. suppression_reason column added to INSERT / SELECT / ON CONFLICT UPDATE.
--       2. WHERE clause no longer excludes fd.fanscore_value IS NOT NULL -- suppressed
--          rows must be included so anomaly_days_count counts them correctly.
--       3. confidence_band CASE gains a leading < 0.6 -> 'Low' guard.
--       4. REGR_SLOPE casts changed to ::float8 on both sides.

CREATE OR REPLACE FUNCTION compute_fanscore_windows(
  p_as_of_day     date,
  p_model_version text
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO fanscore_windows (
    property_id, as_of_day, window_days, model_version,
    avg_score, median_score, trend_value, volatility_value,
    anomaly_days_count, completeness_pct,
    confidence_band, confidence_value,
    suppression_reason,
    computed_at
  )
  SELECT
    fd.property_id,
    p_as_of_day,
    w.win,
    p_model_version,

    -- averages use only non-suppressed (non-null) scores
    AVG(fd.fanscore_value),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fd.fanscore_value),
    REGR_SLOPE(fd.fanscore_value::float8,
               (fd.metric_date - (p_as_of_day - w.win))::float8),
    STDDEV(fd.fanscore_value),

    -- anomaly count: rows that were suppressed during the window
    COUNT(*) FILTER (WHERE fd.suppression_reason IS NOT NULL),

    -- completeness: fraction of window days that had a non-suppressed score
    COUNT(fd.fanscore_value)::numeric / w.win::numeric,

    -- confidence_band
    CASE
      WHEN (COUNT(fd.fanscore_value)::numeric / w.win::numeric) < 0.6  THEN 'Low'
      WHEN (COUNT(fd.fanscore_value)::numeric / w.win::numeric) >= 0.8
       AND COALESCE(STDDEV(fd.fanscore_value),0) < 15                  THEN 'High'
      WHEN (COUNT(fd.fanscore_value)::numeric / w.win::numeric) >= 0.55 THEN 'Medium'
      ELSE 'Low'
    END,

    -- confidence_value
    LEAST(1.0, GREATEST(0.0,
      (COUNT(fd.fanscore_value)::numeric / w.win::numeric)
      * (1.0 - LEAST(1.0, COALESCE(STDDEV(fd.fanscore_value),0) / 50.0)))),

    -- suppression_reason (written at window level when coverage is too low)
    CASE
      WHEN (COUNT(fd.fanscore_value)::numeric / w.win::numeric) < 0.6
      THEN 'Low data coverage in window (< 60% of days scored)'
      ELSE NULL
    END,

    now()
  FROM fanscore_daily fd
  CROSS JOIN (SELECT unnest(ARRAY[30,60,90]) AS win) w
  WHERE fd.model_version = p_model_version
    AND fd.metric_date BETWEEN (p_as_of_day - w.win + 1) AND p_as_of_day
  GROUP BY fd.property_id, w.win
  ON CONFLICT (property_id, as_of_day, window_days, model_version) DO UPDATE SET
    avg_score          = EXCLUDED.avg_score,
    median_score       = EXCLUDED.median_score,
    trend_value        = EXCLUDED.trend_value,
    volatility_value   = EXCLUDED.volatility_value,
    anomaly_days_count = EXCLUDED.anomaly_days_count,
    completeness_pct   = EXCLUDED.completeness_pct,
    confidence_band    = EXCLUDED.confidence_band,
    confidence_value   = EXCLUDED.confidence_value,
    suppression_reason = EXCLUDED.suppression_reason,
    computed_at        = now();
END;
$$;


-- ============================================================
-- SECTION 5 : VIEWS
-- ============================================================

-- Latest active model version (helper) ----------------------------

CREATE OR REPLACE VIEW v_active_model AS
SELECT model_version
FROM fanscore_models
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- FanScore daily (current model only) -----------------------------

CREATE OR REPLACE VIEW v_fanscore_daily_current AS
SELECT fd.*
FROM fanscore_daily fd
WHERE fd.model_version = (SELECT model_version FROM v_active_model);

-- FanScore windows (current model only) ---------------------------

CREATE OR REPLACE VIEW v_fanscore_windows_current AS
SELECT fw.*
FROM fanscore_windows fw
WHERE fw.model_version = (SELECT model_version FROM v_active_model);

-- Property summary for UI cards -----------------------------------
-- NOTE: This view definition reflects the live database state as of 2026-03-14.
-- It supersedes the original definition (which used old column aliases such as
-- p.name (not aliased), latest_fanscore, latest_score_date, avg_30d, trend_30d,
-- and the now-removed helper views v_fanscore_daily_current /
-- v_fanscore_windows_current). Column names here match ui_data_layer.ts exactly.
-- Requires: fanscore_daily.suppression_reason column (migration 008).

CREATE OR REPLACE VIEW v_property_summary_current AS
SELECT
  p.id              AS property_id,
  p.name            AS property_name,
  p.property_type,
  p.country,
  p.event_start_date,

  -- Latest scored day for this property under the active model
  fd.metric_date    AS as_of_day,
  fd.model_version,

  -- 30-day window — full detail
  w30.avg_score         AS avg_score_30d,
  w30.median_score      AS median_score_30d,
  w30.trend_value       AS trend_value_30d,
  w30.volatility_value  AS volatility_value_30d,
  w30.completeness_pct  AS completeness_pct_30d,
  w30.confidence_band   AS confidence_band_30d,
  w30.confidence_value  AS confidence_value_30d,
  CASE
    WHEN w30.confidence_band IS NULL THEN 'Insufficient data'::text
    ELSE NULL::text
  END                   AS suppression_reason_30d,

  -- 60-day and 90-day windows — avg + 90d trend only (by design)
  w60.avg_score         AS avg_score_60d,
  w90.avg_score         AS avg_score_90d,
  w90.trend_value       AS trend_value_90d,

  -- Relationship arrays (driver/athlete → teams; team → drivers/athletes)
  team_rel.team_ids,
  team_rel.team_names,
  driver_rel.driver_ids,
  driver_rel.driver_names,

  -- Core property fields
  p.bio,
  p.slug,

  -- Social aggregations
  soc_foll.total_followers_latest,
  soc_30d.followers_net_30d,
  soc_30d.posts_30d,
  soc_30d.total_interactions_30d,
  soc_30d.engagement_rate_30d_pct,
  soc_plat.platforms_active,

  -- Enrichment (populated via populate_region_from_country migration)
  p.sport,
  p.region,
  p.city,
  p.visible_in_ui

FROM properties p

-- Latest daily score record under the active model
LEFT JOIN LATERAL (
  SELECT fd2.metric_date, fd2.model_version
  FROM fanscore_daily fd2
  WHERE fd2.property_id = p.id
    AND fd2.model_version = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fd2.metric_date DESC
  LIMIT 1
) fd ON true

-- 30-day window snapshot
LEFT JOIN LATERAL (
  SELECT fw.avg_score, fw.median_score, fw.trend_value,
         fw.volatility_value, fw.completeness_pct,
         fw.confidence_band, fw.confidence_value
  FROM fanscore_windows fw
  WHERE fw.property_id = p.id
    AND fw.window_days = 30
    AND fw.model_version = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fw.as_of_day DESC
  LIMIT 1
) w30 ON true

-- 60-day window snapshot (avg only — used for trend comparison, not full detail)
LEFT JOIN LATERAL (
  SELECT fw.avg_score
  FROM fanscore_windows fw
  WHERE fw.property_id = p.id
    AND fw.window_days = 60
    AND fw.model_version = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fw.as_of_day DESC
  LIMIT 1
) w60 ON true

-- 90-day window snapshot (avg + trend)
LEFT JOIN LATERAL (
  SELECT fw.avg_score, fw.trend_value
  FROM fanscore_windows fw
  WHERE fw.property_id = p.id
    AND fw.window_days = 90
    AND fw.model_version = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fw.as_of_day DESC
  LIMIT 1
) w90 ON true

-- Team associations (for driver/athlete property types)
LEFT JOIN LATERAL (
  SELECT array_agg(pt.id   ORDER BY pr.valid_from DESC NULLS LAST, pt.name) AS team_ids,
         array_agg(pt.name ORDER BY pr.valid_from DESC NULLS LAST, pt.name) AS team_names
  FROM property_relationships pr
  JOIN properties pt ON pt.id = pr.to_id
  WHERE pr.from_id = p.id
    AND pr.relationship_type = ANY (ARRAY['driver_team', 'athlete_belongs_to_team'])
    AND p.property_type = ANY (ARRAY['driver'::property_type_enum, 'athlete'::property_type_enum])
) team_rel ON true

-- Driver/athlete associations (for team property type)
LEFT JOIN LATERAL (
  SELECT array_agg(pd.id   ORDER BY pd.name) AS driver_ids,
         array_agg(pd.name ORDER BY pd.name) AS driver_names
  FROM property_relationships pr
  JOIN properties pd ON pd.id = pr.from_id
  WHERE pr.to_id = p.id
    AND pr.relationship_type = ANY (ARRAY['driver_team', 'athlete_belongs_to_team'])
    AND p.property_type = 'team'::property_type_enum
) driver_rel ON true

-- Latest follower count per platform, summed
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(lf.followers_end_of_day), 0) AS total_followers_latest
  FROM (
    SELECT DISTINCT ON (ppdm.platform) ppdm.followers_end_of_day
    FROM property_platform_daily_metrics ppdm
    WHERE ppdm.property_id = p.id
    ORDER BY ppdm.platform, ppdm.metric_date DESC
  ) lf
) soc_foll ON true

-- 30-day social aggregations
LEFT JOIN LATERAL (
  SELECT
    SUM(ppdm.posts_count)                                          AS posts_30d,
    SUM(ppdm.likes + ppdm.comments + ppdm.shares + ppdm.saves)    AS total_interactions_30d,
    SUM(ppdm.followers_delta)                                      AS followers_net_30d,
    CASE
      WHEN SUM(ppdm.impressions) > 0
      THEN ROUND(SUM(ppdm.likes + ppdm.comments + ppdm.shares + ppdm.saves)
                 * 100.0 / SUM(ppdm.impressions), 2)
      ELSE NULL
    END                                                            AS engagement_rate_30d_pct
  FROM property_platform_daily_metrics ppdm
  WHERE ppdm.property_id = p.id
    AND ppdm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
) soc_30d ON true

-- Active platforms in the last 30 days
LEFT JOIN LATERAL (
  SELECT array_agg(DISTINCT ppdm.platform::text) AS platforms_active
  FROM property_platform_daily_metrics ppdm
  WHERE ppdm.property_id = p.id
    AND ppdm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
    AND ppdm.posts_count > 0
) soc_plat ON true

-- Exclude sub-event occurrence rows (structural events only)
WHERE NOT (
  p.property_type = 'event'::property_type_enum
  AND (p.metadata ->> 'event_role') = 'occurrence'
);


-- ============================================================
-- SECTION 6 : SEED RAW DATA
-- ============================================================
-- This DO block generates all synthetic raw data.
-- Runtime: 1-5 min depending on hardware.

DO $seed$
DECLARE
  v_data_start  date := '2025-09-01';
  v_data_end    date := '2026-02-28';
  v_prop_id     uuid;
  v_rec         record;
  v_num_plat    int;
  v_platforms   platform_enum[];
  v_plt         platform_enum;
  v_handle      text;
  v_baseline    bigint;
  v_acct_id     uuid;

  -- Driver names (50)
  v_dfirst text[] := ARRAY[
    'Alex','Ben','Carlos','Daniel','Erik','Felix','Gabriel','Hugo','Ivan','Jack',
    'Kai','Leo','Marco','Nico','Oscar','Pavel','Quinn','Rafael','Stefan','Tomas',
    'Uri','Viktor','Wei','Xavier','Yuki','Aiden','Blake','Callum','Dmitri','Elias',
    'Fabian','Gideon','Hamza','Ingvar','Jasper','Kian','Liam','Mateo','Nathan','Oliver',
    'Pedro','Rhys','Sven','Troy','Ulrich','Vince','Warren','Xander','Yohan','Zain'
  ];
  v_dlast text[] := ARRAY[
    'Storm','Ridge','Vega','Frost','Nash','Cole','Drake','Hayes','Fox','Lane',
    'Park','Stone','Wells','Grant','Hart','Kirk','North','Pace','Shaw','Steele',
    'Voss','Ward','Young','Blaze','Ito','Cross','Marsh','Reed','Orlov','Braun',
    'Reyes','Torres','Nasir','Holm','Flynn','Diaz','Wolfe','Cruz','Black','Crane',
    'Santos','Morgan','Lindgren','Bennett','Keller','Romano','Pierce','Dubois','Khalil','Sato'
  ];

  v_teams text[] := ARRAY[
    'Apex Racing','Thunder Motorsport','Nova Speed','Zenith Engineering','Ironforge Racing',
    'Velocity Works','Summit Dynamics','Eclipse Motorsports','Titan Racing','Horizon Speed',
    'Stormfront Racing','Pinnacle Motorsport','Forge Performance','Atlas Racing','Cobalt Engineering',
    'Vortex Speed','Granite Motors','Blaze Racing','Sterling Dynamics','Cypher Motorsports',
    'Prism Racing','Redline Engineering','Quantum Speed','Nexus Motorsport','Valor Racing',
    'Delta Force Racing','Aegis Motorsports','Orion Speed Works','Phoenix Racing','Sentinel Dynamics'
  ];

  v_events text[] := ARRAY[
    'Pacific Grand Prix','Atlantic Challenge','Summit 500','Desert Classic','Canyon Sprint',
    'Nordic Trophy','Metro Circuit Race','Harbor Grand Prix','Sierra Challenge','Coastal 300',
    'Glacier Cup','Valley Sprint','Skyline Grand Prix','Delta 400','Meridian Classic',
    'Alpine Challenge','Tidewater Trophy','Plateau Grand Prix','Cascade 200','Woodland Sprint'
  ];

  v_series text[] := ARRAY[
    'Global Touring Championship','Premier Sprint Series','Continental GT Cup','Pro Rally Championship',
    'Endurance World Series','Formula Regional Championship','Sports Prototype Challenge',
    'National Touring Series','Historic Racing Series','Electric Racing Championship',
    'Junior Formula Cup','GT Masters Series','Touring Car World Cup','Off-Road Challenge',
    'Stock Racing Championship','Open Wheel Premier League','Karting Pro Series',
    'Drift Championship Tour','Hill Climb Masters','Sim Racing Pro League'
  ];

  v_countries text[] := ARRAY[
    'US','UK','DE','FR','JP','BR','IT','ES','AU','NL','CA','MX','KR','SE','NO'
  ];

  v_all_platforms platform_enum[] := ARRAY['instagram','tiktok','youtube','x','linkedin']::platform_enum[];

BEGIN
  RAISE NOTICE 'Seeding properties...';

  -- === DRIVERS (50) ===
  FOR i IN 1..50 LOOP
    INSERT INTO properties (name, property_type, country, bio)
    VALUES (
      v_dfirst[i] || ' ' || v_dlast[i],
      'driver',
      v_countries[((i-1) % 15) + 1],
      'Professional racing driver'
    ) RETURNING id INTO v_prop_id;

    -- 1-3 platforms (weighted: 30% get 1, 40% get 2, 30% get 3)
    v_num_plat := CASE
      WHEN random() < 0.3 THEN 1
      WHEN random() < 0.75 THEN 2
      ELSE 3
    END;
    SELECT array_agg(p ORDER BY random()) INTO v_platforms
    FROM unnest(v_all_platforms) p LIMIT v_num_plat;
    -- workaround: select with limit
    v_platforms := (SELECT array_agg(sub.p) FROM (SELECT unnest(v_all_platforms) AS p ORDER BY random() LIMIT v_num_plat) sub);

    FOREACH v_plt IN ARRAY v_platforms LOOP
      v_baseline := (5000 + floor(random() * 495000))::bigint;
      INSERT INTO accounts (property_id, platform, handle, followers_baseline, is_verified, is_suspect_bot)
      VALUES (
        v_prop_id, v_plt,
        lower(replace(v_dfirst[i] || v_dlast[i], ' ', '')) || '_' || v_plt::text,
        v_baseline,
        random() > 0.35,
        random() < 0.08
      );
    END LOOP;
  END LOOP;

  -- === TEAMS (30) ===
  FOR i IN 1..30 LOOP
    INSERT INTO properties (name, property_type, country, bio)
    VALUES (v_teams[i], 'team', v_countries[((i-1) % 15) + 1], 'Professional racing team')
    RETURNING id INTO v_prop_id;

    v_num_plat := CASE WHEN random() < 0.15 THEN 1 WHEN random() < 0.55 THEN 2 ELSE 3 END;
    v_platforms := (SELECT array_agg(sub.p) FROM (SELECT unnest(v_all_platforms) AS p ORDER BY random() LIMIT v_num_plat) sub);

    FOREACH v_plt IN ARRAY v_platforms LOOP
      v_baseline := (20000 + floor(random() * 480000))::bigint;
      INSERT INTO accounts (property_id, platform, handle, followers_baseline, is_verified, is_suspect_bot)
      VALUES (
        v_prop_id, v_plt,
        lower(replace(replace(v_teams[i], ' ', '_'), '''', '')) || '_' || v_plt::text,
        v_baseline, random() > 0.2, random() < 0.06
      );
    END LOOP;
  END LOOP;

  -- === EVENTS (20) ===
  FOR i IN 1..20 LOOP
    INSERT INTO properties (name, property_type, country, bio, event_start_date)
    VALUES (
      v_events[i], 'event', v_countries[((i-1) % 15) + 1], 'Major motorsport event',
      v_data_start + ((i-1) * 9 + floor(random() * 5))::int  -- spread across 6 months
    )
    RETURNING id INTO v_prop_id;

    v_num_plat := CASE WHEN random() < 0.2 THEN 1 WHEN random() < 0.6 THEN 2 ELSE 3 END;
    v_platforms := (SELECT array_agg(sub.p) FROM (SELECT unnest(v_all_platforms) AS p ORDER BY random() LIMIT v_num_plat) sub);

    FOREACH v_plt IN ARRAY v_platforms LOOP
      v_baseline := (10000 + floor(random() * 290000))::bigint;
      INSERT INTO accounts (property_id, platform, handle, followers_baseline, is_verified, is_suspect_bot)
      VALUES (
        v_prop_id, v_plt,
        lower(replace(replace(v_events[i], ' ', '_'), '''', '')) || '_' || v_plt::text,
        v_baseline, random() > 0.25, random() < 0.05
      );
    END LOOP;
  END LOOP;

  -- === SERIES (20) ===
  FOR i IN 1..20 LOOP
    INSERT INTO properties (name, property_type, country, bio)
    VALUES (v_series[i], 'series', v_countries[((i-1) % 15) + 1], 'Motorsport racing series')
    RETURNING id INTO v_prop_id;

    v_num_plat := CASE WHEN random() < 0.1 THEN 1 WHEN random() < 0.45 THEN 2 ELSE 3 END;
    v_platforms := (SELECT array_agg(sub.p) FROM (SELECT unnest(v_all_platforms) AS p ORDER BY random() LIMIT v_num_plat) sub);

    FOREACH v_plt IN ARRAY v_platforms LOOP
      v_baseline := (50000 + floor(random() * 450000))::bigint;
      INSERT INTO accounts (property_id, platform, handle, followers_baseline, is_verified, is_suspect_bot)
      VALUES (
        v_prop_id, v_plt,
        lower(replace(replace(v_series[i], ' ', '_'), '''', '')) || '_' || v_plt::text,
        v_baseline, random() > 0.15, random() < 0.04
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Properties and accounts seeded. Generating posts...';

  -- === GENERATE POSTS ===
  INSERT INTO raw_posts (account_id, platform, posted_at, content_type, caption, is_viral)
  SELECT
    a.id,
    a.platform,
    d.day::date + (interval '7 hours' + random() * interval '14 hours')
               + (slot - 1) * interval '2 hours' + random() * interval '30 minutes',
    (ARRAY['image','video','carousel','reel','story']::content_type_enum[])[floor(random()*5+1)::int],
    'Content by ' || p.name || ' #' || floor(random()*99999)::int,
    random() < 0.02  -- 2% viral
  FROM accounts a
  JOIN properties p ON p.id = a.property_id
  CROSS JOIN generate_series(v_data_start, v_data_end, '1 day'::interval) AS d(day)
  CROSS JOIN generate_series(1, 4) AS slot
  WHERE
    slot <= CASE p.property_type
      WHEN 'driver' THEN 1
      WHEN 'team'   THEN 2
      WHEN 'event'  THEN
        CASE WHEN d.day::date BETWEEN (p.event_start_date - 14) AND (p.event_start_date + 7) THEN 4 ELSE 1 END
      WHEN 'series' THEN 2
      ELSE 1
    END
    AND random() < CASE p.property_type
      WHEN 'driver' THEN 0.57
      WHEN 'team'   THEN 0.46
      WHEN 'event'  THEN
        CASE WHEN d.day::date BETWEEN (p.event_start_date - 14) AND (p.event_start_date + 7) THEN 0.75 ELSE 0.07 END
      WHEN 'series' THEN
        CASE WHEN extract(dow FROM d.day::date) IN (5,6,0)
              AND (extract(day FROM d.day::date) BETWEEN 8 AND 14
                OR extract(day FROM d.day::date) BETWEEN 22 AND 28)
             THEN 0.80 ELSE 0.36 END
      ELSE 0.3
    END;

  RAISE NOTICE 'Posts generated. Generating post metrics...';

  -- === GENERATE DAILY POST METRICS ===
  INSERT INTO raw_post_daily_metrics (post_id, metric_date, impressions, reach, likes, comments, shares, saves, clicks, watch_seconds)
  SELECT
    rp.id,
    (rp.posted_at::date + day_off)::date,
    -- impressions
    greatest(1, (base_imp * decay * viral_m * (0.8 + random()*0.4))::bigint),
    -- reach (55-90% of impressions)
    greatest(1, (base_imp * decay * viral_m * (0.8 + random()*0.4) * (0.55 + random()*0.35))::bigint),
    -- likes
    greatest(0, (base_imp * decay * viral_m * like_r * (0.5 + random()))::bigint),
    -- comments
    greatest(0, (base_imp * decay * viral_m * comm_r * (0.4 + random()*1.2))::bigint),
    -- shares
    greatest(0, (base_imp * decay * viral_m * share_r * (0.3 + random()*1.4))::bigint),
    -- saves
    greatest(0, (base_imp * decay * viral_m * save_r * (0.3 + random()*1.4))::bigint),
    -- clicks
    greatest(0, (base_imp * decay * viral_m * click_r * (0.4 + random()*1.2))::bigint),
    -- watch_seconds
    CASE WHEN rp.content_type IN ('video','reel')
         THEN greatest(0, (base_imp * decay * viral_m * 0.3 * watch_avg * (0.5 + random()))::bigint)
         ELSE 0
    END
  FROM raw_posts rp
  JOIN accounts a ON a.id = rp.account_id
  CROSS JOIN LATERAL (
    SELECT
      gs AS day_off,
      1.0 / power(1.0 + gs, 0.8) AS decay
    FROM generate_series(0, 13) AS gs
    WHERE (rp.posted_at::date + gs) <= v_data_end
  ) d
  CROSS JOIN LATERAL (
    SELECT
      greatest(10, a.followers_baseline * (0.05 + random()*0.15))::numeric AS base_imp,
      CASE WHEN rp.is_viral THEN 5.0 + random()*15.0 ELSE 1.0 END AS viral_m,
      CASE WHEN a.is_suspect_bot THEN 0.12 + random()*0.08 ELSE 0.025 + random()*0.045 END AS like_r,
      CASE WHEN a.is_suspect_bot THEN 0.002 + random()*0.003 ELSE 0.004 + random()*0.012 END AS comm_r,
      0.002 + random()*0.008 AS share_r,
      0.003 + random()*0.007 AS save_r,
      0.005 + random()*0.015 AS click_r,
      15.0 + random()*45.0 AS watch_avg
  ) params;

  RAISE NOTICE 'Post metrics generated. Generating follower snapshots...';

  -- === GENERATE FOLLOWER SNAPSHOTS ===
  INSERT INTO raw_account_followers (account_id, metric_date, followers_count, followers_delta)
  SELECT
    a.id,
    d.day::date,
    greatest(100,
      a.followers_baseline
      + (day_num * (a.followers_baseline * 0.0003 * (0.5 + random())))::bigint  -- gradual organic growth
      + (CASE WHEN random() < 0.03 THEN (a.followers_baseline * 0.01 * (random() - 0.3))::bigint ELSE 0 END)  -- occasional jumps
    ),
    greatest(-500,
      (a.followers_baseline * 0.0003 * (0.5 + random())
       + CASE WHEN random() < 0.03 THEN a.followers_baseline * 0.01 * (random() - 0.3) ELSE 0 END
      )::bigint
    )
  FROM accounts a
  CROSS JOIN LATERAL (
    SELECT
      d_inner.day,
      (d_inner.day::date - v_data_start)::int AS day_num
    FROM generate_series(v_data_start, v_data_end, '1 day'::interval) d_inner(day)
  ) d;

  RAISE NOTICE 'Follower snapshots generated. Seed complete.';
END
$seed$;


-- ============================================================
-- SECTION 7 : REGISTER MODEL + EXECUTE DERIVED PIPELINE
-- ============================================================

-- Register scoring model v1
INSERT INTO fanscore_models (model_version, is_active, description, weights_json)
VALUES (
  'v1.0',
  true,
  'Initial FanScore model: 65% engagement norm, 15% growth, 20% consistency with integrity penalties',
  '{"norm_weight": 0.65, "growth_weight": 0.15, "consistency_weight": 0.20}'::jsonb
) ON CONFLICT (model_version) DO NOTHING;

-- Run rollups for entire period
SELECT compute_daily_rollups('2025-09-01'::date, '2026-02-28'::date);

-- Run fanscore for entire period
SELECT compute_fanscore_daily('2025-09-01'::date, '2026-02-28'::date, 'v1.0');

-- Run windows for the final date
SELECT compute_fanscore_windows('2026-02-28'::date, 'v1.0');


-- ============================================================
-- SECTION 8 : RUN BOOK (daily operations)
-- ============================================================
/*
  DAILY OPERATIONS (run in order):

  1. Ingest raw data into raw_posts, raw_post_daily_metrics,
     and raw_account_followers (via your ETL pipeline or API).

  2. Compute rollups for today:
       SELECT compute_daily_rollups(CURRENT_DATE, CURRENT_DATE);

  3. Compute FanScore for today:
       SELECT compute_fanscore_daily(CURRENT_DATE, CURRENT_DATE, 'v1.0');

  4. Compute rolling windows as of today:
       SELECT compute_fanscore_windows(CURRENT_DATE, 'v1.0');

  5. (Optional) Check for anomalies:
       SELECT property_id, metric_date, anomaly_flags
       FROM property_platform_daily_metrics
       WHERE metric_date = CURRENT_DATE
         AND array_length(anomaly_flags, 1) > 0;

  6. (Optional) Check suppressed scores:
       SELECT property_id, metric_date, suppression_reason
       FROM fanscore_daily
       WHERE metric_date = CURRENT_DATE
         AND suppression_reason IS NOT NULL;

  MODEL VERSIONING:
  - To deploy a new model, insert into fanscore_models with is_active = false.
  - Backfill: SELECT compute_fanscore_daily('2025-09-01', '2026-02-28', 'v2.0');
  - Compare v1.0 vs v2.0 using fanscore_daily table.
  - When ready, UPDATE fanscore_models SET is_active = false WHERE model_version = 'v1.0';
  -            UPDATE fanscore_models SET is_active = true  WHERE model_version = 'v2.0';
  - Views automatically reflect the active model.

  USEFUL QUERIES:

  -- Top 10 properties by current FanScore:
  SELECT property_name, property_type, avg_score_30d, confidence_band_30d
  FROM v_property_summary_current
  WHERE suppression_reason_30d IS NULL
  ORDER BY avg_score_30d DESC
  LIMIT 10;

  -- Properties with declining trend:
  SELECT property_name, property_type, avg_score_30d, trend_value_30d
  FROM v_property_summary_current
  WHERE trend_value_30d < 0
  ORDER BY trend_value_30d ASC;

  -- Engagement breakdown for a property:
  SELECT metric_date, platform, likes, comments, shares, impressions
  FROM property_platform_daily_metrics
  WHERE property_id = '<uuid>'
  ORDER BY metric_date DESC, platform;
*/
