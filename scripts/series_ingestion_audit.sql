-- ============================================================
-- SponsorAI — Series Ingestion Audit
-- ============================================================
-- Purpose:
--   Detect missing FanScores, missing images, broken image
--   URL risks, and duplicate data problems for all entities
--   belonging to a series, before data reaches the Explore grid.
--
-- Usage:
--   1. Set the target series slug in the `params` CTE below.
--   2. Keep the `image_registry` CTE in sync with app/images.js
--      whenever new image entries are added.
--   3. Run in the Supabase SQL Editor (or psql).
--   4. Review flag columns. Any TRUE flag requires action before
--      the series is considered ingestion-complete.
--
-- Maintenance:
--   The `image_registry` and `event_venue_map` CTEs must be
--   updated manually to match app/images.js whenever images
--   are added, changed, or removed. They are snapshots, not
--   live connections to the JavaScript registry.
--
-- Output — Part 1: Entity detail table (one row per entity)
-- Output — Part 2: Summary statistics (one row per series audit)
--
-- Flags — data quality:
--   flag_missing_fanscore   Entity has accounts but no 30d FanScore
--   flag_missing_posts      Entity has accounts but no raw posts
--   flag_missing_image      No image registered in images.js
--   flag_image_hotlink_risk Image URL pattern suggests third-party
--                           site; may block hotlinking (note: many
--                           Wikimedia Commons URLs match this pattern
--                           but are hotlink-safe by design)
--
-- Flags — duplicate detection:
--   flag_duplicate_slug     Two or more distinct properties share
--                           this slug in the ecosystem
--   flag_duplicate_name     Two or more distinct properties of the
--                           same type share this display name
--   flag_duplicate_event    For events only: another event in the
--                           ecosystem shares the same venue and year.
--                           May be intentional (sprint + endurance
--                           at the same venue) — review in context.
-- ============================================================


-- ============================================================
-- PART 1 — ENTITY DETAIL
-- ============================================================

WITH

-- ------------------------------------------------------------
-- CONFIGURATION: set the series slug here
-- ------------------------------------------------------------
params AS (
  SELECT 'gt-world-challenge-europe' AS series_slug
  -- Other examples:
  -- SELECT 'british-gt-championship' AS series_slug
),

-- ------------------------------------------------------------
-- IMAGE REGISTRY
-- Snapshot of app/images.js PROPERTY_IMAGES as of 2026-03-13.
-- Update this CTE whenever images.js changes.
-- Columns: slug, url, kind
-- ------------------------------------------------------------
image_registry (slug, url, kind) AS (
  VALUES
  -- Series logotypes
  ('british-gt-championship',
   'https://www.britishgt.com/assets/img/british-gt-championship-logo-2024-neg.svg',
   'series'),
  ('gt-world-challenge-europe',
   'https://www.gt-world-challenge-europe.com/assets/img/gt-world-challenge-europe-aws-neg-logo-2026.svg',
   'series'),
  -- Governing body
  ('sro-motorsports-group',
   'https://www.sro-motorsports.com/assets/img/sro-motorsports-group-logo-neg-250x140.svg',
   'series'),
  -- British GT venues
  ('brands-hatch',
   'https://msvstatic.blob.core.windows.net/high-res/7acc82c7-91c8-4f1c-989c-39e5df7a8dfd.jpg',
   'venue'),
  ('silverstone-circuit',
   'https://www.silverstone.co.uk/sites/default/files/images/Gallery4.png',
   'venue'),
  ('circuit-de-spa-francorchamps',
   'https://www.spa-francorchamps.be/assets/9421a327-18b7-4a81-abbb-407b8ec246e0/bg-circuit.png',
   'venue'),
  ('snetterton-circuit',
   'https://msvstatic.blob.core.windows.net/high-res/98d3f736-7dd5-43bf-b63b-41dc2c7d89df.jpg',
   'venue'),
  ('oulton-park',
   'https://msvstatic.blob.core.windows.net/high-res/3e560ddf-aa58-4e01-8511-2666eeb3fde8.jpg',
   'venue'),
  ('donington-park',
   'https://msvstatic.blob.core.windows.net/high-res/d68c913e-f478-4306-abdf-5ce64a15172c.jpg',
   'venue'),
  -- British GT teams
  ('barwell-motorsport',
   'https://barwellmotorsport.co.uk/assets/logos/logo.svg',
   'logo'),
  ('century-motorsport',
   'https://www.centurymotorsport.com/wp-content/uploads/2022/08/century-motorsport-logo-red-and-white.png',
   'logo'),
  ('greystone-gt',
   'https://images.squarespace-cdn.com/content/v1/57c41b159de4bb0a96dd94f0/c784f8d7-bc52-4b41-a17c-f4b408764120/Logo-4x.png',
   'logo'),
  ('team-wrt',
   'https://www.w-racingteam.com/frontend/themes/wrt/assets/img/racing/landing/wrt-logo-full.png',
   'logo'),
  ('optimum-motorsport',
   'https://www.britishgt.com/images/teams/team_338.png',
   'car'),
  ('beechdean-amr',
   'https://www.britishgt.com/images/teams/team_337.jpg',
   'car'),
  ('2-seas-motorsport',
   'https://www.britishgt.com/images/teams/team_339.jpg',
   'car'),
  ('orange-racing-by-jmh',
   'https://www.britishgt.com/images/teams/team_318.jpg',
   'car'),
  ('garage-59',
   'https://www.britishgt.com/images/teams/team_293.jpg',
   'car'),
  ('paddock-motorsport',
   'https://www.britishgt.com/images/teams/team_282.jpeg',
   'car'),
  ('team-abba-racing',
   'https://www.britishgt.com/images/teams/team_285.jpg',
   'car'),
  ('blackthorn-motorsport',
   'https://www.britishgt.com/images/teams/team_299.jpg',
   'car'),
  ('ram-racing',
   'https://www.britishgt.com/images/teams/team_284.jpg',
   'car'),
  ('team-rjn',
   'https://www.britishgt.com/images/teams/team_288.jpg',
   'car'),
  -- British GT athletes
  ('adam-smalley',   'https://www.britishgt.com/images/drivers/driver_1180.png', 'portrait'),
  ('alex-buncombe',  'https://www.britishgt.com/images/drivers/driver_1152.png', 'portrait'),
  ('alex-martin',    'https://www.britishgt.com/images/drivers/driver_1101.png', 'portrait'),
  ('andrew-howard',  'https://www.britishgt.com/images/drivers/driver_1281.png', 'portrait'),
  ('carl-cavers',    'https://www.britishgt.com/images/drivers/driver_1133.png', 'portrait'),
  ('chris-sakeld',   'https://www.britishgt.com/images/drivers/driver_1287.png', 'portrait'),
  ('giacomo-petrobelli', 'https://www.britishgt.com/images/drivers/driver_1272.png', 'portrait'),
  ('ian-loggie',     'https://www.britishgt.com/images/drivers/driver_1162.png', 'portrait'),
  ('jessica-hawkins','https://www.britishgt.com/images/drivers/driver_1190.png', 'portrait'),
  ('john-ferguson',  'https://www.britishgt.com/images/drivers/driver_1149.png', 'portrait'),
  ('jonny-adam',     'https://www.britishgt.com/images/drivers/driver_1271.png', 'portrait'),
  ('josh-rowledge',  'https://www.britishgt.com/images/drivers/driver_1182.png', 'portrait'),
  ('kevin-tse',      'https://www.britishgt.com/images/drivers/driver_1277.png', 'portrait'),
  ('lewis-plato',    'https://www.britishgt.com/images/drivers/driver_1134.png', 'portrait'),
  ('marcus-clutton', 'https://www.britishgt.com/images/drivers/driver_1248.png', 'portrait'),
  ('mark-radcliffe', 'https://www.britishgt.com/images/drivers/driver_1165.png', 'portrait'),
  ('mark-smith',     'https://www.britishgt.com/images/drivers/driver_1246.png', 'portrait'),
  ('martin-plowman', 'https://www.britishgt.com/images/drivers/driver_1245.png', 'portrait'),
  ('matt-topham',    'https://www.britishgt.com/images/drivers/driver_1295.png', 'portrait'),
  ('maxime-martin',  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3739.png', 'portrait'),
  ('maximilian-gotz','https://www.britishgt.com/images/drivers/driver_1278.png', 'portrait'),
  ('michael-johnston','https://www.britishgt.com/images/drivers/driver_1178.png', 'portrait'),
  ('mike-price',     'https://www.britishgt.com/images/drivers/driver_1137.png', 'portrait'),
  ('morgan-tillbrook','https://www.britishgt.com/images/drivers/driver_1260.png', 'portrait'),
  ('phil-keen',      'https://www.britishgt.com/images/drivers/driver_1291.png', 'portrait'),
  ('raffaele-marciello','https://www.britishgt.com/images/drivers/driver_1150.png', 'portrait'),
  ('richard-neary',  'https://www.britishgt.com/images/drivers/driver_1148.png', 'portrait'),
  ('ricky-collard',  'https://www.britishgt.com/images/drivers/driver_1157.png', 'portrait'),
  ('rob-collard',    'https://www.britishgt.com/images/drivers/driver_1257.png', 'portrait'),
  ('sam-neary',      'https://www.britishgt.com/images/drivers/driver_1244.png', 'portrait'),
  ('sandy-mitchell', 'https://www.britishgt.com/images/drivers/driver_1265.png', 'portrait'),
  ('shaun-balfe',    'https://www.britishgt.com/images/drivers/driver_1179.png', 'portrait'),
  ('simon-orange',   'https://www.britishgt.com/images/drivers/driver_1247.png', 'portrait'),
  ('simon-watts',    'https://www.britishgt.com/images/drivers/driver_1151.png', 'portrait'),
  ('tom-gamble',     'https://www.britishgt.com/images/drivers/driver_1164.png', 'portrait'),
  ('tom-roche',      'https://www.britishgt.com/images/drivers/driver_1171.png', 'portrait'),
  ('valentino-rossi','https://www.gt-world-challenge-europe.com/images/drivers/photo_3989.png', 'portrait'),
  -- GTWCE venues (Wikimedia Commons, hotlink-safe)
  ('circuit-de-barcelona-catalunya',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Circuit_de_Barcelona-Catalunya,_April_19,_2018_SkySat.jpg/1280px-Circuit_de_Barcelona-Catalunya,_April_19,_2018_SkySat.jpg',
   'venue'),
  ('autodromo-nazionale-monza',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Monza_aerial_photo.jpg/1280px-Monza_aerial_photo.jpg',
   'venue'),
  ('circuit-paul-ricard',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Circuit_Paul_Ricard,_April_22,_2018_SkySat.jpg/1280px-Circuit_Paul_Ricard,_April_22,_2018_SkySat.jpg',
   'venue'),
  ('misano-world-circuit',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Misano_World_Circuit_Marco_Simoncelli.jpg/1280px-Misano_World_Circuit_Marco_Simoncelli.jpg',
   'venue'),
  ('circuit-de-nevers-magny-cours',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Circuit_de_Nevers_Magny-Cours-Northeast_side.jpg/1280px-Circuit_de_Nevers_Magny-Cours-Northeast_side.jpg',
   'venue'),
  ('nurburgring',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/N%C3%BCrburgring%2C_Mercedesarena_105x.jpg/1280px-N%C3%BCrburgring%2C_Mercedesarena_105x.jpg',
   'venue'),
  -- GTWCE teams
  ('akkodis-asp',
   'https://www.akkodisracing.com/assets/img/akkodis-asp-team-logo.png',
   'logo'),
  ('iron-lynx',
   'https://www.ironlynx.com/wp-content/themes/IRON_LYNX/assets/img/logos/iron-lynx-motorsport-lab.svg',
   'logo'),
  ('boutsen-vds',
   'https://www.boutsenvds.be/wp-content/uploads/2022/03/boutsen-vds-logo.png',
   'logo'),
  ('haupt-racing-team',
   'https://www.hauptracing.com/assets/img/hrt-logo.png',
   'logo'),
  ('manthey-ema',
   'https://www.manthey-racing.com/themes/custom/grounded_manthey/src/images/30Years_Manthey_Logo_RGB_positiv.png',
   'logo'),
  ('emil-frey-racing',
   'https://emilfreyracing.com/static/5f6060afd22983f8e634b02ecb154415/80f52/logo.png',
   'logo'),
  -- GTWCE athletes
  ('charles-weerts',
   'https://www.gt-world-challenge-europe.com/images/drivers/photo_3854.png',
   'portrait'),
  ('dries-vanthoor',
   'https://www.gt-world-challenge-europe.com/images/drivers/photo_3855.png',
   'portrait'),
  ('jules-gounon',
   'https://www.gt-world-challenge-europe.com/images/drivers/photo_3761.png',
   'portrait'),
  ('daniel-juncadella',
   'https://www.gt-world-challenge-europe.com/images/drivers/photo_3742.png',
   'portrait'),
  ('luca-bortolotti',
   'https://www.gt-world-challenge-europe.com/images/drivers/photo_3748.png',
   'portrait'),
  ('franck-makowiecki',
   'https://www.gt-world-challenge-europe.com/images/drivers/photo_3763.png',
   'portrait')
  -- timur-boguslavskiy: no confirmed image; intentional placeholder
  -- marco-varrone: name reconciliation pending; intentional placeholder
),

-- ------------------------------------------------------------
-- EVENT VENUE MAP
-- Snapshot of app/images.js EVENT_VENUE_MAP as of 2026-03-13.
-- Events resolve to their venue's image via this fallback map.
-- ------------------------------------------------------------
event_venue_map (event_slug, venue_slug) AS (
  VALUES
  ('british-gt-brands-hatch-2024',          'brands-hatch'),
  ('british-gt-silverstone-500-2024',       'silverstone-circuit'),
  ('british-gt-spa-francorchamps-2024',     'circuit-de-spa-francorchamps'),
  ('british-gt-snetterton-2024',            'snetterton-circuit'),
  ('british-gt-oulton-park-2024',           'oulton-park'),
  ('british-gt-donington-park',             'donington-park'),
  ('british-gt-donington-park-2024-r4',     'donington-park'),
  ('british-gt-donington-park-2024-r8',     'donington-park'),
  ('24-hours-of-spa-2024',                  'circuit-de-spa-francorchamps'),
  ('gtwce-sprint-cup-brands-hatch-2024',    'brands-hatch'),
  ('gtwce-sprint-misano-2024',              'misano-world-circuit'),
  ('gtwce-sprint-nurburgring-2024',         'nurburgring'),
  ('gtwce-barcelona-2024',                  'circuit-de-barcelona-catalunya'),
  ('gtwce-monza-2024',                      'autodromo-nazionale-monza'),
  ('gtwce-paul-ricard-2024',                'circuit-paul-ricard'),
  ('gtwce-misano-2024',                     'misano-world-circuit'),
  ('gtwce-magny-cours-2024',                'circuit-de-nevers-magny-cours'),
  ('gtwce-nurburgring-2024',                'nurburgring')
),

-- ------------------------------------------------------------
-- Resolve effective image URL per slug, accounting for
-- direct PROPERTY_IMAGES entries and EVENT_VENUE_MAP fallback
-- ------------------------------------------------------------
resolved_images AS (
  SELECT
    ir.slug,
    ir.url                AS image_url,
    ir.kind               AS image_kind,
    TRUE                  AS direct_entry,
    NULL::text            AS via_venue_slug
  FROM image_registry ir

  UNION ALL

  -- Events that resolve via EVENT_VENUE_MAP
  SELECT
    evm.event_slug        AS slug,
    ir.url                AS image_url,
    ir.kind               AS image_kind,
    FALSE                 AS direct_entry,
    evm.venue_slug        AS via_venue_slug
  FROM event_venue_map evm
  JOIN image_registry ir ON ir.slug = evm.venue_slug
  -- Only include if the event slug itself is NOT directly in image_registry
  WHERE evm.event_slug NOT IN (SELECT slug FROM image_registry)
),

-- ------------------------------------------------------------
-- Derive image_source label from URL domain
-- ------------------------------------------------------------
image_source_derived AS (
  SELECT
    ri.slug,
    ri.image_url,
    ri.image_kind,
    ri.direct_entry,
    ri.via_venue_slug,
    CASE
      WHEN ri.image_url ILIKE '%upload.wikimedia.org%' THEN 'Wikimedia Commons'
      WHEN ri.image_url ILIKE '%msvstatic.blob.core.windows.net%' THEN 'MSV CDN'
      WHEN ri.image_url ILIKE '%britishgt.com%'             THEN 'British GT Portal'
      WHEN ri.image_url ILIKE '%gt-world-challenge-europe.com%' THEN 'GTWCE Portal'
      WHEN ri.image_url ILIKE '%sro-motorsports.com%'       THEN 'SRO Motorsports'
      WHEN ri.image_url ILIKE '%squarespace-cdn.com%'       THEN 'Squarespace CDN'
      WHEN ri.image_url ILIKE '%silverstone.co.uk%'         THEN 'Silverstone Official'
      WHEN ri.image_url ILIKE '%spa-francorchamps.be%'      THEN 'Spa-Francorchamps Official'
      ELSE regexp_replace(ri.image_url, '^https?://(?:www\.)?([^/]+).*$', '\1')
    END                   AS image_source
  FROM resolved_images ri
),

-- ------------------------------------------------------------
-- SERIES ROOT: resolve series property ID from slug
-- ------------------------------------------------------------
series_root AS (
  SELECT p.id AS series_id, p.slug AS series_slug, p.name AS series_name
  FROM properties p
  JOIN params ON p.slug = params.series_slug
),

-- ------------------------------------------------------------
-- ECOSYSTEM: all entities that belong to the series
-- Tier 0: the series itself
-- Tier 0b: governing body (oversees the series)
-- Tier 1: teams (series_has_team)
-- Tier 2: athletes (athlete_competes_in_series — primary)
-- Tier 2b: athletes (team_has_athlete — fallback)
-- Tier 3: events (series_contains_event)
-- Tier 4: venues (event_at_venue, for events in the series)
-- ------------------------------------------------------------
ecosystem AS (
  -- Tier 0: the series itself
  SELECT p.id, p.slug, p.name, p.property_type, 0 AS tier
  FROM properties p, series_root sr
  WHERE p.id = sr.series_id

  UNION

  -- Tier 0b: governing body
  SELECT p.id, p.slug, p.name, p.property_type, 0 AS tier
  FROM properties p
  JOIN property_relationships pr
    ON pr.from_id = p.id
    AND pr.relationship_type = 'governing_body_oversees_series'
  JOIN series_root sr ON pr.to_id = sr.series_id

  UNION

  -- Tier 1: teams
  SELECT p.id, p.slug, p.name, p.property_type, 1 AS tier
  FROM properties p
  JOIN property_relationships pr
    ON pr.to_id = p.id
    AND pr.relationship_type = 'series_has_team'
  JOIN series_root sr ON pr.from_id = sr.series_id

  UNION

  -- Tier 2: athletes (via athlete_competes_in_series — primary relationship)
  SELECT p.id, p.slug, p.name, p.property_type, 2 AS tier
  FROM properties p
  JOIN property_relationships pr
    ON pr.to_id = p.id
    AND pr.relationship_type = 'athlete_competes_in_series'
  JOIN series_root sr ON pr.from_id = sr.series_id

  UNION

  -- Tier 2b: athletes (via team_has_athlete fallback — catches any not linked directly)
  SELECT p.id, p.slug, p.name, p.property_type, 2 AS tier
  FROM properties p
  JOIN property_relationships pr_ta
    ON pr_ta.to_id = p.id
    AND pr_ta.relationship_type = 'team_has_athlete'
  WHERE pr_ta.from_id IN (
    SELECT p2.id
    FROM properties p2
    JOIN property_relationships pr_st
      ON pr_st.to_id = p2.id
      AND pr_st.relationship_type = 'series_has_team'
    JOIN series_root sr ON pr_st.from_id = sr.series_id
  )

  UNION

  -- Tier 3: events
  SELECT p.id, p.slug, p.name, p.property_type, 3 AS tier
  FROM properties p
  JOIN property_relationships pr
    ON pr.to_id = p.id
    AND pr.relationship_type = 'series_contains_event'
  JOIN series_root sr ON pr.from_id = sr.series_id

  UNION

  -- Tier 4: venues (via events in this series)
  SELECT p.id, p.slug, p.name, p.property_type, 4 AS tier
  FROM properties p
  JOIN property_relationships pr_ev
    ON pr_ev.to_id = p.id
    AND pr_ev.relationship_type = 'event_at_venue'
  WHERE pr_ev.from_id IN (
    SELECT p2.id
    FROM properties p2
    JOIN property_relationships pr_se
      ON pr_se.to_id = p2.id
      AND pr_se.relationship_type = 'series_contains_event'
    JOIN series_root sr ON pr_se.from_id = sr.series_id
  )
),

-- ------------------------------------------------------------
-- ACCOUNT STATS: count accounts per property
-- ------------------------------------------------------------
account_stats AS (
  SELECT
    a.property_id,
    COUNT(*)         AS social_accounts_count
  FROM accounts a
  WHERE a.property_id IN (SELECT id FROM ecosystem)
  GROUP BY a.property_id
),

-- ------------------------------------------------------------
-- POST STATS: count raw posts per property (via account join)
-- ------------------------------------------------------------
post_stats AS (
  SELECT
    a.property_id,
    COUNT(rp.id)     AS posts_count
  FROM accounts a
  LEFT JOIN raw_posts rp ON rp.account_id = a.id
  WHERE a.property_id IN (SELECT id FROM ecosystem)
  GROUP BY a.property_id
),

-- ------------------------------------------------------------
-- FANSCORE DATA: latest 30-day window per property
-- ------------------------------------------------------------
fanscore_data AS (
  SELECT DISTINCT ON (fw.property_id)
    fw.property_id,
    fw.avg_score             AS fanscore_30d,
    fw.confidence_band,
    fw.completeness_pct,
    fw.as_of_day
  FROM fanscore_windows fw
  WHERE fw.window_days = 30
    AND fw.property_id IN (SELECT id FROM ecosystem)
  ORDER BY fw.property_id, fw.as_of_day DESC, fw.computed_at DESC
),

-- ------------------------------------------------------------
-- FOLLOWER DATA: latest total follower count per property
-- ------------------------------------------------------------
follower_data AS (
  SELECT DISTINCT ON (ppm.property_id)
    ppm.property_id,
    SUM(ppm.followers_end_of_day) OVER (
      PARTITION BY ppm.property_id, ppm.metric_date
    )                        AS total_followers
  FROM property_platform_daily_metrics ppm
  WHERE ppm.property_id IN (SELECT id FROM ecosystem)
  ORDER BY ppm.property_id, ppm.metric_date DESC
),

-- ============================================================
-- DUPLICATE DETECTION CTEs
-- ============================================================

-- ------------------------------------------------------------
-- DUP SLUGS
-- A slug used by more than one distinct property ID within
-- the ecosystem. Indicates a data entry or ingestion error.
-- Each occurrence in the ecosystem will carry the flag.
-- ------------------------------------------------------------
dup_slugs AS (
  SELECT slug
  FROM (
    SELECT DISTINCT id, slug FROM ecosystem
  ) dedupe
  GROUP BY slug
  HAVING COUNT(DISTINCT id) > 1
),

-- ------------------------------------------------------------
-- DUP NAMES
-- The same display name used by more than one distinct
-- property of the same type within the ecosystem.
-- Example: two events both named "GTWCE Misano 2024".
-- ------------------------------------------------------------
dup_names AS (
  SELECT name, property_type
  FROM (
    SELECT DISTINCT id, name, property_type FROM ecosystem
  ) dedupe
  GROUP BY name, property_type
  HAVING COUNT(DISTINCT id) > 1
),

-- ------------------------------------------------------------
-- EVENT VENUES
-- For each event in the ecosystem, resolve its venue (via
-- event_at_venue relationship) and extract the calendar year
-- from the event slug using a 4-digit regex.
--
-- Year extraction: takes the first 4-digit sequence found in
-- the slug. Slugs like 'gtwce-misano-2024' yield '2024'.
-- Events without a year in the slug yield NULL and are
-- excluded from duplicate event detection.
-- ------------------------------------------------------------
event_venues AS (
  SELECT DISTINCT
    e.id                                       AS event_id,
    e.slug                                     AS event_slug,
    e.name                                     AS event_name,
    pr_ev.to_id                                AS venue_id,
    substring(e.slug from '\d{4}')             AS event_year
  FROM ecosystem e
  JOIN property_relationships pr_ev
    ON pr_ev.from_id = e.id
    AND pr_ev.relationship_type = 'event_at_venue'
  WHERE e.property_type = 'event'
),

-- ------------------------------------------------------------
-- DUP EVENTS
-- Venue + year combinations that appear on more than one
-- event in the ecosystem.
--
-- A TRUE flag does NOT necessarily indicate a data error:
-- series sometimes schedule both a sprint round and an
-- endurance round at the same circuit in the same season
-- (e.g., GTWCE Misano Sprint 2024 + GTWCE Misano 2024).
-- Treat this flag as "needs review", not "is wrong".
-- ------------------------------------------------------------
dup_events AS (
  SELECT venue_id, event_year
  FROM event_venues
  WHERE event_year IS NOT NULL
  GROUP BY venue_id, event_year
  HAVING COUNT(*) > 1
)

-- ============================================================
-- MAIN AUDIT QUERY — entity detail
-- ============================================================
SELECT
  e.id                                     AS property_id,
  e.slug,
  e.name                                   AS property_name,
  e.property_type,
  ROUND(fd.fanscore_30d::numeric, 1)       AS fanscore_30d,
  foll.total_followers                     AS followers,
  COALESCE(ac.social_accounts_count, 0)    AS social_accounts_count,
  COALESCE(ps.posts_count, 0)              AS posts_count,
  (ri.slug IS NOT NULL)                    AS image_registered,
  ri.image_url,
  ri.image_source,

  -- Data quality flags
  (fd.fanscore_30d IS NULL
    AND COALESCE(ac.social_accounts_count, 0) > 0
  )                                        AS flag_missing_fanscore,

  (COALESCE(ac.social_accounts_count, 0) > 0
    AND COALESCE(ps.posts_count, 0) = 0
  )                                        AS flag_missing_posts,

  (ri.slug IS NULL)                        AS flag_missing_image,

  (ri.image_url IS NOT NULL
    AND (
         ri.image_url ILIKE '%circuit%'
      OR ri.image_url ILIKE '%raceway%'
      OR ri.image_url ILIKE '%speedway%'
      OR ri.image_url ILIKE '%motorsport%'
    )
  )                                        AS flag_image_hotlink_risk,

  -- Duplicate detection flags
  (ds.slug IS NOT NULL)                    AS flag_duplicate_slug,

  (dn.name IS NOT NULL)                    AS flag_duplicate_name,

  -- flag_duplicate_event: TRUE only for event entities whose
  -- venue+year combination is shared by at least one other event.
  -- Non-event entity types always return FALSE.
  (ev.event_id IS NOT NULL
    AND de.venue_id IS NOT NULL
  )                                        AS flag_duplicate_event

FROM ecosystem e
LEFT JOIN account_stats        ac   ON ac.property_id  = e.id
LEFT JOIN post_stats           ps   ON ps.property_id  = e.id
LEFT JOIN fanscore_data        fd   ON fd.property_id  = e.id
LEFT JOIN follower_data        foll ON foll.property_id = e.id
LEFT JOIN image_source_derived ri   ON ri.slug          = e.slug
-- Duplicate detection joins
LEFT JOIN dup_slugs            ds   ON ds.slug          = e.slug
LEFT JOIN dup_names            dn   ON dn.name          = e.name
                                   AND dn.property_type = e.property_type
LEFT JOIN event_venues         ev   ON ev.event_id      = e.id
LEFT JOIN dup_events           de   ON de.venue_id      = ev.venue_id
                                   AND de.event_year    = ev.event_year

ORDER BY
  e.tier,
  e.property_type,
  e.name;


-- ============================================================
-- PART 2 — SUMMARY STATISTICS
-- ============================================================
-- Re-run the same CTEs and aggregate into a single summary row.
-- Paste the CTEs above (params through dup_events) before
-- this block when running both parts together.
--
-- To run Part 2 independently, prepend all CTEs from Part 1,
-- replacing the final SELECT with the query below.
-- ============================================================

/*

  SELECT
    (SELECT series_slug FROM params)         AS series_slug,
    COUNT(*)                                 AS total_entities,
    COUNT(fd.fanscore_30d)                   AS entities_with_fanscore,

    -- Data quality
    COUNT(*) FILTER (
      WHERE fd.fanscore_30d IS NULL
        AND COALESCE(ac.social_accounts_count, 0) > 0
    )                                        AS entities_missing_fanscore,
    COUNT(*) FILTER (
      WHERE ri.slug IS NULL
    )                                        AS entities_missing_images,
    COUNT(*) FILTER (
      WHERE COALESCE(ac.social_accounts_count, 0) > 0
        AND COALESCE(ps.posts_count, 0) = 0
    )                                        AS entities_missing_posts,
    COUNT(*) FILTER (
      WHERE ri.image_url IS NOT NULL
        AND (
             ri.image_url ILIKE '%circuit%'
          OR ri.image_url ILIKE '%raceway%'
          OR ri.image_url ILIKE '%speedway%'
          OR ri.image_url ILIKE '%motorsport%'
        )
    )                                        AS entities_hotlink_risk_images,

    -- Duplicate detection
    COUNT(*) FILTER (
      WHERE ds.slug IS NOT NULL
    )                                        AS entities_duplicate_slug,
    COUNT(*) FILTER (
      WHERE dn.name IS NOT NULL
    )                                        AS entities_duplicate_name,
    COUNT(*) FILTER (
      WHERE ev.event_id IS NOT NULL
        AND de.venue_id IS NOT NULL
    )                                        AS entities_duplicate_event

  FROM ecosystem e
  LEFT JOIN account_stats        ac   ON ac.property_id  = e.id
  LEFT JOIN post_stats           ps   ON ps.property_id  = e.id
  LEFT JOIN fanscore_data        fd   ON fd.property_id  = e.id
  LEFT JOIN image_source_derived ri   ON ri.slug          = e.slug
  -- Duplicate detection joins
  LEFT JOIN dup_slugs            ds   ON ds.slug          = e.slug
  LEFT JOIN dup_names            dn   ON dn.name          = e.name
                                     AND dn.property_type = e.property_type
  LEFT JOIN event_venues         ev   ON ev.event_id      = e.id
  LEFT JOIN dup_events           de   ON de.venue_id      = ev.venue_id
                                     AND de.event_year    = ev.event_year;

*/
