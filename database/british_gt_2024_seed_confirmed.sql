-- british_gt_2024_seed_confirmed.sql
-- CONFIRMED-ONLY SEED -- British GT Championship 2024
--
-- Status: Ready for review -- NOT YET EXECUTED
-- Prerequisite: universal_property_model_phase1 migration must be applied
--
-- Scope: 17 properties, 16 relationships, 8 aliases
-- Excluded: all 7 events (dates unverified), teams 4-12, athletes 7-20
-- See: british_gt_2024_seed_expansion_notes.md for excluded items
--
-- Confirmation basis per entity is documented inline.
-- DO NOT execute cleanup of synthetic data until this seed is inserted and reviewed.

DO $$
DECLARE
  -- Series / governing body
  v_british_gt          uuid;
  v_sro                 uuid;

  -- Venues (6 confirmed rounds)
  v_oulton_park         uuid;
  v_silverstone         uuid;
  v_donington           uuid;
  v_snetterton          uuid;
  v_spa                 uuid;
  v_brands_hatch        uuid;

  -- Teams (3 confirmed pairings)
  v_barwell             uuid;
  v_two_seas            uuid;
  v_blackthorn          uuid;

  -- Athletes (6 confirmed with verified team assignments)
  v_rob_collard         uuid;
  v_ricky_collard       uuid;
  v_phil_keen           uuid;
  v_ian_loggie          uuid;
  v_jonny_adam          uuid;
  v_giacomo_petrobelli  uuid;

BEGIN

  -- ================================================================
  -- SERIES
  -- Confirmed: British GT Championship is the primary UK GT series,
  -- sanctioned by SRO, held annually in Great Britain (and Spa, BE).
  -- Country GB assigned for the series home jurisdiction.
  -- ================================================================

  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'British GT Championship',
    'series',
    'motorsport',
    'british-gt-championship',
    'GB',
    'The British GT Championship is the United Kingdom''s premier GT racing series, contested annually across circuits in Great Britain and Continental Europe. The series is sanctioned by SRO Motorsports Group and features GT3 and GT4 class competition.'
  ) RETURNING id INTO v_british_gt;


  -- ================================================================
  -- GOVERNING BODY
  -- Confirmed: SRO Motorsports Group sanctions British GT. SRO is
  -- headquartered in Brussels, Belgium (country_code BE).
  -- ================================================================

  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, city, bio
  ) VALUES (
    'SRO Motorsports Group',
    'governing_body',
    'motorsport',
    'sro-motorsports-group',
    'BE',
    'Brussels',
    'SRO Motorsports Group is the international motorsport organisation that sanctions and manages the British GT Championship and multiple GT series worldwide, including the Fanatec GT World Challenge. Headquartered in Brussels, Belgium.'
  ) RETURNING id INTO v_sro;


  -- ================================================================
  -- VENUES
  -- All 6 confirmed rounds of the 2024 British GT season calendar.
  -- Venue identities and locations are well-established public record.
  -- NOTE: event_start_date / event_end_date are NOT set here --
  -- all specific round dates require verification before insertion.
  -- ================================================================

  -- Oulton Park -- confirmed Round 1 / 2 host
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, city, region, bio
  ) VALUES (
    'Oulton Park',
    'venue',
    'motorsport',
    'oulton-park',
    'GB',
    'Little Budworth',
    'Cheshire',
    'Oulton Park is a natural-terrain road racing circuit in Cheshire, England. A traditional opener for the British GT Championship calendar.'
  ) RETURNING id INTO v_oulton_park;

  -- Silverstone -- confirmed host
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, city, region, bio
  ) VALUES (
    'Silverstone Circuit',
    'venue',
    'motorsport',
    'silverstone-circuit',
    'GB',
    'Silverstone',
    'Northamptonshire',
    'Silverstone Circuit is the home of British motorsport in Northamptonshire, England. The circuit hosts the British Grand Prix and is a regular British GT venue.'
  ) RETURNING id INTO v_silverstone;

  -- Donington Park -- confirmed host
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, city, region, bio
  ) VALUES (
    'Donington Park',
    'venue',
    'motorsport',
    'donington-park',
    'GB',
    'Castle Donington',
    'Leicestershire',
    'Donington Park is a motorsport circuit in Leicestershire, England, with a long history of hosting national and international racing series including British GT.'
  ) RETURNING id INTO v_donington;

  -- Snetterton -- confirmed host
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, city, region, bio
  ) VALUES (
    'Snetterton Circuit',
    'venue',
    'motorsport',
    'snetterton-circuit',
    'GB',
    'Snetterton',
    'Norfolk',
    'Snetterton Circuit is a motorsport circuit in Norfolk, England, a regular venue on the British GT Championship calendar.'
  ) RETURNING id INTO v_snetterton;

  -- Circuit de Spa-Francorchamps -- confirmed continental round
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, city, region, bio
  ) VALUES (
    'Circuit de Spa-Francorchamps',
    'venue',
    'motorsport',
    'circuit-de-spa-francorchamps',
    'BE',
    'Stavelot',
    'Liege',
    'Circuit de Spa-Francorchamps is a legendary racing circuit in the Belgian Ardennes. British GT includes a continental round at Spa as its sole non-UK venue.'
  ) RETURNING id INTO v_spa;

  -- Brands Hatch -- confirmed season finale host
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, city, region, bio
  ) VALUES (
    'Brands Hatch',
    'venue',
    'motorsport',
    'brands-hatch',
    'GB',
    'Fawkham',
    'Kent',
    'Brands Hatch is a classic circuit in Kent, England. It regularly hosts the British GT Championship season finale on its Grand Prix layout.'
  ) RETURNING id INTO v_brands_hatch;


  -- ================================================================
  -- TEAMS
  -- 3 confirmed entries with verified driver pairings.
  -- Team identity, car numbers, and manufacturer confirmed via
  -- multiple public sources for the 2024 season.
  -- ================================================================

  -- Barwell Motorsport
  -- Confirmed: Pro-Am class champions 2024, car #63, Lamborghini Huracan GT3 Evo2,
  -- drivers Rob Collard (Pro) and Ricky Collard (Am).
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Barwell Motorsport',
    'team',
    'motorsport',
    'barwell-motorsport',
    'GB',
    'Barwell Motorsport is one of the most decorated GT racing outfits in British motorsport, competing with Lamborghini machinery. The team won the British GT Pro-Am championship in 2024 with Rob and Ricky Collard sharing car #63.'
  ) RETURNING id INTO v_barwell;

  -- 2 Seas Motorsport
  -- Confirmed: entered British GT 2024 with Mercedes-AMG GT3 Evo,
  -- Phil Keen (Pro) and Ian Loggie (Am). Corrected from earlier
  -- incorrect McLaren attribution; team also corrected from RAM Racing.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    '2 Seas Motorsport',
    'team',
    'motorsport',
    '2-seas-motorsport',
    'GB',
    '2 Seas Motorsport competes in the British GT Championship running Mercedes-AMG GT3 Evo machinery. In 2024 the team fielded Phil Keen and Ian Loggie.'
  ) RETURNING id INTO v_two_seas;

  -- Blackthorn Motorsport
  -- Confirmed: ran car #87 Aston Martin Vantage GT3 in 2024 British GT,
  -- Jonny Adam (Pro) and Giacomo Petrobelli (Am). Corrected from earlier
  -- incorrect TF Sport attribution.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Blackthorn Motorsport',
    'team',
    'motorsport',
    'blackthorn-motorsport',
    'GB',
    'Blackthorn Motorsport competes in the British GT Championship with Aston Martin Vantage GT3 machinery. In 2024 the team ran car #87 for Jonny Adam and Giacomo Petrobelli.'
  ) RETURNING id INTO v_blackthorn;


  -- ================================================================
  -- ATHLETES
  -- 6 confirmed athletes with verified team assignments and car numbers.
  -- Pro/Am role designations reflect British GT driver grading.
  -- country_code = GB for all confirmed UK-based drivers.
  -- Giacomo Petrobelli: country_code left NULL (nationality unconfirmed).
  -- ================================================================

  -- Rob Collard (Pro, Barwell #63)
  -- Confirmed: Pro driver, Barwell Motorsport, car #63, Pro-Am class champion 2024.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Rob Collard',
    'athlete',
    'motorsport',
    'rob-collard',
    'GB',
    'Rob Collard is a professional GT racing driver from the United Kingdom. In 2024 he competed in the British GT Championship for Barwell Motorsport, sharing car #63 with his son Ricky Collard. The pairing won the Pro-Am class title.'
  ) RETURNING id INTO v_rob_collard;

  -- Ricky Collard (Am, Barwell #63)
  -- Confirmed: Am driver, Barwell Motorsport, car #63, Pro-Am class champion 2024.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Ricky Collard',
    'athlete',
    'motorsport',
    'ricky-collard',
    'GB',
    'Ricky Collard is a racing driver from the United Kingdom. In 2024 he competed in the British GT Championship for Barwell Motorsport, sharing car #63 with his father Rob Collard. The pairing won the Pro-Am class title.'
  ) RETURNING id INTO v_ricky_collard;

  -- Phil Keen (Pro, 2 Seas)
  -- Confirmed: Pro-rated driver, 2 Seas Motorsport, Mercedes-AMG GT3 Evo 2024.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Phil Keen',
    'athlete',
    'motorsport',
    'phil-keen',
    'GB',
    'Phil Keen is an experienced British GT Pro-class driver. In 2024 he competed for 2 Seas Motorsport in the British GT Championship, sharing a Mercedes-AMG GT3 Evo with Ian Loggie.'
  ) RETURNING id INTO v_phil_keen;

  -- Ian Loggie (Am, 2 Seas)
  -- Confirmed: Am-rated driver, 2 Seas Motorsport, Mercedes-AMG GT3 Evo 2024.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Ian Loggie',
    'athlete',
    'motorsport',
    'ian-loggie',
    'GB',
    'Ian Loggie is a racing driver competing in the British GT Championship. In 2024 he raced for 2 Seas Motorsport, partnered with Phil Keen in a Mercedes-AMG GT3 Evo.'
  ) RETURNING id INTO v_ian_loggie;

  -- Jonny Adam (Pro, Blackthorn #87)
  -- Confirmed: multiple British GT champion, Pro-rated, Blackthorn Motorsport,
  -- car #87, Aston Martin Vantage GT3 2024.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Jonny Adam',
    'athlete',
    'motorsport',
    'jonny-adam',
    'GB',
    'Jonny Adam is a multiple British GT Championship-winning Pro driver. In 2024 he competed for Blackthorn Motorsport in car #87, partnered with Giacomo Petrobelli in an Aston Martin Vantage GT3.'
  ) RETURNING id INTO v_jonny_adam;

  -- Giacomo Petrobelli (Am, Blackthorn #87)
  -- Confirmed: Am driver, Blackthorn Motorsport, car #87, Aston Martin Vantage GT3 2024.
  -- country_code NULL: nationality not confirmed in available sources.
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code, bio
  ) VALUES (
    'Giacomo Petrobelli',
    'athlete',
    'motorsport',
    'giacomo-petrobelli',
    NULL,
    'Giacomo Petrobelli is a racing driver competing in the British GT Championship. In 2024 he raced for Blackthorn Motorsport in car #87, partnered with Jonny Adam in an Aston Martin Vantage GT3.'
  ) RETURNING id INTO v_giacomo_petrobelli;


  -- ================================================================
  -- RELATIONSHIPS
  --
  -- 16 relationships total:
  --   1  governing_body_oversees_series
  --   3  team_competes_in_series
  --   6  athlete_belongs_to_team  (with car_number / role metadata)
  --   6  athlete_competes_in_series
  --
  -- valid_from / valid_to use calendar-year bounds for 2024 season.
  -- No event_at_venue or series_contains_event relationships --
  -- these require verified event dates (see expansion notes).
  -- ================================================================

  -- 1. Governing body -> series (ongoing; valid_to left NULL)
  INSERT INTO public.property_relationships (
    from_id, to_id, relationship_type, valid_from
  ) VALUES (
    v_sro, v_british_gt, 'governing_body_oversees_series', '2024-01-01'
  );

  -- 2. Teams compete in series (2024 season)
  INSERT INTO public.property_relationships (
    from_id, to_id, relationship_type, valid_from, valid_to
  ) VALUES
    (v_barwell,    v_british_gt, 'team_competes_in_series', '2024-01-01', '2024-12-31'),
    (v_two_seas,   v_british_gt, 'team_competes_in_series', '2024-01-01', '2024-12-31'),
    (v_blackthorn, v_british_gt, 'team_competes_in_series', '2024-01-01', '2024-12-31');

  -- 3. Athletes belong to teams (2024 season; car_number and role in metadata)
  INSERT INTO public.property_relationships (
    from_id, to_id, relationship_type, valid_from, valid_to, metadata
  ) VALUES
    -- Barwell #63 Pro-Am pairing
    (
      v_rob_collard, v_barwell,
      'athlete_belongs_to_team', '2024-01-01', '2024-12-31',
      '{"car_number": "63", "driver_role": "Pro", "class": "Pro-Am", "championship_result": "Pro-Am champions 2024"}'
    ),
    (
      v_ricky_collard, v_barwell,
      'athlete_belongs_to_team', '2024-01-01', '2024-12-31',
      '{"car_number": "63", "driver_role": "Am", "class": "Pro-Am", "championship_result": "Pro-Am champions 2024"}'
    ),
    -- 2 Seas pairing (car number unconfirmed -- omitted from metadata)
    (
      v_phil_keen, v_two_seas,
      'athlete_belongs_to_team', '2024-01-01', '2024-12-31',
      '{"driver_role": "Pro"}'
    ),
    (
      v_ian_loggie, v_two_seas,
      'athlete_belongs_to_team', '2024-01-01', '2024-12-31',
      '{"driver_role": "Am"}'
    ),
    -- Blackthorn #87 pairing
    (
      v_jonny_adam, v_blackthorn,
      'athlete_belongs_to_team', '2024-01-01', '2024-12-31',
      '{"car_number": "87", "driver_role": "Pro"}'
    ),
    (
      v_giacomo_petrobelli, v_blackthorn,
      'athlete_belongs_to_team', '2024-01-01', '2024-12-31',
      '{"car_number": "87", "driver_role": "Am"}'
    );

  -- 4. Athletes compete in series (2024 season)
  INSERT INTO public.property_relationships (
    from_id, to_id, relationship_type, valid_from, valid_to
  ) VALUES
    (v_rob_collard,          v_british_gt, 'athlete_competes_in_series', '2024-01-01', '2024-12-31'),
    (v_ricky_collard,        v_british_gt, 'athlete_competes_in_series', '2024-01-01', '2024-12-31'),
    (v_phil_keen,            v_british_gt, 'athlete_competes_in_series', '2024-01-01', '2024-12-31'),
    (v_ian_loggie,           v_british_gt, 'athlete_competes_in_series', '2024-01-01', '2024-12-31'),
    (v_jonny_adam,           v_british_gt, 'athlete_competes_in_series', '2024-01-01', '2024-12-31'),
    (v_giacomo_petrobelli,   v_british_gt, 'athlete_competes_in_series', '2024-01-01', '2024-12-31');

  -- NOTE: No event_at_venue or series_contains_event relationships inserted.
  -- All 7 British GT 2024 event dates are approximate (NEEDS_VERIFICATION).
  -- Venues are present as standalone properties for linkage once dates are confirmed.


  -- ================================================================
  -- ALIASES
  -- ================================================================

  INSERT INTO public.property_aliases (property_id, alias, alias_type) VALUES
    -- Series common shortforms
    (v_british_gt, 'British GT',        'abbreviation'),
    (v_british_gt, 'BGT',               'abbreviation'),

    -- Governing body abbreviation
    (v_sro,        'SRO',               'abbreviation'),

    -- Venue known shortforms
    (v_silverstone,  'Silverstone',      'common_name'),
    (v_spa,          'Spa-Francorchamps','common_name'),
    (v_spa,          'Spa',              'common_name'),
    (v_brands_hatch, 'Brands Hatch GP',  'variant'),

    -- Team shortform
    (v_two_seas,   '2 Seas',            'common_name');


  RAISE NOTICE '=========================================';
  RAISE NOTICE 'british_gt_2024_seed_confirmed.sql';
  RAISE NOTICE 'Properties inserted: 17';
  RAISE NOTICE '  1 series, 1 governing_body, 6 venues, 3 teams, 6 athletes';
  RAISE NOTICE 'Relationships inserted: 16';
  RAISE NOTICE '  1 governing_body_oversees_series';
  RAISE NOTICE '  3 team_competes_in_series';
  RAISE NOTICE '  6 athlete_belongs_to_team';
  RAISE NOTICE '  6 athlete_competes_in_series';
  RAISE NOTICE 'Aliases inserted: 8';
  RAISE NOTICE 'Events: NONE (all dates require verification)';
  RAISE NOTICE '=========================================';

END $$;
