/* ── FanScore v2.0 activation ─────────────────────────────────────────────────

   This migration does three things:

   1. Creates compute_fanscore_windows_v2()
      A PostgreSQL function called by compute-fanscore-daily after writing
      daily scores. Computes 30/60/90d rolling aggregates from fanscore_daily
      v2.0 history and upserts them into fanscore_windows.

   2. Registers v2.0 in fanscore_models
      Deactivates v1.0. v_active_model view automatically returns v2.0.
      This is the cutover point: the UI switches from legacy to live data.

   3. Replaces v_property_summary_current
      Updates the lateral joins that previously read from
      property_platform_daily_metrics (stale legacy data) to instead read
      from social_rollups_daily (live daily ingestion).

      Output columns are unchanged — no UI code changes required.

   ── Phase-out note ───────────────────────────────────────────────────────────

   Legacy v1.0 rows in fanscore_daily and fanscore_windows are NOT deleted.
   They are simply inactive (model_version filter in the view will skip them).
   Once v2.0 has 30+ days of clean history, v1.0 rows may be archived via a
   separate migration.

────────────────────────────────────────────────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════════════════════
   1. compute_fanscore_windows_v2
   ═══════════════════════════════════════════════════════════════════════════
   Computes 30d / 60d / 90d rolling window aggregates from fanscore_daily
   v2.0 rows and upserts them into fanscore_windows.

   Called by the compute-fanscore-daily edge function via supabase.rpc().

   Window metrics:
     avg_score        — mean of all daily scores in window
     median_score     — percentile_cont(0.5) of scores in window
     trend_value      — linear regression slope (score / day) via regr_slope()
                        null when < 2 data points
     volatility_value — standard deviation of scores in window
                        null when < 2 data points
     completeness_pct — (days with data / window_days) × 100
     confidence_band  — based on completeness:
                        ≥ 80% → High, ≥ 40% → Medium, < 40% → Low
                        Note: even day-1 scores generate Low-confidence windows.
                        Confidence grows naturally as history accumulates.
   ═══════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION compute_fanscore_windows_v2(
  p_model_version  text DEFAULT 'v2.0',
  p_as_of_day      date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  w int;
BEGIN
  FOREACH w IN ARRAY ARRAY[30, 60, 90] LOOP

    INSERT INTO fanscore_windows (
      id,
      property_id,
      as_of_day,
      window_days,
      model_version,
      avg_score,
      median_score,
      trend_value,
      volatility_value,
      anomaly_days_count,
      completeness_pct,
      confidence_band,
      confidence_value,
      computed_at,
      suppression_reason
    )

    -- CTE: annotate each daily row with a day_index for regr_slope
    -- day_index = 0 for the earliest day in the window, N for the most recent.
    WITH daily AS (
      SELECT
        fd.property_id,
        fd.fanscore_value,
        EXTRACT(
          DAY FROM fd.metric_date
          - MIN(fd.metric_date) OVER (PARTITION BY fd.property_id)
        )::float AS day_idx
      FROM fanscore_daily fd
      WHERE fd.model_version  = p_model_version
        AND fd.fanscore_value IS NOT NULL   -- only scored rows, skip suppressed
        AND fd.metric_date BETWEEN
              (p_as_of_day - (w || ' days')::interval)::date
              AND p_as_of_day
    )

    SELECT
      gen_random_uuid()                AS id,
      d.property_id,
      p_as_of_day                      AS as_of_day,
      w                                AS window_days,
      p_model_version                  AS model_version,

      -- Average score over window
      ROUND(AVG(d.fanscore_value)::numeric, 3)                    AS avg_score,

      -- Median score
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY d.fanscore_value)::numeric,
        3
      )                                                            AS median_score,

      -- Linear trend: change in score per day (regression slope)
      -- null if < 2 data points (e.g. day 1)
      CASE
        WHEN COUNT(*) >= 2
        THEN ROUND(REGR_SLOPE(d.fanscore_value, d.day_idx)::numeric, 4)
        ELSE NULL
      END                                                          AS trend_value,

      -- Score volatility: std deviation
      -- null if < 2 data points
      CASE
        WHEN COUNT(*) >= 2
        THEN ROUND(STDDEV(d.fanscore_value)::numeric, 3)
        ELSE NULL
      END                                                          AS volatility_value,

      -- Anomaly day count (reserved for future use; 0 until we have enough
      -- history to define a meaningful anomaly threshold)
      0                                                            AS anomaly_days_count,

      -- Completeness: fraction of the window covered by real data
      ROUND(COUNT(*)::numeric * 100.0 / w, 1)                     AS completeness_pct,

      -- Confidence band derived from completeness
      -- Low even on day 1 (honest). Grows to Medium at 40%, High at 80%.
      CASE
        WHEN COUNT(*)::float / w >= 0.80 THEN 'High'
        WHEN COUNT(*)::float / w >= 0.40 THEN 'Medium'
        ELSE                                   'Low'
      END                                                          AS confidence_band,

      -- Numeric confidence value for downstream computations
      CASE
        WHEN COUNT(*)::float / w >= 0.80 THEN 0.90
        WHEN COUNT(*)::float / w >= 0.40 THEN 0.65
        ELSE                                   0.35
      END                                                          AS confidence_value,

      NOW()                                                        AS computed_at,
      NULL                                                         AS suppression_reason

    FROM daily d
    GROUP BY d.property_id

    -- Upsert: replace if recomputed for same day/window/model
    ON CONFLICT (property_id, as_of_day, window_days, model_version)
    DO UPDATE SET
      avg_score          = EXCLUDED.avg_score,
      median_score       = EXCLUDED.median_score,
      trend_value        = EXCLUDED.trend_value,
      volatility_value   = EXCLUDED.volatility_value,
      anomaly_days_count = EXCLUDED.anomaly_days_count,
      completeness_pct   = EXCLUDED.completeness_pct,
      confidence_band    = EXCLUDED.confidence_band,
      confidence_value   = EXCLUDED.confidence_value,
      computed_at        = EXCLUDED.computed_at,
      suppression_reason = EXCLUDED.suppression_reason;

  END LOOP;
END;
$$;

COMMENT ON FUNCTION compute_fanscore_windows_v2(text, date) IS
  'Computes 30/60/90d rolling window aggregates from fanscore_daily v2.0 rows. '
  'Called by compute-fanscore-daily edge function. Uses regr_slope for trend. '
  'Confidence grows from Low → Medium → High as completeness reaches 40% / 80%.';


/* ═══════════════════════════════════════════════════════════════════════════
   2. Register v2.0 model — activate it, deactivate v1.0
   ═══════════════════════════════════════════════════════════════════════════
   v_active_model reads: SELECT model_version FROM fanscore_models WHERE is_active = true
   So this is the cutover: after this, the UI reads v2.0 FanScore data.
   ═══════════════════════════════════════════════════════════════════════════ */

-- Deactivate legacy v1.0
UPDATE fanscore_models
SET    is_active = false
WHERE  model_version = 'v1.0';

-- Register v2.0 as active
INSERT INTO fanscore_models (
  model_version,
  is_active,
  description,
  weights_json
)
VALUES (
  'v2.0',
  true,
  'Live social ingestion model. Reads from social_rollups_daily. '
  'Components: 40% audience size (log-scale), 35% growth momentum, 25% platform coverage. '
  'Confidence: Low/Medium/High from snapshot history depth. '
  'No fake precision — properties without social data are suppressed, not zeroed.',
  jsonb_build_object(
    'audience_weight', 0.40,
    'momentum_weight', 0.35,
    'coverage_weight', 0.25,
    'audience_log_ceiling', 10000000,
    'momentum_neutral_when_no_delta', 0.50,
    'confidence_thresholds', jsonb_build_object(
      'High',   0.80,
      'Medium', 0.40,
      'Low',    0.00
    )
  )
)
ON CONFLICT DO NOTHING;


/* ═══════════════════════════════════════════════════════════════════════════
   3. Replace v_property_summary_current
   ═══════════════════════════════════════════════════════════════════════════
   Key changes vs the previous definition:

   soc_foll lateral join:
     BEFORE: property_platform_daily_metrics (legacy, stale since Mar 2026)
     AFTER:  social_rollups_daily (live — updated daily by ingest pipeline)
             Takes DISTINCT ON platform, orders by as_of_date DESC.

   soc_30d lateral join:
     BEFORE: property_platform_daily_metrics aggregate over last 30d
     AFTER:  social_rollups_daily aggregate
             - followers_net_30d: SUM(followers_delta_30d) — null when no history
             - posts_30d: SUM(tweet_count_delta_30d) for X; other platforms TBD
             - total_interactions_30d: NULL (X API v2 free tier has no interaction data)
             - engagement_rate_30d_pct: NULL (no impression data available)

   soc_plat lateral join:
     BEFORE: property_platform_daily_metrics distinct platforms
     AFTER:  social_rollups_daily distinct platforms in last 30 days

   All output column NAMES are preserved — no UI code changes required.
   ═══════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE VIEW v_property_summary_current AS
SELECT
  p.id                       AS property_id,
  p.name                     AS property_name,
  p.property_type,
  p.country,
  p.event_start_date,

  -- FanScore metadata (latest row for active model)
  fd.metric_date             AS as_of_day,
  fd.model_version,

  -- 30-day window aggregates (score, trend, confidence)
  w30.avg_score              AS avg_score_30d,
  w30.median_score           AS median_score_30d,
  w30.trend_value            AS trend_value_30d,
  w30.volatility_value       AS volatility_value_30d,
  w30.completeness_pct       AS completeness_pct_30d,
  w30.confidence_band        AS confidence_band_30d,
  w30.confidence_value       AS confidence_value_30d,

  -- Suppression signal: if no confidence band, no valid window exists
  CASE
    WHEN w30.confidence_band IS NULL THEN 'Insufficient data'
    ELSE NULL
  END                        AS suppression_reason_30d,

  -- Longer-window scores (for trend comparison)
  w60.avg_score              AS avg_score_60d,
  w90.avg_score              AS avg_score_90d,
  w90.trend_value            AS trend_value_90d,

  -- Team / driver relationships
  team_rel.team_ids,
  team_rel.team_names,
  driver_rel.driver_ids,
  driver_rel.driver_names,

  p.bio,
  p.slug,

  -- Live audience total (from social_rollups_daily)
  soc_foll.total_followers_latest,

  -- 30-day social metrics (live where available; null where not computable)
  soc_30d.followers_net_30d,
  soc_30d.posts_30d,
  soc_30d.total_interactions_30d,
  soc_30d.engagement_rate_30d_pct,

  -- Active social platforms
  soc_plat.platforms_active,

  p.sport,
  p.region,
  p.city,
  p.visible_in_ui

FROM properties p

-- ── Latest FanScore date for this property (active model only) ──────────────
LEFT JOIN LATERAL (
  SELECT fd2.metric_date, fd2.model_version
  FROM   fanscore_daily fd2
  WHERE  fd2.property_id    = p.id
    AND  fd2.model_version  = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fd2.metric_date DESC
  LIMIT 1
) fd ON true

-- ── 30-day window ────────────────────────────────────────────────────────────
LEFT JOIN LATERAL (
  SELECT fw.avg_score, fw.median_score, fw.trend_value,
         fw.volatility_value, fw.completeness_pct,
         fw.confidence_band,  fw.confidence_value
  FROM   fanscore_windows fw
  WHERE  fw.property_id   = p.id
    AND  fw.window_days   = 30
    AND  fw.model_version = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fw.as_of_day DESC
  LIMIT 1
) w30 ON true

-- ── 60-day window (score only) ───────────────────────────────────────────────
LEFT JOIN LATERAL (
  SELECT fw.avg_score
  FROM   fanscore_windows fw
  WHERE  fw.property_id   = p.id
    AND  fw.window_days   = 60
    AND  fw.model_version = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fw.as_of_day DESC
  LIMIT 1
) w60 ON true

-- ── 90-day window (score + long trend) ──────────────────────────────────────
LEFT JOIN LATERAL (
  SELECT fw.avg_score, fw.trend_value
  FROM   fanscore_windows fw
  WHERE  fw.property_id   = p.id
    AND  fw.window_days   = 90
    AND  fw.model_version = (SELECT v_active_model.model_version FROM v_active_model)
  ORDER BY fw.as_of_day DESC
  LIMIT 1
) w90 ON true

-- ── Team memberships (driver / athlete → team) ───────────────────────────────
LEFT JOIN LATERAL (
  SELECT
    ARRAY_AGG(pt.id   ORDER BY pr.valid_from DESC NULLS LAST, pt.name) AS team_ids,
    ARRAY_AGG(pt.name ORDER BY pr.valid_from DESC NULLS LAST, pt.name) AS team_names
  FROM property_relationships pr
  JOIN properties pt ON pt.id = pr.to_id
  WHERE pr.from_id = p.id
    AND pr.relationship_type = ANY (ARRAY['driver_team'::text, 'athlete_belongs_to_team'::text])
    AND p.property_type      = ANY (ARRAY['driver'::property_type_enum, 'athlete'::property_type_enum])
) team_rel ON true

-- ── Driver memberships (team → drivers / athletes) ───────────────────────────
LEFT JOIN LATERAL (
  SELECT
    ARRAY_AGG(pd.id   ORDER BY pd.name) AS driver_ids,
    ARRAY_AGG(pd.name ORDER BY pd.name) AS driver_names
  FROM property_relationships pr
  JOIN properties pd ON pd.id = pr.from_id
  WHERE pr.to_id              = p.id
    AND pr.relationship_type  = ANY (ARRAY['driver_team'::text, 'athlete_belongs_to_team'::text])
    AND p.property_type       = 'team'::property_type_enum
) driver_rel ON true

-- ── Total followers (live — from social_rollups_daily) ───────────────────────
-- Takes the most recent snapshot per platform and sums across platforms.
-- Replaces the legacy property_platform_daily_metrics join.
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(latest.followers_count), 0) AS total_followers_latest
  FROM (
    SELECT DISTINCT ON (srd.platform)
           srd.followers_count
    FROM   social_rollups_daily srd
    WHERE  srd.property_id = p.id
    ORDER BY srd.platform, srd.as_of_date DESC
  ) latest
) soc_foll ON true

-- ── 30-day social metrics (live — from social_rollups_daily) ─────────────────
-- followers_net_30d:        net follower change (null if no 30d delta yet)
-- posts_30d:                tweet count delta for X; other platforms TBD
-- total_interactions_30d:   null — not available from X API v2 free tier
-- engagement_rate_30d_pct:  null — no impression data available
LEFT JOIN LATERAL (
  SELECT
    SUM(srd.followers_delta_30d)::bigint   AS followers_net_30d,
    SUM(COALESCE(srd.tweet_count_delta_30d, 0))::bigint AS posts_30d,
    NULL::numeric                          AS total_interactions_30d,
    NULL::numeric                          AS engagement_rate_30d_pct
  FROM social_rollups_daily srd
  WHERE srd.property_id = p.id
    AND srd.as_of_date >= CURRENT_DATE - INTERVAL '30 days'
) soc_30d ON true

-- ── Active platforms (live — from social_rollups_daily) ──────────────────────
LEFT JOIN LATERAL (
  SELECT ARRAY_AGG(DISTINCT srd.platform::text) AS platforms_active
  FROM   social_rollups_daily srd
  WHERE  srd.property_id = p.id
    AND  srd.as_of_date >= CURRENT_DATE - INTERVAL '30 days'
) soc_plat ON true

-- Exclude event occurrences (internal sub-events, not top-level properties)
WHERE NOT (
  p.property_type = 'event'::property_type_enum
  AND (p.metadata ->> 'event_role'::text) = 'occurrence'::text
);

COMMENT ON VIEW v_property_summary_current IS
  'Primary property summary view. Reads FanScore from fanscore_windows (active model). '
  'Social metrics from social_rollups_daily (live ingestion). '
  'Active model controlled by fanscore_models.is_active via v_active_model view.';
