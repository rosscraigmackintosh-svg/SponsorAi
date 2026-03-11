-- ============================================================
-- SponsorAI  --  UI Surface Test Plan  (v2)
-- Target DB  : kyjpxxyaebxvpprugmof  |  Model: v1.0
-- As-of      : 2026-02-28
-- Indexes    : idx_fsd_prop_date_model, idx_fsw_prop_day_win,
--              idx_ppdm_prop_plat_date
-- ============================================================
-- Reference UUIDs (real, verified against live DB):
--   Eclipse Motorsports  : 25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761  team   ES
--   Warren Pierce        : e3bc0100-3ba3-47ab-a8a9-e1667ef5baf1  driver UK
--   Stormfront Racing    : 0a56c8dc-92a4-41fc-8cad-0b767528834e  team   CA
--   Glacier Cup          : 3a5c5234-b5a0-4a6f-a3b8-186ab2431d28  event  suppressed (0% coverage)
--   Delta 400            : 73b52f81-666a-4fbd-a1c3-a5bc6fcd8d74  event  suppressed (23% coverage)
-- ============================================================
-- Run each numbered block independently.
-- ============================================================


-- ============================================================
-- TEST 1  --  Smoke: counts, date ranges, null checks
-- Purpose : Confirm all pipeline layers have data, date ranges
--           align, and no critical integrity violations exist.
-- Perf    : table-scan acceptable (run once, not in app path).
-- Pass    : See expected values in comments beside each column.
-- ============================================================

SELECT
  -- Layer counts
  (SELECT COUNT(*) FROM properties)                                                  AS prop_count,          -- 120
  (SELECT COUNT(*) FROM accounts)                                                    AS account_count,       -- ~239
  (SELECT COUNT(*) FROM raw_posts)                                                   AS raw_post_count,      -- ~29 000
  (SELECT COUNT(*) FROM raw_post_daily_metrics)                                      AS raw_metric_count,    -- ~396 000
  (SELECT COUNT(*) FROM property_platform_daily_metrics)                             AS rollup_count,        -- ~43 000

  -- Date coverage
  (SELECT MIN(metric_date) FROM property_platform_daily_metrics)                     AS rollup_min,          -- 2025-09-01
  (SELECT MAX(metric_date) FROM property_platform_daily_metrics)                     AS rollup_max,          -- 2026-02-28

  -- FanScore daily
  (SELECT COUNT(*)            FROM fanscore_daily WHERE model_version = 'v1.0')      AS fsd_total,           -- ~21 720
  (SELECT MIN(metric_date)    FROM fanscore_daily WHERE model_version = 'v1.0')      AS fsd_min,             -- 2025-09-01
  (SELECT MAX(metric_date)    FROM fanscore_daily WHERE model_version = 'v1.0')      AS fsd_max,             -- 2026-02-28
  -- Suppressed: suppression_reason IS NOT NULL is the canonical signal.
  -- Since migration 007, fanscore_value IS NULL on suppressed rows (not 0).
  (SELECT COUNT(*) FROM fanscore_daily
   WHERE model_version = 'v1.0' AND suppression_reason IS NOT NULL)                 AS fsd_suppressed,      -- >0 (early sparse days)
  -- Verify migration 007 fix: suppressed rows must have NULL fanscore_value, not 0
  (SELECT COUNT(*) FROM fanscore_daily
   WHERE model_version = 'v1.0'
     AND suppression_reason IS NOT NULL
     AND fanscore_value IS NOT NULL)                                                 AS suppressed_non_null, -- MUST be 0

  -- FanScore windows (latest as_of_day)
  (SELECT COUNT(*) FROM fanscore_windows
   WHERE as_of_day = '2026-02-28' AND model_version = 'v1.0')                       AS fw_total,            -- ~358
  (SELECT COUNT(*) FROM fanscore_windows
   WHERE as_of_day = '2026-02-28' AND window_days = 30 AND model_version = 'v1.0') AS fw_30d,              -- ~119 (one property no coverage)
  (SELECT COUNT(*) FROM fanscore_windows
   WHERE as_of_day = '2026-02-28' AND window_days = 60 AND model_version = 'v1.0') AS fw_60d,              -- ~119-120
  (SELECT COUNT(*) FROM fanscore_windows
   WHERE as_of_day = '2026-02-28' AND window_days = 90 AND model_version = 'v1.0') AS fw_90d,              -- ~119-120

  -- View shape
  (SELECT COUNT(*) FROM v_property_summary_current)                                 AS view_row_count,      -- 120
  (SELECT COUNT(*) FROM v_property_summary_current WHERE property_type IS NULL)     AS view_missing_type;   -- MUST be 0


-- ============================================================
-- TEST 2  --  Explore Grid payload
-- Purpose : Primary listing surface. One row per property,
--           sorted by avg_score_30d for UI convenience.
-- Index   : idx_fsw_prop_day_win used in view CTE.
-- Pass    : 24 rows; all required columns typed correctly;
--           out_of_range = 0; has_type = 24.
-- ============================================================

SELECT
  v.property_id,
  v.property_name,
  v.property_type,              -- required for type badge
  v.country,
  v.as_of_day,
  v.model_version,
  -- 30d primary signal
  v.avg_score_30d,
  v.trend_value_30d,
  v.confidence_band_30d,
  v.confidence_value_30d,
  v.completeness_pct_30d,
  v.suppression_reason_30d,     -- non-null = suppressed; show warning, never crash
  -- supporting context
  v.avg_score_60d,
  v.avg_score_90d,
  v.trend_value_90d
FROM v_property_summary_current v
ORDER BY v.avg_score_30d DESC NULLS LAST
LIMIT 24;

-- Pass criteria:
SELECT
  COUNT(*)                                                                           AS total_rows,   -- 24
  COUNT(property_type)                                                               AS has_type,     -- 24
  COUNT(avg_score_30d)                                                               AS has_score,    -- >=23
  COUNT(confidence_band_30d)                                                         AS has_band,     -- matches has_score
  COUNT(CASE WHEN avg_score_30d NOT BETWEEN 0 AND 100 THEN 1 END)                   AS out_of_range  -- 0
FROM (
  SELECT * FROM v_property_summary_current
  ORDER BY avg_score_30d DESC NULLS LAST LIMIT 24
) t;


-- ============================================================
-- TEST 3  --  Property Detail payload (Eclipse Motorsports)
-- Purpose : Single-property detail: windows + latest daily score
--           + component explainability.
-- Index   : idx_fsd_prop_date_model (index seek on property_id).
-- Pass    : view query = 1 row; daily query = 1 row;
--           components_json non-null; all component values 0..1.
-- ============================================================

-- Step A: window snapshot
SELECT
  v.property_id, v.property_name, v.property_type, v.country,
  v.event_start_date, v.as_of_day, v.model_version,
  v.avg_score_30d,   v.trend_value_30d,   v.confidence_band_30d,   v.completeness_pct_30d,   v.suppression_reason_30d,
  v.avg_score_60d,   v.trend_value_60d,   v.confidence_band_60d,
  v.avg_score_90d,   v.trend_value_90d,   v.confidence_band_90d,   v.volatility_value_90d
FROM v_property_summary_current v
WHERE v.property_id = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761';

-- Step B: latest daily score + components
SELECT
  fd.metric_date,
  fd.model_version,
  fd.fanscore_value,
  fd.confidence_band,
  fd.confidence_value,
  fd.suppression_reason,
  (fd.components_json -> 'norm'        -> 'value')::numeric  AS norm_value,
  (fd.components_json -> 'norm'        -> 'weight')::numeric AS norm_weight,
  (fd.components_json -> 'growth'      -> 'value')::numeric  AS growth_value,
  (fd.components_json -> 'growth'      -> 'weight')::numeric AS growth_weight,
  (fd.components_json -> 'consistency' -> 'value')::numeric  AS consistency_value,
  (fd.components_json -> 'consistency' -> 'weight')::numeric AS consistency_weight,
  (fd.components_json ->> 'integrity_mult')::numeric         AS integrity_mult,
  (fd.components_json ->> 'engagement_points')::numeric      AS engagement_points,
  (fd.components_json ->> 'avg_ep_30d')::numeric             AS avg_ep_30d,
  (fd.components_json ->> 'max_ep_90d')::numeric             AS max_ep_90d
FROM fanscore_daily fd
WHERE fd.property_id   = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761'
  AND fd.model_version = 'v1.0'
ORDER BY fd.metric_date DESC
LIMIT 1;

-- Pass criteria:
SELECT
  COUNT(*) AS rows,                                                                          -- 1
  COUNT(components_json) AS has_json,                                                        -- 1
  (components_json -> 'norm'        -> 'value')::numeric BETWEEN 0 AND 1 AS norm_ok,
  (components_json -> 'growth'      -> 'value')::numeric BETWEEN 0 AND 1 AS growth_ok,
  (components_json -> 'consistency' -> 'value')::numeric BETWEEN 0 AND 1 AS consistency_ok,
  (components_json ->> 'integrity_mult')::numeric BETWEEN 0.7 AND 1.0    AS integrity_ok
FROM fanscore_daily
WHERE property_id   = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761'
  AND model_version = 'v1.0'
ORDER BY metric_date DESC LIMIT 1;


-- ============================================================
-- TEST 4  --  Time series: 90-day FanScore
-- Purpose : Feed the per-property chart.
-- Index   : idx_fsd_prop_date_model -- index seek, very fast.
-- Pass    : <=90 rows, ascending dates, no null dates.
--           CRITICAL: suppression_reason IS NOT NULL is the gap
--           signal; since migration 007 fanscore_value IS NULL
--           on suppressed rows. Both must be consistent.
-- ============================================================

SELECT
  fd.metric_date,
  fd.fanscore_value,
  fd.confidence_band,
  fd.confidence_value,
  fd.suppression_reason IS NOT NULL   AS is_suppressed,
  fd.suppression_reason
FROM fanscore_daily fd
WHERE fd.property_id   = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761'
  AND fd.model_version = 'v1.0'
  AND fd.metric_date  >= CURRENT_DATE - 89
ORDER BY fd.metric_date ASC;

-- Integrity check: suppressed iff fanscore_value is null (post migration 007)
SELECT
  COUNT(*) AS total_rows,                                                      -- <=90
  COUNT(CASE WHEN suppression_reason IS NOT NULL THEN 1 END) AS suppressed,
  -- These two must both be 0:
  COUNT(CASE WHEN suppression_reason IS NOT NULL AND fanscore_value IS NOT NULL THEN 1 END) AS suppressed_has_value,
  COUNT(CASE WHEN suppression_reason IS NULL     AND fanscore_value IS NULL     THEN 1 END) AS unsuppressed_no_value,
  MIN(fanscore_value) AS min_score,
  MAX(fanscore_value) AS max_score
FROM fanscore_daily
WHERE property_id   = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761'
  AND model_version = 'v1.0'
  AND metric_date  >= CURRENT_DATE - 89;


-- ============================================================
-- TEST 5  --  Components time series (last 90 days)
-- Purpose : Feed stacked component breakdown chart.
-- Index   : idx_fsd_prop_date_model.
-- Pass    : All norm/growth/consistency values 0..1;
--           integrity_mult 0.7..1.0; global out-of-range = 0.
-- ============================================================

SELECT
  fd.metric_date,
  (fd.components_json -> 'norm'        -> 'value')::numeric  AS norm_value,
  (fd.components_json -> 'growth'      -> 'value')::numeric  AS growth_value,
  (fd.components_json -> 'consistency' -> 'value')::numeric  AS consistency_value,
  (fd.components_json ->> 'integrity_mult')::numeric         AS integrity_mult,
  (fd.components_json ->> 'engagement_points')::numeric      AS engagement_points,
  fd.confidence_band,
  fd.suppression_reason IS NOT NULL                          AS is_suppressed
FROM fanscore_daily fd
WHERE fd.property_id   = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761'
  AND fd.model_version = 'v1.0'
  AND fd.metric_date  >= CURRENT_DATE - 89
ORDER BY fd.metric_date ASC;

-- Global range validation (all properties, latest day):
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN (components_json->'norm'->>'value')::numeric        NOT BETWEEN 0 AND 1   THEN 1 END) AS norm_oor,
  COUNT(CASE WHEN (components_json->'growth'->>'value')::numeric      NOT BETWEEN 0 AND 1   THEN 1 END) AS growth_oor,
  COUNT(CASE WHEN (components_json->'consistency'->>'value')::numeric NOT BETWEEN 0 AND 1   THEN 1 END) AS consistency_oor,
  COUNT(CASE WHEN (components_json->>'integrity_mult')::numeric       NOT BETWEEN 0.7 AND 1 THEN 1 END) AS integrity_oor
FROM fanscore_daily
WHERE model_version = 'v1.0'
  AND metric_date   = '2026-02-28';
-- All _oor columns must be 0.


-- ============================================================
-- TEST 6  --  Compare: 3 properties side-by-side
-- Purpose : Validate compare surface: snapshot + sparklines.
-- Index   : idx_fsw_prop_day_win + idx_fsd_prop_date_model.
-- Pass    : snapshot = 3 rows; sparklines <=90 rows total;
--           no rows for unrequested property_ids.
-- ============================================================

-- Snapshot
SELECT
  v.property_id, v.property_name, v.property_type, v.country,
  v.as_of_day, v.model_version,
  v.avg_score_30d, v.trend_value_30d, v.confidence_band_30d,
  v.completeness_pct_30d, v.suppression_reason_30d,
  v.avg_score_90d, v.trend_value_90d
FROM v_property_summary_current v
WHERE v.property_id = ANY(ARRAY[
  '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761',   -- Eclipse Motorsports
  'e3bc0100-3ba3-47ab-a8a9-e1667ef5baf1',    -- Warren Pierce
  '0a56c8dc-92a4-41fc-8cad-0b767528834e'    -- Stormfront Racing
]::uuid[])
ORDER BY v.avg_score_30d DESC NULLS LAST;

-- Sparklines (last 30 days for all 3)
SELECT
  fd.property_id,
  fd.metric_date,
  fd.fanscore_value,
  fd.confidence_band,
  fd.suppression_reason IS NOT NULL AS is_suppressed
FROM fanscore_daily fd
WHERE fd.property_id = ANY(ARRAY[
  '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761',
  'e3bc0100-3ba3-47ab-a8a9-e1667ef5baf1',
  '0a56c8dc-92a4-41fc-8cad-0b767528834e'
]::uuid[])
  AND fd.model_version = 'v1.0'
  AND fd.metric_date  >= CURRENT_DATE - 29
ORDER BY fd.property_id, fd.metric_date ASC;

-- Pass criteria:
-- snapshot: COUNT(*) = 3
-- sparklines: COUNT(*) <= 90; COUNT(DISTINCT property_id) = 3


-- ============================================================
-- TEST 7  --  Suppressed edge case (Glacier Cup, 0% coverage)
-- Purpose : Confirm UI payload is complete and safe when a
--           property has no data in the window.
-- Pass    : Row returned from view; suppression_reason_30d set;
--           avg_score_30d is NULL (0% coverage = no avg possible);
--           UI must handle null score without crashing.
-- ============================================================

-- Window-level suppression (view):
SELECT
  v.property_id, v.property_name, v.property_type,
  v.avg_score_30d,           -- NULL (no data at all in 30d window)
  v.confidence_band_30d,     -- 'Low'
  v.confidence_value_30d,
  v.completeness_pct_30d,    -- 0.00
  v.suppression_reason_30d   -- 'Low data coverage in window (< 60% of days scored)'
FROM v_property_summary_current v
WHERE v.property_id = '3a5c5234-b5a0-4a6f-a3b8-186ab2431d28';

-- Delta 400: suppressed but has partial avg_score (23% coverage):
SELECT
  v.property_id, v.property_name,
  v.avg_score_30d,          -- non-null (some data, but < 60% coverage)
  v.confidence_band_30d,    -- 'Low'
  v.completeness_pct_30d,   -- 0.23
  v.suppression_reason_30d  -- set -> UI should show warning even though avg_score exists
FROM v_property_summary_current v
WHERE v.property_id = '73b52f81-666a-4fbd-a1c3-a5bc6fcd8d74';

-- Daily suppression check for Glacier Cup:
SELECT
  fd.metric_date, fd.fanscore_value, fd.confidence_band, fd.suppression_reason
FROM fanscore_daily fd
WHERE fd.property_id   = '3a5c5234-b5a0-4a6f-a3b8-186ab2431d28'
  AND fd.model_version = 'v1.0'
ORDER BY fd.metric_date DESC
LIMIT 5;
-- fanscore_value must be NULL on rows where suppression_reason IS NOT NULL (post migration 007).

-- Find all Low-confidence properties at window level:
SELECT COUNT(*) AS low_conf_props
FROM v_property_summary_current
WHERE confidence_band_30d = 'Low';
-- Expect: small number (3-5 event properties with sparse data)


-- ============================================================
-- TEST 8  --  EXPLAIN plans for critical query paths
-- Purpose : Verify indexes in use; flag seq scans on large tables.
-- Run each block separately.
-- ============================================================

-- 8a: Explore Grid (view materialization)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT property_id, property_name, property_type, avg_score_30d, confidence_band_30d
FROM v_property_summary_current
ORDER BY avg_score_30d DESC NULLS LAST
LIMIT 24;
-- Expect: Index Scan on idx_fsw_prop_day_win.
-- No seq scan on fanscore_windows (21k rows) for this query.

-- 8b: Property detail time series
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT metric_date, fanscore_value, confidence_band, suppression_reason
FROM fanscore_daily
WHERE property_id   = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761'
  AND model_version = 'v1.0'
  AND metric_date  >= CURRENT_DATE - 89
ORDER BY metric_date ASC;
-- Expect: Index Scan on idx_fsd_prop_date_model. Should return in <5ms.

-- 8c: Compare sparklines (3 properties)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT property_id, metric_date, fanscore_value
FROM fanscore_daily
WHERE property_id = ANY(ARRAY[
  '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761',
  'e3bc0100-3ba3-47ab-a8a9-e1667ef5baf1',
  '0a56c8dc-92a4-41fc-8cad-0b767528834e'
]::uuid[])
  AND model_version = 'v1.0'
  AND metric_date  >= CURRENT_DATE - 29
ORDER BY property_id, metric_date ASC;
-- Expect: Bitmap Index Scan on idx_fsd_prop_date_model.

-- 8d: Components time series
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT metric_date, components_json
FROM fanscore_daily
WHERE property_id   = '25e19eeb-e9b2-4cd1-9df3-a19e2f7ac761'
  AND model_version = 'v1.0'
  AND metric_date  >= CURRENT_DATE - 29
ORDER BY metric_date ASC;
-- components_json is JSONB (stored inline for small docs). No extra fetch needed.

-- 8e: Suppressed property daily lookup
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT metric_date, fanscore_value, suppression_reason
FROM fanscore_daily
WHERE property_id   = '3a5c5234-b5a0-4a6f-a3b8-186ab2431d28'
  AND model_version = 'v1.0'
ORDER BY metric_date DESC;
-- Expect: Index Scan on idx_fsd_prop_date_model.


-- ============================================================
-- GAPS & STATUS
-- ============================================================

/*
GAP 1 [FIXED: migration 006]
  v_property_summary_current was missing property_type and country.
  View dropped and recreated with those columns.
  Status: confirmed present, COUNT(property_type) = 120. DONE.

GAP 2 [KNOWN / ACCEPTABLE]
  fw_30d_count = 119, not 120.
  One property has zero coverage in the latest 30d window (Glacier Cup, 0%).
  avg_score_30d is NULL for that property.
  Fix: UI handles null avg_score by rendering '--' / "Insufficient data".
  No schema change needed.

GAP 3 [FIXED: migration 008]
  suppression_reason in fanscore_windows and suppression_reason_30d/60d/90d
  in v_property_summary_current were always NULL.
  compute_fanscore_windows now sets suppression_reason when completeness_pct < 0.6.
  Status: verified live -- suppression_reason_30d is populated for Low-confidence events.
  Nuance: avg_score may be non-null even when suppressed (partial data, < 60% coverage).
  UI must show warning whenever suppression_reason IS NOT NULL, regardless of score value.

GAP 4 [FIXED: migration 007]
  Suppressed rows in fanscore_daily had fanscore_value = 0 (not NULL).
  compute_fanscore_daily now sets fanscore_value = NULL when suppressed.
  Status: verified -- suppressed_non_null = 0 in Test 1. DONE.

GAP 5 [MINOR / ACCEPTABLE]
  v_property_summary_current does not expose the latest daily fanscore_value.
  getPropertyDetail issues a second query to fanscore_daily for this.
  This is intentional -- views are window-only by design.
  Cost: one extra round-trip per property detail open. Acceptable for demo.

RLS NOTE
  These tables were created without row-level security.
  The anon key has read access to all public tables/views.
  For production: enable RLS + policies before exposing a real anon key.
  For demo: safe as-is with a read-only anon key.

MISSING INDEX OPPORTUNITY
  fanscore_daily has no index on (suppression_reason) alone.
  Test 7's global suppression scan (WHERE suppression_reason IS NOT NULL)
  does a seq scan on ~21k rows -- acceptable for one-time test queries
  but not for a UI endpoint. The existing idx_fsd_prop_date_model covers
  all UI queries (always filtered by property_id), so no new index needed
  for the React harness.
*/
