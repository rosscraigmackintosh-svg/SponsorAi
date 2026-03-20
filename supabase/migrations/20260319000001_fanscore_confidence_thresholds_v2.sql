/* ── FanScore confidence threshold alignment ──────────────────────────────────

   Updates compute_fanscore_windows_v2() to use absolute day-count thresholds
   instead of percentage-of-window thresholds.

   BEFORE (percentage-based):
     ≥ 80% of window → High  (= 24+ days in a 30d window)
     ≥ 40% of window → Medium (= 12+ days in a 30d window)
     < 40%           → Low

   AFTER (absolute day-count):
     ≥ 30 days of valid data → High
     ≥  7 days of valid data → Medium
     <  7 days of valid data → Low

   Rationale:
     This aligns the window-based confidence bands with:
     (a) the edge function's rollup confidence definition (7d / 30d baselines)
     (b) the product requirement: Low = 1–6 days, Medium = 7–29 days, High = 30+

   Side effect:
     Previously, a property with 25 days of data would show "High" (83% >= 80%).
     After this migration it correctly shows "Medium" until 30 full days are covered.
     This is more honest and matches user-facing copy ("Early signal", etc).

   Backfill-safe:
     When historical data is backfilled, confidence automatically promotes from
     Low → Medium → High as the COUNT(*) of valid rows grows. No code change needed.

────────────────────────────────────────────────────────────────────────────── */


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
    -- CTE: date - date returns integer in PostgreSQL; cast to float for regr_slope
    WITH daily AS (
      SELECT
        fd.property_id,
        fd.fanscore_value,
        (fd.metric_date - MIN(fd.metric_date) OVER (PARTITION BY fd.property_id))::float
          AS day_idx
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

      -- Anomaly day count (reserved for future use)
      0                                                            AS anomaly_days_count,

      -- Completeness: fraction of the window covered by real data
      ROUND(COUNT(*)::numeric * 100.0 / w, 1)                     AS completeness_pct,

      -- Confidence band — absolute day-count thresholds.
      --   Aligned with edge function rollup confidence and product spec:
      --   Low = 1–6 days, Medium = 7–29 days, High = 30+ days.
      --   This is honest: a property with 25 days is Medium, not High.
      --   Automatically promotes as backfilled history accumulates.
      CASE
        WHEN COUNT(*) >= 30 THEN 'High'
        WHEN COUNT(*) >= 7  THEN 'Medium'
        ELSE                     'Low'
      END                                                          AS confidence_band,

      -- Numeric confidence value for downstream computations
      CASE
        WHEN COUNT(*) >= 30 THEN 0.90
        WHEN COUNT(*) >= 7  THEN 0.65
        ELSE                     0.35
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
  'Confidence band uses absolute day counts: Low = 1-6 days, Medium = 7-29 days, High = 30+ days. '
  'Backfill-safe: confidence promotes automatically as history accumulates.';
