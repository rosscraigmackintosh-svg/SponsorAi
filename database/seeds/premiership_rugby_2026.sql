-- =============================================================
-- SponsorAI Seed: Gallagher Premiership Rugby 2025/26
-- =============================================================
-- Purpose  : Standalone reference seed for the Premiership Rugby
--            2025/26 series. Mirrors the data embedded in the
--            build_series_structure('premiership-rugby', ...) RPC.
--            Use this file for:
--              - Manual recovery if the RPC is unavailable
--              - Documentation of the canonical entity set
--              - Diff reference when updating the RPC template
-- Last updated : 2026-03-13
-- Author       : SponsorAI ingestion pipeline
-- Run in       : Supabase SQL Editor (project kyjpxxyaebxvpprugmof)
-- Idempotency  : Safe to re-run. Uses INSERT ... ON CONFLICT DO NOTHING
--                for all inserts and UPDATE ... WHERE slug = ... for
--                metadata fields.
-- =============================================================

DO $seed$
DECLARE
  v_series_id    uuid;
  v_govbody_id   uuid;

  -- Teams
  v_bath         uuid;
  v_bristol      uuid;
  v_exeter       uuid;
  v_gloucester   uuid;
  v_harlequins   uuid;
  v_leicester    uuid;
  v_northampton  uuid;
  v_sale         uuid;
  v_tigers       uuid; -- Leicester alias used internally
  v_saracens     uuid;
  v_wasps        uuid; -- NB: as of 2025/26 status uncertain; included for completeness

  -- Athletes
  v_finn_russell uuid;
  v_henry_slade  uuid;
  v_ellis_genge  uuid;
  v_maro_itoje   uuid;
  v_sam_underhill uuid;
  v_ben_youngs   uuid;
  v_george_ford  uuid;
  v_tommy_taylor uuid;
  v_alex_lozowski uuid;
  v_ben_morgan   uuid;
  v_tom_curry    uuid;

  -- Venues
  v_rec          uuid; -- Bath
  v_ashton_gate  uuid; -- Bristol
  v_sandy_park   uuid; -- Exeter
  v_kingsholm    uuid; -- Gloucester
  v_twickenham_stoop uuid; -- Harlequins
  v_welford_road uuid; -- Leicester
  v_cinch_stadium uuid; -- Northampton
  v_ajs_stadium  uuid; -- Sale
  v_allianz      uuid; -- Saracens

  -- Event
  v_prem_final   uuid;

  -- Governing body
  v_prl_id       uuid;

BEGIN

  -- ================================================================
  -- SERIES
  -- ================================================================
  INSERT INTO properties (name, slug, property_type, sport, region, bio)
  VALUES (
    'Gallagher Premiership Rugby',
    'premiership-rugby',
    'series',
    'rugby union',
    'Europe',
    'The Gallagher Premiership is the top tier of professional club rugby union in England, featuring 10 clubs competing across a regular season and knockout rounds. The competition is overseen by Premiership Rugby Ltd and sponsored by Gallagher.'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_series_id;

  IF v_series_id IS NULL THEN
    SELECT id INTO v_series_id FROM properties WHERE slug = 'premiership-rugby';
  END IF;

  UPDATE properties SET
    sport  = 'rugby union',
    region = 'Europe',
    bio    = 'The Gallagher Premiership is the top tier of professional club rugby union in England, featuring 10 clubs competing across a regular season and knockout rounds. The competition is overseen by Premiership Rugby Ltd and sponsored by Gallagher.'
  WHERE slug = 'premiership-rugby';

  -- ================================================================
  -- GOVERNING BODY
  -- ================================================================
  INSERT INTO properties (name, slug, property_type, sport, region, bio)
  VALUES (
    'Premiership Rugby Ltd',
    'premiership-rugby-ltd',
    'governing_body',
    'rugby union',
    'Europe',
    'Premiership Rugby Ltd is the commercial and operational body responsible for running the Gallagher Premiership, the top tier of English professional rugby union. It manages broadcast rights, commercial partnerships, and league operations.'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_govbody_id;

  IF v_govbody_id IS NULL THEN
    SELECT id INTO v_govbody_id FROM properties WHERE slug = 'premiership-rugby-ltd';
  END IF;

  -- ================================================================
  -- TEAMS (10 clubs)
  -- ================================================================

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Bath Rugby', 'bath-rugby', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Bath', 'Bath Rugby is a professional rugby union club based in Bath, Somerset, competing in the Gallagher Premiership. Founded in 1865, the club plays home matches at The Recreation Ground.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_bath;
  IF v_bath IS NULL THEN SELECT id INTO v_bath FROM properties WHERE slug = 'bath-rugby'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Bristol Bears', 'bristol-bears', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Bristol', 'Bristol Bears are a professional rugby union club based in Bristol, competing in the Gallagher Premiership. The club plays at Ashton Gate Stadium and has undergone significant development since its rebrand from Bristol Rugby in 2018.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_bristol;
  IF v_bristol IS NULL THEN SELECT id INTO v_bristol FROM properties WHERE slug = 'bristol-bears'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Exeter Chiefs', 'exeter-chiefs', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Exeter', 'Exeter Chiefs are a professional rugby union club based in Exeter, Devon, competing in the Gallagher Premiership. The club plays at Sandy Park and were Premiership champions in 2020.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_exeter;
  IF v_exeter IS NULL THEN SELECT id INTO v_exeter FROM properties WHERE slug = 'exeter-chiefs'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Gloucester Rugby', 'gloucester-rugby', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Gloucester', 'Gloucester Rugby is a professional rugby union club based in Gloucester, competing in the Gallagher Premiership. One of the oldest clubs in English rugby, they play home matches at Kingsholm Stadium.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_gloucester;
  IF v_gloucester IS NULL THEN SELECT id INTO v_gloucester FROM properties WHERE slug = 'gloucester-rugby'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Harlequins', 'harlequins', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'London', 'Harlequins are a professional rugby union club based in Twickenham, London, competing in the Gallagher Premiership. Founded in 1866, the club is known for their distinctive multi-coloured quartered jersey and play at The Stoop.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_harlequins;
  IF v_harlequins IS NULL THEN SELECT id INTO v_harlequins FROM properties WHERE slug = 'harlequins'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Leicester Tigers', 'leicester-tigers', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Leicester', 'Leicester Tigers are a professional rugby union club based in Leicester, competing in the Gallagher Premiership. The most decorated club in English rugby history, they play at Welford Road.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_tigers;
  IF v_tigers IS NULL THEN SELECT id INTO v_tigers FROM properties WHERE slug = 'leicester-tigers'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Northampton Saints', 'northampton-saints', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Northampton', 'Northampton Saints are a professional rugby union club based in Northampton, competing in the Gallagher Premiership. The club plays at cinch Stadium at Franklin''s Gardens.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_northampton;
  IF v_northampton IS NULL THEN SELECT id INTO v_northampton FROM properties WHERE slug = 'northampton-saints'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Sale Sharks', 'sale-sharks', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Sale', 'Sale Sharks are a professional rugby union club based in Sale, Greater Manchester, competing in the Gallagher Premiership. The club plays at AJ Bell Stadium.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_sale;
  IF v_sale IS NULL THEN SELECT id INTO v_sale FROM properties WHERE slug = 'sale-sharks'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Saracens', 'saracens', 'team', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'London', 'Saracens are a professional rugby union club based in London, competing in the Gallagher Premiership. The club plays at the Allianz Stadium in Barnet and are four-time Premiership champions.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_saracens;
  IF v_saracens IS NULL THEN SELECT id INTO v_saracens FROM properties WHERE slug = 'saracens'; END IF;

  -- Note: Wasps were excluded from 2023/24 due to administration. Included here
  -- as a placeholder for when/if they return. Slug reserved.

  -- ================================================================
  -- ATHLETES (representative 11-player set)
  -- ================================================================

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Finn Russell', 'finn-russell', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Finn Russell is a Scottish fly-half playing for Bath Rugby in the Gallagher Premiership. Known for his creative and unpredictable style of play, he is a key figure for both club and country.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_finn_russell;
  IF v_finn_russell IS NULL THEN SELECT id INTO v_finn_russell FROM properties WHERE slug = 'finn-russell'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Henry Slade', 'henry-slade', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Henry Slade is an English centre and wing playing for Exeter Chiefs in the Gallagher Premiership. He is a regular England international known for his elusive running and accurate kicking.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_henry_slade;
  IF v_henry_slade IS NULL THEN SELECT id INTO v_henry_slade FROM properties WHERE slug = 'henry-slade'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Ellis Genge', 'ellis-genge', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Ellis Genge is an English loosehead prop and club captain of Bristol Bears in the Gallagher Premiership. A powerful scrummager and ball carrier, he is a regular starter for the England national team.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_ellis_genge;
  IF v_ellis_genge IS NULL THEN SELECT id INTO v_ellis_genge FROM properties WHERE slug = 'ellis-genge'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Maro Itoje', 'maro-itoje', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Maro Itoje is an English lock and flanker playing for Saracens in the Gallagher Premiership. One of the leading forwards in world rugby, he captains both his club and has been central to England''s forward pack for over a decade.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_maro_itoje;
  IF v_maro_itoje IS NULL THEN SELECT id INTO v_maro_itoje FROM properties WHERE slug = 'maro-itoje'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Sam Underhill', 'sam-underhill', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Sam Underhill is an English openside flanker playing for Bath Rugby in the Gallagher Premiership. Known for his defensive work rate and turnover ability, he is a consistent England international.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_sam_underhill;
  IF v_sam_underhill IS NULL THEN SELECT id INTO v_sam_underhill FROM properties WHERE slug = 'sam-underhill'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Ben Youngs', 'ben-youngs', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Ben Youngs is an English scrum-half playing for Leicester Tigers in the Gallagher Premiership. England''s most-capped player, he is a club legend at Welford Road with over 120 international appearances.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_ben_youngs;
  IF v_ben_youngs IS NULL THEN SELECT id INTO v_ben_youngs FROM properties WHERE slug = 'ben-youngs'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('George Ford', 'george-ford', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'George Ford is an English fly-half playing for Sale Sharks in the Gallagher Premiership. A prolific points scorer and consistent international playmaker, he returned to England''s starting role under Steve Borthwick.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_george_ford;
  IF v_george_ford IS NULL THEN SELECT id INTO v_george_ford FROM properties WHERE slug = 'george-ford'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Tommy Taylor', 'tommy-taylor', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Tommy Taylor is an English hooker playing for Sale Sharks in the Gallagher Premiership. A strong lineout operator and ball carrier, he has represented England at various levels.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_tommy_taylor;
  IF v_tommy_taylor IS NULL THEN SELECT id INTO v_tommy_taylor FROM properties WHERE slug = 'tommy-taylor'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Alex Lozowski', 'alex-lozowski', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Alex Lozowski is an English utility back playing for Saracens in the Gallagher Premiership. Capable at fly-half, inside centre, and fullback, he is a reliable goal-kicker and consistent performer at club level.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_alex_lozowski;
  IF v_alex_lozowski IS NULL THEN SELECT id INTO v_alex_lozowski FROM properties WHERE slug = 'alex-lozowski'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Ben Morgan', 'ben-morgan', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Ben Morgan is an English number eight playing for Gloucester Rugby in the Gallagher Premiership. A powerful ball carrier and line-breaker, he is a senior figure in the Gloucester squad.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_ben_morgan;
  IF v_ben_morgan IS NULL THEN SELECT id INTO v_ben_morgan FROM properties WHERE slug = 'ben-morgan'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Tom Curry', 'tom-curry-rugby', 'athlete', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Tom Curry is an English flanker playing for Sale Sharks in the Gallagher Premiership. One of England''s most important forwards, he is a dynamic ball carrier and defender who has played in multiple Rugby World Cups.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_tom_curry;
  IF v_tom_curry IS NULL THEN SELECT id INTO v_tom_curry FROM properties WHERE slug = 'tom-curry-rugby'; END IF;

  -- ================================================================
  -- VENUES (one per club, plus Allianz for Saracens)
  -- ================================================================

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('The Recreation Ground', 'the-recreation-ground-bath', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Bath', 'The Recreation Ground, known as The Rec, is the home ground of Bath Rugby located in the centre of Bath, Somerset. With a capacity of around 14,500, it is one of the most distinctive stadium settings in English rugby.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_rec;
  IF v_rec IS NULL THEN SELECT id INTO v_rec FROM properties WHERE slug = 'the-recreation-ground-bath'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Ashton Gate Stadium', 'ashton-gate-stadium', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Bristol', 'Ashton Gate Stadium is a multi-sport venue in Bristol shared by Bristol Bears and Bristol City FC. The stadium has a capacity of approximately 27,000 and underwent significant redevelopment in 2016.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_ashton_gate;
  IF v_ashton_gate IS NULL THEN SELECT id INTO v_ashton_gate FROM properties WHERE slug = 'ashton-gate-stadium'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Sandy Park', 'sandy-park', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Exeter', 'Sandy Park is the home ground of Exeter Chiefs, located in Exeter, Devon. The stadium has a capacity of approximately 12,500 and has hosted European Champions Cup and international fixtures.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_sandy_park;
  IF v_sandy_park IS NULL THEN SELECT id INTO v_sandy_park FROM properties WHERE slug = 'sandy-park'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Kingsholm Stadium', 'kingsholm-stadium', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Gloucester', 'Kingsholm Stadium is the home ground of Gloucester Rugby, located in Gloucester. One of the oldest rugby grounds in England, it has a capacity of approximately 16,500 and is known for its passionate matchday atmosphere.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_kingsholm;
  IF v_kingsholm IS NULL THEN SELECT id INTO v_kingsholm FROM properties WHERE slug = 'kingsholm-stadium'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('The Stoop', 'the-stoop', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'London', 'The Stoop is the home ground of Harlequins, located in Twickenham, southwest London. With a capacity of approximately 14,800, it is named after former Harlequins player Adrian Stoop.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_twickenham_stoop;
  IF v_twickenham_stoop IS NULL THEN SELECT id INTO v_twickenham_stoop FROM properties WHERE slug = 'the-stoop'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Welford Road', 'welford-road', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Leicester', 'Welford Road is the home ground of Leicester Tigers, located in Leicester. With a capacity of approximately 23,500, it is one of the largest rugby-specific stadiums in England and has hosted international matches.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_welford_road;
  IF v_welford_road IS NULL THEN SELECT id INTO v_welford_road FROM properties WHERE slug = 'welford-road'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('cinch Stadium at Franklin''s Gardens', 'cinch-stadium-franklins-gardens', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Northampton', 'cinch Stadium at Franklin''s Gardens is the home ground of Northampton Saints, located in Northampton. The stadium has a capacity of approximately 15,000 and has hosted European and international matches.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_cinch_stadium;
  IF v_cinch_stadium IS NULL THEN SELECT id INTO v_cinch_stadium FROM properties WHERE slug = 'cinch-stadium-franklins-gardens'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('AJ Bell Stadium', 'aj-bell-stadium', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'Sale', 'AJ Bell Stadium is a multi-sport venue in Salford, Greater Manchester, shared by Sale Sharks and Salford Red Devils. The stadium has a capacity of approximately 12,000.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_ajs_stadium;
  IF v_ajs_stadium IS NULL THEN SELECT id INTO v_ajs_stadium FROM properties WHERE slug = 'aj-bell-stadium'; END IF;

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, city, bio)
  VALUES ('Allianz Stadium', 'allianz-stadium-twickenham', 'venue', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'London', 'Allianz Stadium, formerly known as StoneX Stadium, is the home ground of Saracens, located in Barnet, north London. The stadium has a capacity of approximately 10,000 following redevelopment.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_allianz;
  IF v_allianz IS NULL THEN SELECT id INTO v_allianz FROM properties WHERE slug = 'allianz-stadium-twickenham'; END IF;

  -- ================================================================
  -- EVENT
  -- ================================================================

  INSERT INTO properties (name, slug, property_type, sport, region, country, country_code, bio)
  VALUES ('Gallagher Premiership Final 2026', 'premiership-rugby-final-2026', 'event', 'rugby union', 'Europe', 'United Kingdom', 'GB', 'The Gallagher Premiership Final is the annual championship final of English professional rugby union. The 2026 edition will determine the Premiership champion for the 2025/26 season, played at Twickenham Stadium.')
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_prem_final;
  IF v_prem_final IS NULL THEN SELECT id INTO v_prem_final FROM properties WHERE slug = 'premiership-rugby-final-2026'; END IF;

  -- ================================================================
  -- RELATIONSHIPS
  -- ================================================================

  -- Governing body -> series
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_govbody_id, v_series_id, 'governing_body_oversees_series'
  WHERE NOT EXISTS (
    SELECT 1 FROM property_relationships
    WHERE from_id = v_govbody_id AND to_id = v_series_id
      AND relationship_type = 'governing_body_oversees_series'
  );

  -- Series -> teams
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, unnest(ARRAY[v_bath, v_bristol, v_exeter, v_gloucester,
    v_harlequins, v_tigers, v_northampton, v_sale, v_saracens]), 'series_has_team'
  WHERE NOT EXISTS (
    SELECT 1 FROM property_relationships
    WHERE from_id = v_series_id AND to_id = unnest(ARRAY[v_bath]) AND relationship_type = 'series_has_team'
  ); -- Note: this pattern is simplified; the RPC uses individual IF NOT EXISTS blocks

  -- The pattern below is safer for this seed file:

  -- series_has_team (individual)
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_bath, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_bath AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_bristol, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_bristol AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_exeter, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_exeter AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_gloucester, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_gloucester AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_harlequins, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_harlequins AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_tigers, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_tigers AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_northampton, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_northampton AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_sale, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_sale AND relationship_type = 'series_has_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_saracens, 'series_has_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_saracens AND relationship_type = 'series_has_team');

  -- series_contains_event
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_series_id, v_prem_final, 'series_contains_event'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_series_id AND to_id = v_prem_final AND relationship_type = 'series_contains_event');

  -- athlete_competes_in_series
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_finn_russell, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_finn_russell AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_henry_slade, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_henry_slade AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_ellis_genge, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_ellis_genge AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_maro_itoje, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_maro_itoje AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_sam_underhill, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_sam_underhill AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_ben_youngs, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_ben_youngs AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_george_ford, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_george_ford AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_tommy_taylor, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_tommy_taylor AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_alex_lozowski, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_alex_lozowski AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_ben_morgan, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_ben_morgan AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_tom_curry, v_series_id, 'athlete_competes_in_series'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_tom_curry AND to_id = v_series_id AND relationship_type = 'athlete_competes_in_series');

  -- athlete_belongs_to_team + team_has_athlete
  -- Bath: Finn Russell, Sam Underhill
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_finn_russell, v_bath, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_finn_russell AND to_id = v_bath AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_bath, v_finn_russell, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_bath AND to_id = v_finn_russell AND relationship_type = 'team_has_athlete');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_sam_underhill, v_bath, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_sam_underhill AND to_id = v_bath AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_bath, v_sam_underhill, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_bath AND to_id = v_sam_underhill AND relationship_type = 'team_has_athlete');

  -- Bristol: Ellis Genge
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_ellis_genge, v_bristol, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_ellis_genge AND to_id = v_bristol AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_bristol, v_ellis_genge, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_bristol AND to_id = v_ellis_genge AND relationship_type = 'team_has_athlete');

  -- Exeter: Henry Slade
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_henry_slade, v_exeter, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_henry_slade AND to_id = v_exeter AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_exeter, v_henry_slade, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_exeter AND to_id = v_henry_slade AND relationship_type = 'team_has_athlete');

  -- Gloucester: Ben Morgan
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_ben_morgan, v_gloucester, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_ben_morgan AND to_id = v_gloucester AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_gloucester, v_ben_morgan, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_gloucester AND to_id = v_ben_morgan AND relationship_type = 'team_has_athlete');

  -- Leicester: Ben Youngs
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_ben_youngs, v_tigers, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_ben_youngs AND to_id = v_tigers AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_tigers, v_ben_youngs, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_tigers AND to_id = v_ben_youngs AND relationship_type = 'team_has_athlete');

  -- Saracens: Maro Itoje, Alex Lozowski
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_maro_itoje, v_saracens, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_maro_itoje AND to_id = v_saracens AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_saracens, v_maro_itoje, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_saracens AND to_id = v_maro_itoje AND relationship_type = 'team_has_athlete');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_alex_lozowski, v_saracens, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_alex_lozowski AND to_id = v_saracens AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_saracens, v_alex_lozowski, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_saracens AND to_id = v_alex_lozowski AND relationship_type = 'team_has_athlete');

  -- Sale: George Ford, Tommy Taylor, Tom Curry
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_george_ford, v_sale, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_george_ford AND to_id = v_sale AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_sale, v_george_ford, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_sale AND to_id = v_george_ford AND relationship_type = 'team_has_athlete');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_tommy_taylor, v_sale, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_tommy_taylor AND to_id = v_sale AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_sale, v_tommy_taylor, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_sale AND to_id = v_tommy_taylor AND relationship_type = 'team_has_athlete');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_tom_curry, v_sale, 'athlete_belongs_to_team'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_tom_curry AND to_id = v_sale AND relationship_type = 'athlete_belongs_to_team');

  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_sale, v_tom_curry, 'team_has_athlete'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_sale AND to_id = v_tom_curry AND relationship_type = 'team_has_athlete');

  -- event_at_venue (Premiership Final at Twickenham -- using Allianz Stadium slug as placeholder)
  -- Note: the Final is typically held at Twickenham Stadium (not Allianz).
  -- Twickenham Stadium slug should be added separately. Using allianz-stadium-twickenham
  -- as a placeholder until the correct venue is added.
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_prem_final, v_allianz, 'event_at_venue'
  WHERE NOT EXISTS (SELECT 1 FROM property_relationships WHERE from_id = v_prem_final AND to_id = v_allianz AND relationship_type = 'event_at_venue');

  RAISE NOTICE 'Premiership Rugby 2026 seed complete.';

END $seed$;
