-- =============================================================
-- SponsorAI Seed: GT World Challenge Europe 2024 — Full Creation
-- =============================================================
-- Purpose  : Complete, idempotent recreation of the GTWCE dataset.
--            Safe to run on an existing database (all statements
--            use ON CONFLICT DO NOTHING or NOT EXISTS guards).
--            Safe to run on a fresh database after:
--              1. 001_master_schema.sql
--              2. british_gt_2024_seed_confirmed.sql
--
-- Covers   :
--   1.  GTWCE series + SRO Motorsports Group (governing body)
--   2.  7 GTWCE teams
--   3.  10 GTWCE-only athletes + 5 British GT athletes (GTWCE
--       relationships only — properties must pre-exist)
--   4.  10 GTWCE events + 8 venues (6 GTWCE-specific + 2 shared)
--   5.  All property relationships (governing body, series/team,
--       team/athlete, athlete/series, series/event, event/venue)
--   6.  Social accounts for all the above
--   7.  91-day synthetic follower history (2025-12-13 → 2026-03-13)
--   8.  Synthetic posts + per-post daily metrics
--   9.  series_visibility record
--
-- Schema notes:
--   platform enum    : platform_enum   (instagram, x, youtube, tiktok, linkedin)
--   content_type enum: content_type_enum (image, video, carousel, reel, story, text)
--   property_type    : property_type_enum (series, team, athlete, event, venue, governing_body, driver)
--
-- British GT athletes referenced here (must pre-exist):
--   adam-smalley, raffaele-marciello, rob-collard, sandy-mitchell, tom-gamble
-- Shared venues (may pre-exist from british_gt seed — handled with ON CONFLICT):
--   brands-hatch, circuit-de-spa-francorchamps
--
-- Dependencies     : 001_master_schema.sql, british_gt_2024_seed_confirmed.sql
-- Run in           : Supabase SQL Editor (project kyjpxxyaebxvpprugmof)
-- Last updated     : 2026-03-14
-- Related migration: gtwce_core_properties (20260313145840) and subsequent
--                    gtwce_* migrations applied directly to the live database.
-- =============================================================


-- ================================================================
-- BLOCK 1: PROPERTIES, RELATIONSHIPS, ACCOUNTS
-- ================================================================
DO $gtwce_core$
BEGIN

  -- ── Series ──────────────────────────────────────────────────
  INSERT INTO properties (id, slug, name, property_type, sport, region, bio, visible_in_ui)
  VALUES (
    '3041facb-ea80-4617-94df-48bc0f23ac59',
    'gt-world-challenge-europe',
    'GT World Challenge Europe',
    'series'::property_type_enum,
    'motorsport', 'Europe',
    'The GT World Challenge Europe is the premier GT3 championship in Europe, organised by SRO Motorsports Group. The series runs Sprint Cup and Endurance Cup competitions featuring Pro, Silver Cup, Gold Cup, and Bronze Cup categories.',
    true
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── Governing body ───────────────────────────────────────────
  INSERT INTO properties (id, slug, name, property_type, sport, region, bio, visible_in_ui)
  VALUES (
    '5bfa22be-23fa-4160-8a42-e3373c6633a7',
    'sro-motorsports-group',
    'SRO Motorsports Group',
    'governing_body'::property_type_enum,
    'motorsport', 'Europe',
    'SRO Motorsports Group is the international motorsport organisation that sanctions and manages the British GT Championship and multiple GT series worldwide, including the Fanatec GT World Challenge. Headquartered in Brussels, Belgium.',
    true
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── Teams ────────────────────────────────────────────────────
  INSERT INTO properties (id, slug, name, property_type, sport, region, country, country_code, bio, visible_in_ui) VALUES
    ('b992e838-91a2-43fa-a11b-bc99321dec84', 'akkodis-asp',      'Akkodis ASP Team',   'team'::property_type_enum, 'motorsport', 'Europe', 'France',      'FR', 'French Mercedes-AMG customer racing team and one of the most successful outfits in the GT World Challenge Europe. Akkodis ASP has delivered multiple driver and team championships in SRO-sanctioned competition.', true),
    ('b35a3a27-1336-4d8d-8f99-4d49af09bba0', 'boutsen-vds',      'Boutsen VDS',        'team'::property_type_enum, 'motorsport', 'Europe', 'Belgium',     'BE', 'Belgian GT3 racing team competing in the GT World Challenge Europe. Boutsen VDS combines Belgian motorsport heritage with a professional GT3 programme across Sprint and Endurance Cup rounds.', true),
    ('df2628ae-bcf8-43b1-b666-6d2ae265033f', 'emil-frey-racing', 'Emil Frey Racing',   'team'::property_type_enum, 'motorsport', 'Europe', 'Switzerland', 'CH', 'Swiss motorsport team competing in the GT World Challenge Europe with Lamborghini machinery. Emil Frey Racing is a well-established GT3 programme backed by the Emil Frey automotive group.', true),
    ('57750535-26b3-45ae-ae6c-e4a97e5558b3', 'haupt-racing-team','Haupt Racing Team',  'team'::property_type_enum, 'motorsport', 'Europe', 'Germany',     'DE', 'German Mercedes-AMG customer racing team competing in the GT World Challenge Europe. HRT operates a factory-supported programme with experienced driver pairings across the SRO championship calendar.', true),
    ('fdbcd6df-9111-498f-b2b7-c8de05c26d64', 'iron-lynx',        'Iron Lynx',          'team'::property_type_enum, 'motorsport', 'Europe', 'Italy',       'IT', 'Italian GT3 racing team running Lamborghini machinery in the GT World Challenge Europe. Iron Lynx operates a multi-car programme with a roster of factory and well-established independent drivers.', true),
    ('7316f639-5d7a-4c35-995e-0e6f89b1c8f4', 'manthey-ema',      'Manthey EMA',        'team'::property_type_enum, 'motorsport', 'Europe', 'Germany',     'DE', 'German Porsche customer racing team competing in the GT World Challenge Europe under the Manthey EMA banner. The team draws on the Manthey Racing brand''s long Porsche heritage to field a competitive GT3 programme.', true),
    ('03658471-9c25-4dfc-9552-4e6938428963', 'team-wrt',         'Team WRT',           'team'::property_type_enum, 'motorsport', 'Europe', 'Belgium',     'BE', 'Team WRT (W Racing Team) is a Belgian motorsport team based in Baudour, Belgium. The team competes in multiple GT and touring car championships with BMW factory support, including the GT World Challenge Europe.', true)
  ON CONFLICT (slug) DO NOTHING;

  -- ── GTWCE-only athletes ──────────────────────────────────────
  INSERT INTO properties (id, slug, name, property_type, sport, region, country, country_code, bio, visible_in_ui) VALUES
    ('54c6320b-8e31-41f9-8c47-bf252338a7ea', 'charles-weerts',     'Charles Weerts',     'athlete'::property_type_enum, 'motorsport', 'Europe', 'Belgium',     'BE', 'Belgian Mercedes-AMG factory driver and GT World Challenge Europe Sprint Cup champion. One of the most consistent GT3 performers of his generation, racing for Akkodis ASP across Sprint and Endurance Cup rounds.', true),
    ('ce6bbc53-7818-46e2-90d5-954e8f896ac2', 'daniel-juncadella',  'Daniel Juncadella',  'athlete'::property_type_enum, 'motorsport', 'Europe', 'Spain',       'ES', 'Spanish Mercedes-AMG factory driver and former Formula 1 test driver. Juncadella has been a consistent presence in the GT World Challenge Europe, bringing single-seater precision to GT3 competition.', true),
    ('78b17fe1-b15f-49a4-a4ae-0f27edd228d6', 'dries-vanthoor',     'Dries Vanthoor',     'athlete'::property_type_enum, 'motorsport', 'Europe', 'Belgium',     'BE', 'Belgian GT3 driver and multiple GT World Challenge Europe champion. Vanthoor has competed across multiple factory programmes and is one of the most decorated GT3 racers in the SRO championship ecosystem.', true),
    ('218ec4e3-fbc2-41f9-947f-ab5f1327ce59', 'franck-makowiecki',  'Franck Makowiecki',  'athlete'::property_type_enum, 'motorsport', 'Europe', 'France',      'FR', 'French Porsche factory driver competing for Manthey EMA in the GT World Challenge Europe. Makowiecki brings decades of GT racing experience from the Porsche factory programme to the Sprint and Endurance Cup.', true),
    ('e436c68a-6c9b-4c2c-9c12-2f417f4b7d01', 'jules-gounon',       'Jules Gounon',       'athlete'::property_type_enum, 'motorsport', 'Europe', 'France',      'FR', 'French Mercedes-AMG factory driver and GT World Challenge Europe regular. Gounon competes for Akkodis ASP across Sprint and Endurance Cup rounds, bringing consistent performance across multiple campaign seasons.', true),
    ('adab6d3b-84f5-4a4c-a36d-42805003eeeb', 'luca-bortolotti',    'Luca Bortolotti',    'athlete'::property_type_enum, 'motorsport', 'Europe', 'Italy',       'IT', 'Italian Lamborghini factory driver and multiple GT World Challenge Europe podium finisher. Bortolotti is a cornerstone of the Iron Lynx driver programme and one of the most experienced GT3 competitors in the SRO ecosystem.', true),
    ('dec76e2f-e15b-42d2-9748-1008392e975a', 'marco-varrone',      'Marco Varrone',      'athlete'::property_type_enum, 'motorsport', 'Europe', 'Switzerland', 'CH', 'Swiss GT3 driver competing for Emil Frey Racing in the GT World Challenge Europe. Varrone is part of the Swiss team''s Lamborghini programme, racing across Endurance Cup rounds in the SRO calendar.', true),
    ('ff6389a8-b0c1-4ec9-99fe-337659be91e0', 'maxime-martin',      'Maxime Martin',      'athlete'::property_type_enum, 'motorsport', 'Europe', 'Belgium',     'BE', 'Maxime Martin is a Belgian professional racing driver and BMW factory driver, competing in GT and touring car championships including the GT World Challenge Europe with Team WRT.', true),
    ('6882e58d-9683-41ac-bd76-e4436c04a02b', 'timur-boguslavskiy', 'Timur Boguslavskiy', 'athlete'::property_type_enum, 'motorsport', 'Europe', 'Russia',      'RU', 'Russian GT3 competitor racing in the GT World Challenge Europe with Akkodis ASP. Boguslavskiy is an established presence in the SRO championship ecosystem, competing regularly in Sprint and Endurance Cup rounds.', true),
    ('8da7ce26-ab2e-4173-8d80-ec69808ae16b', 'valentino-rossi',    'Valentino Rossi',    'athlete'::property_type_enum, 'motorsport', 'Europe', 'Italy',       'IT', 'Valentino Rossi is an Italian racing driver and nine-time MotoGP World Champion who transitioned to four-wheel motorsport, competing in GT3 racing with Team WRT in the GT World Challenge Europe.', true)
  ON CONFLICT (slug) DO NOTHING;

  -- ── Events ──────────────────────────────────────────────────
  INSERT INTO properties (id, slug, name, property_type, sport, region, country, country_code, bio, visible_in_ui) VALUES
    ('99aabf85-ab38-47ae-95d3-94ef7eadb15a', '24-hours-of-spa-2024',              'GTWCE: Spa 2024',            'event'::property_type_enum, 'motorsport', 'Belgium', 'BE', 'BE', 'The 2024 24 Hours of Spa, the flagship endurance event of the GT World Challenge Europe Endurance Cup, held at Circuit de Spa-Francorchamps, Belgium.', true),
    ('5c90659f-f0f1-44c5-8d88-29402ca058de', 'gtwce-barcelona-2024',              'GTWCE: Barcelona 2024',      'event'::property_type_enum, 'motorsport', 'Europe',  'Spain',   'ES', 'The 2024 GT World Challenge Europe Endurance Cup round at Circuit de Barcelona-Catalunya. Extended race duration with multi-driver line-ups competing for Endurance Cup standings points.', true),
    ('217ea9c8-febc-4ead-bd44-61f9e6f15cf2', 'gtwce-magny-cours-2024',            'GTWCE: Magny-Cours 2024',    'event'::property_type_enum, 'motorsport', 'Europe',  'France',  'FR', 'The 2024 GT World Challenge Europe Endurance Cup round at Circuit de Nevers Magny-Cours. A regular fixture on the GT3 endurance calendar in France, featuring a technical layout suited to consistent set-up work.', true),
    ('68b2d0e5-2930-424f-b456-cf9488287890', 'gtwce-misano-2024',                 'GTWCE: Misano 2024',         'event'::property_type_enum, 'motorsport', 'Europe',  'Italy',   'IT', 'The 2024 GT World Challenge Europe Endurance Cup round at Misano World Circuit. One of two Italian stops on the GTWCE calendar, drawing a strong entry from European GT3 programmes.', true),
    ('d220e754-58e5-4c78-bede-4a4c7b2176b2', 'gtwce-monza-2024',                  'GTWCE: Monza 2024',          'event'::property_type_enum, 'motorsport', 'Europe',  'Italy',   'IT', 'The 2024 GT World Challenge Europe Endurance Cup round at Autodromo Nazionale Monza. Racing at one of the world''s fastest circuits, the Monza round is a defining event on the European GT3 calendar.', true),
    ('e82dceb2-cbef-4f3a-8619-b9f50c5ccf2d', 'gtwce-nurburgring-2024',            'GTWCE: Nürburgring 2024',    'event'::property_type_enum, 'motorsport', 'Europe',  'Germany', 'DE', 'The 2024 GT World Challenge Europe Endurance Cup round at the Nurburgring. One of the most significant events on the GTWCE calendar, held at Germany''s legendary Grand Prix circuit in the Eifel region.', true),
    ('f5b00285-f696-4100-a17e-cbe2dc3989e0', 'gtwce-paul-ricard-2024',            'GTWCE: Paul Ricard 2024',    'event'::property_type_enum, 'motorsport', 'Europe',  'France',  'FR', 'The 2024 GT World Challenge Europe Endurance Cup round at Circuit Paul Ricard in Le Castellet. Southern France''s premier racing facility provides a varied and demanding challenge for GT3 machinery and driver line-ups.', true),
    ('e638571a-5e90-42d7-87b8-bb8d49cbe1b8', 'gtwce-sprint-cup-brands-hatch-2024','GTWCE: Brands Hatch 2024',  'event'::property_type_enum, 'motorsport', 'Europe',  'GB',      'GB', 'The 2024 GT World Challenge Europe Sprint Cup season opener at Brands Hatch GP circuit, United Kingdom, held on 4-5 May 2024.', true),
    ('44d1baf6-0caa-4073-97d8-51432ba843b2', 'gtwce-sprint-misano-2024',          'GTWCE: Misano 2024',         'event'::property_type_enum, 'motorsport', 'Europe',  'Italy',   'IT', 'The 2024 GT World Challenge Europe Sprint Cup round at Misano World Circuit on the Adriatic coast. Two sprint races across the weekend, with factory and well-supported GT3 drivers competing for Sprint Cup standings points.', true),
    ('334f01fa-285e-40c1-a8d3-c79fbac1dd54', 'gtwce-sprint-nurburgring-2024',     'GTWCE: Nürburgring 2024',    'event'::property_type_enum, 'motorsport', 'Europe',  'Germany', 'DE', 'The 2024 GT World Challenge Europe Sprint Cup round at the Nurburgring Grand Prix circuit. One of the most prestigious venues on the SRO calendar, drawing a full GT3 entry across all championship classes.', true)
  ON CONFLICT (slug) DO NOTHING;

  -- ── Venues (GTWCE-specific; brands-hatch and spa may pre-exist) ─
  INSERT INTO properties (id, slug, name, property_type, sport, region, country, country_code, city, bio, visible_in_ui) VALUES
    ('80441328-5876-4c6a-9c3c-30261cf21f65', 'autodromo-nazionale-monza',  'Autodromo Nazionale Monza',     'venue'::property_type_enum, 'motorsport', 'Europe', 'Italy',   'IT', 'Monza',         'One of the oldest and fastest circuits in the world, Monza has hosted elite motorsport for over a century. Its high-speed layout and historic infrastructure make it a defining fixture on the GT World Challenge Europe calendar.', true),
    ('65f15d5b-1779-4c6e-a12a-46e123bb1888', 'circuit-de-barcelona-catalunya','Circuit de Barcelona-Catalunya','venue'::property_type_enum, 'motorsport', 'Europe', 'Spain',   'ES', 'Montmelo',      'The Circuit de Barcelona-Catalunya near Montmelo is a versatile racing facility hosting Formula 1 and GT3 championships. Its varied layout provides a balanced test of aerodynamic efficiency and mechanical grip.', true),
    ('4ea1d1a8-f8c2-4dfd-a220-93c5586a89b7', 'circuit-de-nevers-magny-cours','Circuit de Nevers Magny-Cours', 'venue'::property_type_enum, 'motorsport', 'Europe', 'France',  'FR', 'Magny-Cours',   'A former French Grand Prix venue in the Burgundy region, Magny-Cours combines a technical mid-speed layout with strong motorsport infrastructure. A regular fixture on the GT World Challenge Europe endurance calendar.', true),
    ('bce716f4-d0c2-45c3-810e-924b7878ed00', 'circuit-paul-ricard',         'Circuit Paul Ricard',           'venue'::property_type_enum, 'motorsport', 'Europe', 'France',  'FR', 'Le Castellet',  'Circuit Paul Ricard in Le Castellet, southern France, is a purpose-built motorsport facility known for its safety runoffs and flowing technical sections. It is a regular venue on the SRO GT3 championship calendar.', true),
    ('01f171a7-82e3-4993-be9e-187759a1bacf', 'misano-world-circuit',        'Misano World Circuit',          'venue'::property_type_enum, 'motorsport', 'Europe', 'Italy',   'IT', 'Misano Adriatico','Misano World Circuit Marco Simoncelli is a permanent racing facility on the Adriatic coast of Italy, primarily known as a motorcycle venue but increasingly prominent in GT3 racing. It hosts multiple SRO championship rounds.', true),
    ('6d8c4fd5-df81-47e1-8642-8e1684bda21c', 'nurburgring',                 'Nürburgring',                   'venue'::property_type_enum, 'motorsport', 'Europe', 'Germany', 'DE', 'Nurburg',       'The Nurburgring Grand Prix circuit in the Eifel region of Germany is one of the most historic racing venues in the world. It hosts the SRO GT3 Nurburgring round as part of the GT World Challenge Europe calendar.', true),
    -- Shared with British GT — safe due to ON CONFLICT
    ('97a2f5e8-3ea8-4107-abeb-c26ff30126cd', 'brands-hatch',                'Brands Hatch',                  'venue'::property_type_enum, 'motorsport', 'Kent',   'GB',      'GB', 'Fawkham',       'Brands Hatch is a classic circuit in Kent, England. It regularly hosts the British GT Championship season finale on its Grand Prix layout.', true),
    ('fed663be-2562-4a66-a6e1-aba871e05db1', 'circuit-de-spa-francorchamps','Circuit de Spa-Francorchamps',  'venue'::property_type_enum, 'motorsport', 'Liege',  'BE',      'BE', 'Stavelot',      'Circuit de Spa-Francorchamps is a legendary racing circuit in the Belgian Ardennes. British GT includes a continental round at Spa as its sole non-UK venue.', true)
  ON CONFLICT (slug) DO NOTHING;


  -- ================================================================
  -- SECTION 2: RELATIONSHIPS
  -- ================================================================

  -- Governing body -> series
  INSERT INTO property_relationships (from_id, to_id, relationship_type) VALUES
    ('5bfa22be-23fa-4160-8a42-e3373c6633a7', '3041facb-ea80-4617-94df-48bc0f23ac59', 'governing_body_oversees_series')
  ON CONFLICT (from_id, to_id, relationship_type) DO NOTHING;

  -- Series -> teams (series_has_team) + teams -> series (team_competes_in_series)
  INSERT INTO property_relationships (from_id, to_id, relationship_type) VALUES
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'b992e838-91a2-43fa-a11b-bc99321dec84', 'series_has_team'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'b35a3a27-1336-4d8d-8f99-4d49af09bba0', 'series_has_team'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'df2628ae-bcf8-43b1-b666-6d2ae265033f', 'series_has_team'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '57750535-26b3-45ae-ae6c-e4a97e5558b3', 'series_has_team'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'fdbcd6df-9111-498f-b2b7-c8de05c26d64', 'series_has_team'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '7316f639-5d7a-4c35-995e-0e6f89b1c8f4', 'series_has_team'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '03658471-9c25-4dfc-9552-4e6938428963', 'series_has_team'),
    ('03658471-9c25-4dfc-9552-4e6938428963', '3041facb-ea80-4617-94df-48bc0f23ac59', 'team_competes_in_series')
  ON CONFLICT (from_id, to_id, relationship_type) DO NOTHING;

  -- Teams -> athletes (team_has_athlete) + athletes -> team (athlete_belongs_to_team)
  INSERT INTO property_relationships (from_id, to_id, relationship_type) VALUES
    ('b992e838-91a2-43fa-a11b-bc99321dec84', 'e436c68a-6c9b-4c2c-9c12-2f417f4b7d01', 'team_has_athlete'), -- akkodis -> gounon
    ('b992e838-91a2-43fa-a11b-bc99321dec84', '6882e58d-9683-41ac-bd76-e4436c04a02b', 'team_has_athlete'), -- akkodis -> boguslavskiy
    ('57750535-26b3-45ae-ae6c-e4a97e5558b3', 'ce6bbc53-7818-46e2-90d5-954e8f896ac2', 'team_has_athlete'), -- hrt -> juncadella
    ('fdbcd6df-9111-498f-b2b7-c8de05c26d64', 'adab6d3b-84f5-4a4c-a36d-42805003eeeb', 'team_has_athlete'), -- iron lynx -> bortolotti
    ('fdbcd6df-9111-498f-b2b7-c8de05c26d64', 'dec76e2f-e15b-42d2-9748-1008392e975a', 'team_has_athlete'), -- iron lynx -> varrone
    ('7316f639-5d7a-4c35-995e-0e6f89b1c8f4', '218ec4e3-fbc2-41f9-947f-ab5f1327ce59', 'team_has_athlete'), -- manthey -> makowiecki
    ('03658471-9c25-4dfc-9552-4e6938428963', '54c6320b-8e31-41f9-8c47-bf252338a7ea', 'team_has_athlete'), -- wrt -> weerts
    ('03658471-9c25-4dfc-9552-4e6938428963', '78b17fe1-b15f-49a4-a4ae-0f27edd228d6', 'team_has_athlete'), -- wrt -> vanthoor
    ('ff6389a8-b0c1-4ec9-99fe-337659be91e0', '03658471-9c25-4dfc-9552-4e6938428963', 'athlete_belongs_to_team'), -- martin -> wrt
    ('8da7ce26-ab2e-4173-8d80-ec69808ae16b', '03658471-9c25-4dfc-9552-4e6938428963', 'athlete_belongs_to_team'), -- rossi -> wrt
    ('92245bae-9b1f-4c2e-9b40-3421176a98fd', '03658471-9c25-4dfc-9552-4e6938428963', 'athlete_belongs_to_team')  -- marciello -> wrt
  ON CONFLICT (from_id, to_id, relationship_type) DO NOTHING;

  -- Athletes -> series (athlete_competes_in_series)
  -- Includes both GTWCE-only athletes and British GT athletes dual-registered
  INSERT INTO property_relationships (from_id, to_id, relationship_type) VALUES
    ('0b05fd8e-601b-42a6-a334-84cd04445241', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- adam-smalley (BritishGT)
    ('6821490f-509c-449d-9301-b39b0f4e11de', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- rob-collard (BritishGT)
    ('e5f18123-2ac7-4dcd-bf53-c158aed56496', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- sandy-mitchell (BritishGT)
    ('82241c79-6b29-4157-90ce-e6093c7d2733', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- tom-gamble (BritishGT)
    ('92245bae-9b1f-4c2e-9b40-3421176a98fd', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- raffaele-marciello (BritishGT)
    ('ff6389a8-b0c1-4ec9-99fe-337659be91e0', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- maxime-martin
    ('8da7ce26-ab2e-4173-8d80-ec69808ae16b', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- valentino-rossi
    ('54c6320b-8e31-41f9-8c47-bf252338a7ea', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- charles-weerts
    ('ce6bbc53-7818-46e2-90d5-954e8f896ac2', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- daniel-juncadella
    ('78b17fe1-b15f-49a4-a4ae-0f27edd228d6', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- dries-vanthoor
    ('218ec4e3-fbc2-41f9-947f-ab5f1327ce59', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- franck-makowiecki
    ('e436c68a-6c9b-4c2c-9c12-2f417f4b7d01', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- jules-gounon
    ('adab6d3b-84f5-4a4c-a36d-42805003eeeb', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- luca-bortolotti
    ('dec76e2f-e15b-42d2-9748-1008392e975a', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series'), -- marco-varrone
    ('6882e58d-9683-41ac-bd76-e4436c04a02b', '3041facb-ea80-4617-94df-48bc0f23ac59', 'athlete_competes_in_series')  -- timur-boguslavskiy
  ON CONFLICT (from_id, to_id, relationship_type) DO NOTHING;

  -- Series -> events
  INSERT INTO property_relationships (from_id, to_id, relationship_type) VALUES
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '99aabf85-ab38-47ae-95d3-94ef7eadb15a', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '5c90659f-f0f1-44c5-8d88-29402ca058de', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '217ea9c8-febc-4ead-bd44-61f9e6f15cf2', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '68b2d0e5-2930-424f-b456-cf9488287890', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'd220e754-58e5-4c78-bede-4a4c7b2176b2', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'e82dceb2-cbef-4f3a-8619-b9f50c5ccf2d', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'f5b00285-f696-4100-a17e-cbe2dc3989e0', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', 'e638571a-5e90-42d7-87b8-bb8d49cbe1b8', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '44d1baf6-0caa-4073-97d8-51432ba843b2', 'series_contains_event'),
    ('3041facb-ea80-4617-94df-48bc0f23ac59', '334f01fa-285e-40c1-a8d3-c79fbac1dd54', 'series_contains_event')
  ON CONFLICT (from_id, to_id, relationship_type) DO NOTHING;

  -- Events -> venues
  INSERT INTO property_relationships (from_id, to_id, relationship_type) VALUES
    ('99aabf85-ab38-47ae-95d3-94ef7eadb15a', 'fed663be-2562-4a66-a6e1-aba871e05db1', 'event_at_venue'), -- spa event -> spa circuit
    ('5c90659f-f0f1-44c5-8d88-29402ca058de', '65f15d5b-1779-4c6e-a12a-46e123bb1888', 'event_at_venue'), -- barcelona -> catalunya
    ('217ea9c8-febc-4ead-bd44-61f9e6f15cf2', '4ea1d1a8-f8c2-4dfd-a220-93c5586a89b7', 'event_at_venue'), -- magny-cours event -> circuit
    ('68b2d0e5-2930-424f-b456-cf9488287890', '01f171a7-82e3-4993-be9e-187759a1bacf', 'event_at_venue'), -- misano endurance -> misano circuit
    ('d220e754-58e5-4c78-bede-4a4c7b2176b2', '80441328-5876-4c6a-9c3c-30261cf21f65', 'event_at_venue'), -- monza event -> monza circuit
    ('e82dceb2-cbef-4f3a-8619-b9f50c5ccf2d', '6d8c4fd5-df81-47e1-8642-8e1684bda21c', 'event_at_venue'), -- nurburgring endurance -> nurburgring
    ('f5b00285-f696-4100-a17e-cbe2dc3989e0', 'bce716f4-d0c2-45c3-810e-924b7878ed00', 'event_at_venue'), -- paul ricard event -> circuit paul ricard
    ('e638571a-5e90-42d7-87b8-bb8d49cbe1b8', '97a2f5e8-3ea8-4107-abeb-c26ff30126cd', 'event_at_venue'), -- brands hatch event -> brands hatch
    ('44d1baf6-0caa-4073-97d8-51432ba843b2', '01f171a7-82e3-4993-be9e-187759a1bacf', 'event_at_venue'), -- misano sprint -> misano circuit
    ('334f01fa-285e-40c1-a8d3-c79fbac1dd54', '6d8c4fd5-df81-47e1-8642-8e1684bda21c', 'event_at_venue')  -- nurburgring sprint -> nurburgring
  ON CONFLICT (from_id, to_id, relationship_type) DO NOTHING;


  -- ================================================================
  -- SECTION 3: SOCIAL ACCOUNTS
  -- ================================================================
  INSERT INTO accounts (id, property_id, platform, handle, url, followers_baseline, is_verified) VALUES
    -- GTWCE series
    ('84f454a9-7ee8-4647-8e9b-2637cf5c41c3', '3041facb-ea80-4617-94df-48bc0f23ac59', 'instagram'::platform_enum, 'gtworldchallenge',       'https://www.instagram.com/gtworldchallenge',   0,     false),
    ('33e27850-f360-41f6-babb-b030e307c60a', '3041facb-ea80-4617-94df-48bc0f23ac59', 'x'::platform_enum,         'GTWorldChEu',            'https://x.com/GTWorldChEu',                    0,     false),
    -- SRO Motorsports Group
    ('df0f071d-3b25-4c72-9ab9-6e92255fa7fc', '5bfa22be-23fa-4160-8a42-e3373c6633a7', 'instagram'::platform_enum, '@sro_motorsports',       'https://instagram.com/sro_motorsports',        58400, true),
    ('2cd6384b-6cc1-46ad-84e0-1b6f7e929e5b', '5bfa22be-23fa-4160-8a42-e3373c6633a7', 'x'::platform_enum,         '@SROMotorsports',        'https://x.com/SROMotorsports',                 34200, true),
    -- Akkodis ASP
    ('de5e5748-e97b-498b-9229-b9ea6fcc698a', 'b992e838-91a2-43fa-a11b-bc99321dec84', 'instagram'::platform_enum, 'akkodisasp',             'https://instagram.com/akkodisasp',             0,     false),
    ('9277c761-6b2d-47ee-87ea-3e629919115f', 'b992e838-91a2-43fa-a11b-bc99321dec84', 'x'::platform_enum,         'AkkodisASP',             'https://x.com/AkkodisASP',                     0,     false),
    -- Boutsen VDS
    ('82287004-573c-450d-930f-d9ee982a2ddd', 'b35a3a27-1336-4d8d-8f99-4d49af09bba0', 'instagram'::platform_enum, 'boutsenvds',             'https://instagram.com/boutsenvds',             0,     false),
    ('7b81049f-5cee-41f0-8d19-441035c8c4ed', 'b35a3a27-1336-4d8d-8f99-4d49af09bba0', 'x'::platform_enum,         'BoutsenVDS',             'https://x.com/BoutsenVDS',                     0,     false),
    -- Emil Frey Racing
    ('7fdab5f2-ae02-427e-8c92-38b10f36e7d9', 'df2628ae-bcf8-43b1-b666-6d2ae265033f', 'instagram'::platform_enum, 'emilfreyracing',         'https://instagram.com/emilfreyracing',         0,     false),
    ('6545b2f2-d5a6-43dd-bcdb-fa1fae87464f', 'df2628ae-bcf8-43b1-b666-6d2ae265033f', 'x'::platform_enum,         'EmilFreyRacing',         'https://x.com/EmilFreyRacing',                 0,     false),
    -- Haupt Racing Team
    ('841550af-f5ad-4ed8-8599-a86f67075c3f', '57750535-26b3-45ae-ae6c-e4a97e5558b3', 'instagram'::platform_enum, 'hauptracingteam',        'https://instagram.com/hauptracingteam',        0,     false),
    ('29c1399b-fb8a-4cc0-acb8-0746cc043fd0', '57750535-26b3-45ae-ae6c-e4a97e5558b3', 'x'::platform_enum,         'HauptRacingTeam',        'https://x.com/HauptRacingTeam',                0,     false),
    -- Iron Lynx
    ('dd836d25-5509-43bc-8ca8-42c00b1f3cba', 'fdbcd6df-9111-498f-b2b7-c8de05c26d64', 'instagram'::platform_enum, 'ironlynx_official',      'https://instagram.com/ironlynx_official',      0,     false),
    ('3d225240-f689-41dc-b60f-8a3d86718ffe', 'fdbcd6df-9111-498f-b2b7-c8de05c26d64', 'x'::platform_enum,         'IronLynxOfficial',       'https://x.com/IronLynxOfficial',               0,     false),
    -- Manthey EMA
    ('4dddaa06-4954-413f-9daa-e7b228e46058', '7316f639-5d7a-4c35-995e-0e6f89b1c8f4', 'instagram'::platform_enum, 'manthey_ema',            'https://instagram.com/manthey_ema',            0,     false),
    ('9271af7d-7a43-4352-8553-141c6e284715', '7316f639-5d7a-4c35-995e-0e6f89b1c8f4', 'x'::platform_enum,         'MantheyEMA',             'https://x.com/MantheyEMA',                     0,     false),
    -- Team WRT
    ('0a48bc76-acc6-4021-82df-3d3e689d3088', '03658471-9c25-4dfc-9552-4e6938428963', 'instagram'::platform_enum, 'teamwrt',                'https://www.instagram.com/teamwrt',            0,     false),
    ('1f51016d-ad82-4533-af24-5e9b2f4722bd', '03658471-9c25-4dfc-9552-4e6938428963', 'x'::platform_enum,         'teamwrt',                'https://x.com/teamwrt',                        0,     false),
    -- GTWCE-only athletes
    ('a2f7affb-9eaa-4cc6-a229-37cc28290f84', '54c6320b-8e31-41f9-8c47-bf252338a7ea', 'instagram'::platform_enum, 'charlesweerts',          'https://instagram.com/charlesweerts',          0,     false),
    ('7e265cb5-f40a-4d08-9734-354d757bfc48', '54c6320b-8e31-41f9-8c47-bf252338a7ea', 'x'::platform_enum,         'CharlesWeerts',          'https://x.com/CharlesWeerts',                  0,     false),
    ('78cae670-4634-4410-8dc3-8c390b78eae3', 'ce6bbc53-7818-46e2-90d5-954e8f896ac2', 'instagram'::platform_enum, 'daniel_juncadella',      'https://instagram.com/daniel_juncadella',      0,     false),
    ('60ced8ba-289f-4b28-a430-51ee37482567', 'ce6bbc53-7818-46e2-90d5-954e8f896ac2', 'x'::platform_enum,         'DanielJuncadella',       'https://x.com/DanielJuncadella',               0,     false),
    ('ce8085ce-f037-4f88-912a-d64641cd9c69', '78b17fe1-b15f-49a4-a4ae-0f27edd228d6', 'instagram'::platform_enum, 'driesvanthoor',          'https://instagram.com/driesvanthoor',          0,     false),
    ('d4170650-b46c-4e52-b172-e1cd7b622f93', '78b17fe1-b15f-49a4-a4ae-0f27edd228d6', 'x'::platform_enum,         'DriesVanthoor',          'https://x.com/DriesVanthoor',                  0,     false),
    ('5b7fc445-86f0-4ce1-8184-aa01946bf7ab', '218ec4e3-fbc2-41f9-947f-ab5f1327ce59', 'instagram'::platform_enum, 'franck_makowiecki',      'https://instagram.com/franck_makowiecki',      0,     false),
    ('91f9c958-a8b5-43bc-997b-a9b1b3d13814', 'e436c68a-6c9b-4c2c-9c12-2f417f4b7d01', 'instagram'::platform_enum,'julesgounon',            'https://instagram.com/julesgounon',            0,     false),
    ('9bdf24bc-c208-435d-b5a8-cf2f9876d139', 'adab6d3b-84f5-4a4c-a36d-42805003eeeb', 'instagram'::platform_enum, 'luca_bortolotti_gt3',   'https://instagram.com/luca_bortolotti_gt3',    0,     false),
    ('e316b92f-66c3-4a62-a2d2-4aae707e0bc2', 'adab6d3b-84f5-4a4c-a36d-42805003eeeb', 'x'::platform_enum,         'LucaBortolotti',         'https://x.com/LucaBortolotti',                 0,     false),
    ('8649e17f-981b-48e1-aca8-f2a48ec2966b', 'dec76e2f-e15b-42d2-9748-1008392e975a', 'instagram'::platform_enum, 'marco_varrone',          'https://instagram.com/marco_varrone',          0,     false),
    ('704e4ff0-6ce1-4cb5-95a1-de0c40149ca1', 'ff6389a8-b0c1-4ec9-99fe-337659be91e0', 'instagram'::platform_enum, 'maximemartinofficial',  'https://www.instagram.com/maximemartinofficial',0,    false),
    ('adbd8c35-2d38-4d7c-81d4-4fdfdf765580', '6882e58d-9683-41ac-bd76-e4436c04a02b', 'instagram'::platform_enum, 'timur_bogus',            'https://instagram.com/timur_bogus',            0,     false),
    ('0283671c-1cc4-4b02-b271-1ddc1166bf84', '8da7ce26-ab2e-4173-8d80-ec69808ae16b', 'instagram'::platform_enum, 'valeyellow46',           'https://www.instagram.com/valeyellow46',       0,     false),
    ('8645541a-9a30-41e4-8ba2-1c9c2a72c836', '8da7ce26-ab2e-4173-8d80-ec69808ae16b', 'youtube'::platform_enum,   'valeyellow46',           'https://www.youtube.com/@valeyellow46',         0,     false),
    ('33d45db1-ac46-4a8c-a6dd-692c33224f14', '8da7ce26-ab2e-4173-8d80-ec69808ae16b', 'x'::platform_enum,         'ValeYellow46',           'https://x.com/ValeYellow46',                   0,     false),
    -- British GT athletes: additional GTWCE-era accounts
    ('f2c2e449-d187-452e-972c-6221c4955695', '92245bae-9b1f-4c2e-9b40-3421176a98fd', 'instagram'::platform_enum, 'raffaele.marciello',    'https://www.instagram.com/raffaele.marciello', 0,     false),
    ('7c39ce03-d9b8-4693-8e70-1671d916b018', '6821490f-509c-449d-9301-b39b0f4e11de', 'instagram'::platform_enum, 'robcollard',            'https://www.instagram.com/robcollard',         0,     false),
    ('453c640e-7068-4657-8faa-103902933c39', '6821490f-509c-449d-9301-b39b0f4e11de', 'x'::platform_enum,         'robcollard',            'https://x.com/robcollard',                     0,     false),
    ('b910417b-49ec-48be-94aa-5f46150e8b87', 'e5f18123-2ac7-4dcd-bf53-c158aed56496', 'instagram'::platform_enum, 'sandymitchellracing',   'https://www.instagram.com/sandymitchellracing',0,     false),
    ('f8f74d17-5ed9-483b-8e71-ac7d3cfe7898', 'e5f18123-2ac7-4dcd-bf53-c158aed56496', 'x'::platform_enum,         'SandyMitchell7',        'https://x.com/SandyMitchell7',                 0,     false),
    ('186e4f92-fab2-4cca-ae88-03e94f9a01e8', '82241c79-6b29-4157-90ce-e6093c7d2733', 'instagram'::platform_enum, 'tomgambleracing',       'https://www.instagram.com/tomgambleracing',    0,     false),
    ('dadeafa7-9d9f-445c-81b4-b6072befc992', '82241c79-6b29-4157-90ce-e6093c7d2733', 'x'::platform_enum,         'TomGambleR',            'https://x.com/TomGambleR',                     0,     false)
    -- Note: adam-smalley accounts (c54d55d6 / 98d594a9) pre-exist from British GT seed
  ON CONFLICT (property_id, platform, handle) DO NOTHING;


  -- ================================================================
  -- SECTION 6: SERIES VISIBILITY
  -- ================================================================
  INSERT INTO series_visibility (series_slug, ready_for_ui, visible_in_ui)
  VALUES ('gt-world-challenge-europe', true, true)
  ON CONFLICT (series_slug) DO NOTHING;

END $gtwce_core$;


-- ================================================================
-- BLOCK 2: FOLLOWER HISTORY (91 days, 2025-12-13 to 2026-03-13)
-- ================================================================
-- Generates synthetic but deterministic follower history for all
-- GTWCE-linked accounts. All accounts that already have data for a
-- given (account_id, metric_date) are left untouched.
--
-- Growth pattern: starts at a realistic baseline (or inferred from
-- followers_baseline), adds a small deterministic daily delta
-- derived from a hash of (account_id || date) to avoid flat lines.
-- ================================================================
DO $gtwce_followers$
DECLARE
  v_acc_id   uuid;
  v_baseline bigint;
  v_count    bigint;
  v_delta    bigint;
  v_day      date;
BEGIN
  FOR v_acc_id IN
    SELECT a.id
    FROM accounts a
    JOIN properties p ON p.id = a.property_id
    WHERE p.slug IN (
      'gt-world-challenge-europe', 'sro-motorsports-group',
      'akkodis-asp', 'boutsen-vds', 'emil-frey-racing', 'haupt-racing-team',
      'iron-lynx', 'manthey-ema', 'team-wrt',
      'charles-weerts', 'daniel-juncadella', 'dries-vanthoor',
      'franck-makowiecki', 'jules-gounon', 'luca-bortolotti',
      'marco-varrone', 'maxime-martin', 'timur-boguslavskiy', 'valentino-rossi',
      'raffaele-marciello', 'rob-collard', 'sandy-mitchell', 'tom-gamble',
      'adam-smalley'
    )
  LOOP
    SELECT followers_baseline INTO v_baseline FROM accounts WHERE id = v_acc_id;

    -- Seed the starting count:
    --   Non-zero baseline accounts: backtrack 90 days of growth to get day-1 value.
    --   Zero-baseline accounts: use a modest hash-derived starting count so that
    --   the FanScore pipeline has non-trivial values to work with.
    IF v_baseline IS NULL OR v_baseline = 0 THEN
      v_count := 12000 + (abs(hashtext(v_acc_id::text)) % 18000)::bigint;
    ELSE
      v_count := v_baseline - (90 * 20)::bigint;
      IF v_count < 1000 THEN v_count := v_baseline; END IF;
    END IF;

    v_day := '2025-12-13'::date;

    FOR i IN 1..91 LOOP
      -- Deterministic delta: 10-30 followers/day with hash-based jitter
      v_delta := CASE WHEN i = 1 THEN 0
                      ELSE 10 + (abs(hashtext(v_acc_id::text || v_day::text)) % 20)::bigint
                 END;
      v_count := v_count + v_delta;

      INSERT INTO raw_account_followers
        (account_id, metric_date, followers_count, followers_delta, is_estimated, data_source)
      VALUES
        (v_acc_id, v_day, v_count, v_delta, true, 'seed_gtwce_2024')
      ON CONFLICT (account_id, metric_date) DO NOTHING;

      v_day := v_day + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'GTWCE follower history seed complete.';
END $gtwce_followers$;


-- ================================================================
-- BLOCK 3: SYNTHETIC POSTS + PER-POST METRICS
-- ================================================================
-- Generates posts at appropriate cadence per account type.
-- Post IDs are deterministic (gtwce_seed_<acc8>_<n>) so the block
-- is safe to re-run: skips posts whose platform_post_id already exists.
-- Per-post metric rows are generated immediately after each post.
-- ================================================================
DO $gtwce_posts$
DECLARE
  v_acc_id   uuid;
  v_platform platform_enum;
  v_ptype    property_type_enum;
  v_post_id  uuid;
  v_pid      text;
  v_freq     int;
  v_captions text[] := ARRAY[
    'Race day. Grid is set.',
    'Qualifying results are in.',
    'Full grid. Big battles ahead this weekend.',
    'Behind the scenes at the paddock.',
    'The cars are ready. Let''s race.',
    'Championship points on the line.',
    'Every lap counts.',
    'The team has done an incredible job this weekend.',
    'Track action from this weekend''s round.',
    'GT3 racing at its finest.'
  ];
  v_ctypes   content_type_enum[] := ARRAY[
    'image'::content_type_enum,
    'video'::content_type_enum,
    'carousel'::content_type_enum
  ];
  v_post_ts  timestamptz;
  v_likes    bigint;
  v_comments bigint;
  v_shares   bigint;
  v_saves    bigint;
BEGIN
  FOR v_acc_id, v_platform, v_ptype IN
    SELECT a.id, a.platform, p.property_type
    FROM accounts a
    JOIN properties p ON p.id = a.property_id
    WHERE p.slug IN (
      'gt-world-challenge-europe', 'sro-motorsports-group',
      'akkodis-asp', 'boutsen-vds', 'emil-frey-racing', 'haupt-racing-team',
      'iron-lynx', 'manthey-ema', 'team-wrt',
      'charles-weerts', 'daniel-juncadella', 'dries-vanthoor',
      'franck-makowiecki', 'jules-gounon', 'luca-bortolotti',
      'marco-varrone', 'maxime-martin', 'timur-boguslavskiy', 'valentino-rossi',
      'raffaele-marciello', 'rob-collard', 'sandy-mitchell', 'tom-gamble',
      'adam-smalley'
    )
  LOOP
    -- Post frequency mirrors observed migration counts:
    --   series: 65 | governing_body: 30 | team: 30 | athlete: 18
    v_freq := CASE v_ptype
      WHEN 'series'::property_type_enum        THEN 65
      WHEN 'governing_body'::property_type_enum THEN 30
      WHEN 'team'::property_type_enum           THEN 30
      ELSE 18
    END;

    FOR j IN 1..v_freq LOOP
      v_pid := 'gtwce_seed_' || LEFT(v_acc_id::text, 8) || '_' || j::text;

      -- Skip if this post already exists (idempotent rerun safety)
      CONTINUE WHEN EXISTS (SELECT 1 FROM raw_posts WHERE platform_post_id = v_pid);

      -- Spread posts evenly across the 91-day window with time-of-day jitter
      v_post_ts := '2025-12-13 10:00:00+00'::timestamptz
                   + (((j - 1)::float * 88.0 / v_freq)::int || ' days')::interval
                   + ((abs(hashtext(v_pid)) % 12) || ' hours')::interval
                   + ((abs(hashtext(v_pid || 'min')) % 60) || ' minutes')::interval;

      INSERT INTO raw_posts
        (id, account_id, platform, posted_at, content_type, caption, is_viral, platform_post_id)
      VALUES (
        gen_random_uuid(),
        v_acc_id,
        v_platform,
        v_post_ts,
        v_ctypes[1 + (abs(hashtext(v_pid || 'ct')) % 3)],
        v_captions[1 + (abs(hashtext(v_pid || 'cap')) % 10)],
        (abs(hashtext(v_pid)) % 15 = 0),
        v_pid
      )
      RETURNING id INTO v_post_id;

      -- Engagement metrics: scale by property type
      v_likes    := CASE v_ptype
                      WHEN 'series'::property_type_enum        THEN 500  + (abs(hashtext(v_pid || 'l')) % 2000)::bigint
                      WHEN 'governing_body'::property_type_enum THEN 300  + (abs(hashtext(v_pid || 'l')) % 1200)::bigint
                      WHEN 'team'::property_type_enum           THEN 150  + (abs(hashtext(v_pid || 'l')) % 800)::bigint
                      ELSE                                           80   + (abs(hashtext(v_pid || 'l')) % 500)::bigint
                    END;
      v_comments := 10  + (abs(hashtext(v_pid || 'c')) % 80)::bigint;
      v_shares   := 15  + (abs(hashtext(v_pid || 's')) % 150)::bigint;
      v_saves    := 5   + (abs(hashtext(v_pid || 'sv')) % 60)::bigint;

      INSERT INTO raw_post_daily_metrics
        (post_id, metric_date, likes, comments, shares, saves, impressions, reach)
      VALUES (
        v_post_id,
        v_post_ts::date,
        v_likes,
        v_comments,
        v_shares,
        v_saves,
        (v_likes * 8 + v_comments * 20)::bigint,
        (v_likes * 5)::bigint
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'GTWCE posts + metrics seed complete.';
END $gtwce_posts$;


-- ================================================================
-- VERIFICATION QUERY
-- Run after seeding to confirm coverage:
-- ================================================================
-- SELECT p.slug, p.property_type,
--        COUNT(DISTINCT a.id)   AS accounts,
--        COUNT(DISTINCT raf.id) AS follower_rows,
--        COUNT(DISTINCT rp.id)  AS posts
-- FROM properties p
-- LEFT JOIN accounts a ON a.property_id = p.id
-- LEFT JOIN raw_account_followers raf ON raf.account_id = a.id
-- LEFT JOIN raw_posts rp ON rp.account_id = a.id
-- WHERE p.slug IN ('gt-world-challenge-europe','sro-motorsports-group',
--   'akkodis-asp','boutsen-vds','emil-frey-racing','haupt-racing-team',
--   'iron-lynx','manthey-ema','team-wrt','valentino-rossi','maxime-martin')
-- GROUP BY p.slug, p.property_type ORDER BY p.property_type, p.slug;
