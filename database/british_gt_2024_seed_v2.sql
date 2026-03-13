-- ============================================================
-- British GT Championship 2024 -- Seed SQL v2
-- Rewritten for Phase 1 schema (universal_property_model_phase1)
-- Date prepared: 2026-03-13
--
-- DO NOT EXECUTE until all items marked NEEDS_VERIFICATION
-- below have been confirmed against official 2024 results.
--
-- Schema requirements:
--   property_type = 'athlete'        (not 'driver')
--   property_type = 'venue'
--   property_type = 'governing_body'
--   sport = 'motorsport'             on all rows
--   country_code = ISO 3166-1 alpha-2
--   Canonical relationship names throughout
--   metadata JSONB on all relationships where useful
-- ============================================================

DO $$
DECLARE

  -- -------------------------------------------------------
  -- SERIES + GOVERNING BODY
  -- -------------------------------------------------------
  v_bgt_series          uuid;
  v_sro                 uuid;

  -- -------------------------------------------------------
  -- VENUES (6 circuits)
  -- -------------------------------------------------------
  v_oulton_park         uuid;
  v_silverstone         uuid;
  v_donington_park      uuid;
  v_snetterton          uuid;
  v_spa                 uuid;
  v_brands_hatch        uuid;

  -- -------------------------------------------------------
  -- EVENTS (7 rounds)
  -- Dates marked APPROXIMATE: verify against 2024 calendar
  -- -------------------------------------------------------
  v_rd1_oulton          uuid;
  v_rd2_donington       uuid;
  v_rd3_snetterton      uuid;
  v_rd4_silverstone     uuid;
  v_rd5_spa             uuid;
  v_rd6_donington2      uuid;
  v_rd7_brands          uuid;

  -- -------------------------------------------------------
  -- TEAMS (12 entries)
  -- v_barwell / v_two_seas / v_blackthorn: CONFIRMED
  -- All others: NEEDS_VERIFICATION
  -- -------------------------------------------------------
  v_barwell             uuid;   -- CONFIRMED: 2024 Pro-Am champion team
  v_two_seas            uuid;   -- CONFIRMED: Phil Keen / Ian Loggie
  v_blackthorn          uuid;   -- CONFIRMED: Jonny Adam / Petrobelli
  v_tf_sport            uuid;   -- NEEDS_VERIFICATION: Aston Martin, 2024 grid presence confirmed, lineup TBC
  v_ram_racing          uuid;   -- NEEDS_VERIFICATION
  v_optimum             uuid;   -- NEEDS_VERIFICATION: McLaren
  v_century             uuid;   -- NEEDS_VERIFICATION: BMW M4 GT3
  v_wpi                 uuid;   -- NEEDS_VERIFICATION: Lamborghini
  v_steller             uuid;   -- NEEDS_VERIFICATION: Audi R8 LMS GT3 Evo II
  v_enduro              uuid;   -- NEEDS_VERIFICATION: McLaren
  v_balfe               uuid;   -- NEEDS_VERIFICATION: McLaren
  v_fox_motorsport      uuid;   -- NEEDS_VERIFICATION: 12th team, identity uncertain

  -- -------------------------------------------------------
  -- ATHLETES (20 drivers)
  -- Athletes 1-6: CONFIRMED from corrected prior research
  -- Athletes 7-20: NEEDS_VERIFICATION
  -- -------------------------------------------------------
  v_rob_collard         uuid;   -- CONFIRMED: #63 Barwell, Pro-Am champion
  v_ricky_collard       uuid;   -- CONFIRMED: #63 Barwell, Pro-Am champion
  v_phil_keen           uuid;   -- CONFIRMED: 2 Seas, Pro driver
  v_ian_loggie          uuid;   -- CONFIRMED: 2 Seas, Am driver
  v_jonny_adam          uuid;   -- CONFIRMED: #87 Blackthorn, Pro driver
  v_giacomo_petrobelli  uuid;   -- CONFIRMED: #87 Blackthorn, Am driver

  v_sandy_mitchell      uuid;   -- NEEDS_VERIFICATION: likely Barwell second car
  v_ahmad_al_harthy     uuid;   -- NEEDS_VERIFICATION: likely TF Sport Am
  v_mark_farmer         uuid;   -- NEEDS_VERIFICATION: likely TF Sport Pro
  v_marco_sorensen      uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_sam_de_haan         uuid;   -- NEEDS_VERIFICATION: likely RAM Racing Pro
  v_patrik_matthiesen   uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_jordan_collard      uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_ben_tuck            uuid;   -- NEEDS_VERIFICATION: likely Century
  v_lewis_proctor       uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_will_moore          uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_graham_johnson      uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_marcus_clutton      uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_scott_malvern       uuid;   -- NEEDS_VERIFICATION: team assignment uncertain
  v_derek_johnston      uuid;   -- NEEDS_VERIFICATION: team assignment uncertain

BEGIN

  -- =========================================================
  -- SECTION 1: SERIES
  -- =========================================================

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'British GT Championship',
    'series',
    'motorsport',
    'GB',
    'The British GT Championship is the premier GT racing series in the United Kingdom, part of the SRO GT series family. The championship runs across iconic UK circuits and one continental round at Spa-Francorchamps.',
    'british-gt-championship'
  ) RETURNING id INTO v_bgt_series;


  -- =========================================================
  -- SECTION 2: GOVERNING BODY
  -- =========================================================

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio, slug
  ) VALUES (
    'SRO Motorsports Group',
    'governing_body',
    'motorsport',
    'BE',
    'Brussels',
    'SRO Motorsports Group is an international sanctioning and organising body for GT racing. Responsible for the British GT Championship, GT World Challenge series, and several national GT platforms.',
    'sro-motorsports-group'
  ) RETURNING id INTO v_sro;


  -- =========================================================
  -- SECTION 3: VENUES
  -- Coordinates: WGS84 decimal degrees
  -- =========================================================

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, region,
    latitude, longitude, bio, slug
  ) VALUES (
    'Oulton Park Circuit',
    'venue', 'motorsport', 'GB',
    'Little Budworth', 'Cheshire',
    53.180400, -2.602500,
    'Oulton Park is a 2.69-mile circuit in Cheshire, England. A complex, flowing layout regarded as one of the most technically demanding and visually dramatic circuits in British motorsport.',
    'oulton-park-circuit'
  ) RETURNING id INTO v_oulton_park;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, region,
    latitude, longitude, bio, slug
  ) VALUES (
    'Silverstone Circuit',
    'venue', 'motorsport', 'GB',
    'Silverstone', 'Northamptonshire',
    52.078600, -1.016900,
    'Silverstone Circuit is the home of British motorsport and the site of the British Grand Prix. The circuit spans 3.66 miles in the full Grand Prix configuration.',
    'silverstone-circuit'
  ) RETURNING id INTO v_silverstone;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, region,
    latitude, longitude, bio, slug
  ) VALUES (
    'Donington Park',
    'venue', 'motorsport', 'GB',
    'Castle Donington', 'Leicestershire',
    52.830800, -1.375400,
    'Donington Park is a 2.5-mile circuit in Leicestershire, England. Historic track with a fast, flowing layout and strong heritage in British touring car and GT racing.',
    'donington-park'
  ) RETURNING id INTO v_donington_park;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, region,
    latitude, longitude, bio, slug
  ) VALUES (
    'Snetterton Circuit',
    'venue', 'motorsport', 'GB',
    'Snetterton', 'Norfolk',
    52.464700, 0.936100,
    'Snetterton Circuit is a 3.0-mile racing circuit in Norfolk, England. The Snetterton 300 configuration is used for the British GT Championship, making it the longest circuit on the domestic calendar.',
    'snetterton-circuit'
  ) RETURNING id INTO v_snetterton;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, region,
    latitude, longitude, bio, slug
  ) VALUES (
    'Circuit de Spa-Francorchamps',
    'venue', 'motorsport', 'BE',
    'Francorchamps', 'Liège',
    50.437000, 5.971500,
    'Circuit de Spa-Francorchamps is a 4.35-mile circuit in the Ardennes forest of Belgium. One of the longest and most iconic circuits in world motorsport, home to the Belgian Grand Prix.',
    'circuit-de-spa-francorchamps'
  ) RETURNING id INTO v_spa;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, region,
    latitude, longitude, bio, slug
  ) VALUES (
    'Brands Hatch Circuit',
    'venue', 'motorsport', 'GB',
    'Fawkham', 'Kent',
    51.359000, 0.263500,
    'Brands Hatch is a 2.43-mile circuit in Kent, England. The Grand Prix loop serves as the British GT season finale venue, delivering dramatic racing through the undulating Kent countryside.',
    'brands-hatch-circuit'
  ) RETURNING id INTO v_brands_hatch;


  -- =========================================================
  -- SECTION 4: EVENTS
  -- All dates are APPROXIMATE based on typical BGT calendar
  -- structure. Verify against official 2024 calendar before
  -- executing this seed.
  -- =========================================================

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio,
    event_start_date, event_end_date, slug
  ) VALUES (
    'British GT 2024 Round 1 -- Oulton Park',
    'event', 'motorsport', 'GB', 'Little Budworth',
    'Opening round of the 2024 British GT Championship at Oulton Park Circuit, Cheshire. Easter weekend fixture.',
    '2024-04-06', '2024-04-07',
    'bgt-2024-rd1-oulton-park'
  ) RETURNING id INTO v_rd1_oulton;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio,
    event_start_date, event_end_date, slug
  ) VALUES (
    'British GT 2024 Round 2 -- Donington Park',
    'event', 'motorsport', 'GB', 'Castle Donington',
    'Round 2 of the 2024 British GT Championship at Donington Park, Leicestershire.',
    '2024-04-27', '2024-04-28',
    'bgt-2024-rd2-donington'
  ) RETURNING id INTO v_rd2_donington;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio,
    event_start_date, event_end_date, slug
  ) VALUES (
    'British GT 2024 Round 3 -- Snetterton 300',
    'event', 'motorsport', 'GB', 'Snetterton',
    'Round 3 of the 2024 British GT Championship at Snetterton Circuit, Norfolk. Run on the full 300 layout.',
    '2024-05-25', '2024-05-26',
    'bgt-2024-rd3-snetterton'
  ) RETURNING id INTO v_rd3_snetterton;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio,
    event_start_date, event_end_date, slug
  ) VALUES (
    'British GT 2024 Round 4 -- Silverstone',
    'event', 'motorsport', 'GB', 'Silverstone',
    'Round 4 of the 2024 British GT Championship at Silverstone Circuit, Northamptonshire.',
    '2024-06-22', '2024-06-23',
    'bgt-2024-rd4-silverstone'
  ) RETURNING id INTO v_rd4_silverstone;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio,
    event_start_date, event_end_date, slug
  ) VALUES (
    'British GT 2024 Round 5 -- Spa-Francorchamps',
    'event', 'motorsport', 'BE', 'Francorchamps',
    'Round 5 of the 2024 British GT Championship at Circuit de Spa-Francorchamps, Belgium. The sole continental round of the season.',
    '2024-07-27', '2024-07-28',
    'bgt-2024-rd5-spa'
  ) RETURNING id INTO v_rd5_spa;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio,
    event_start_date, event_end_date, slug
  ) VALUES (
    'British GT 2024 Round 6 -- Donington Park',
    'event', 'motorsport', 'GB', 'Castle Donington',
    'Round 6 of the 2024 British GT Championship at Donington Park, Leicestershire. Second visit to the circuit in the 2024 season.',
    '2024-09-07', '2024-09-08',
    'bgt-2024-rd6-donington-2'
  ) RETURNING id INTO v_rd6_donington2;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio,
    event_start_date, event_end_date, slug
  ) VALUES (
    'British GT 2024 Round 7 -- Brands Hatch',
    'event', 'motorsport', 'GB', 'Fawkham',
    'Season finale of the 2024 British GT Championship at Brands Hatch, Kent. Run on the Grand Prix circuit layout.',
    '2024-10-05', '2024-10-06',
    'bgt-2024-rd7-brands-hatch'
  ) RETURNING id INTO v_rd7_brands;


  -- =========================================================
  -- SECTION 5: TEAMS
  -- =========================================================

  -- --- CONFIRMED -------------------------------------------

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio, slug
  ) VALUES (
    'Barwell Motorsport',
    'team', 'motorsport', 'GB', 'Silverstone',
    'Barwell Motorsport is one of the most successful teams in British GT history, based near Silverstone. Long-standing Lamborghini partner in the UK, 2024 Pro-Am GT3 champions.',
    'barwell-motorsport'
  ) RETURNING id INTO v_barwell;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    '2 Seas Motorsport',
    'team', 'motorsport', 'GB',
    '2 Seas Motorsport is a regular front-runner in the British GT Pro-Am GT3 class, competing with Mercedes-AMG GT3 Evo machinery.',
    '2-seas-motorsport'
  ) RETURNING id INTO v_two_seas;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Blackthorn Motorsport',
    'team', 'motorsport', 'GB',
    'Blackthorn Motorsport competes in British GT with Aston Martin Vantage GT3 machinery, fielding experienced Pro-Am pairings.',
    'blackthorn-motorsport'
  ) RETURNING id INTO v_blackthorn;

  -- --- NEEDS_VERIFICATION ----------------------------------
  -- The following 9 teams are based on prior research and
  -- general knowledge of the 2024 British GT grid.
  -- Car models and team identities should be verified against
  -- the official 2024 entry list before execution.

  INSERT INTO public.properties (
    name, property_type, sport, country_code, city, bio, slug
  ) VALUES (
    'TF Sport',
    'team', 'motorsport', 'GB', 'Oxfordshire',
    'TF Sport is a leading British GT team running Aston Martin Vantage GT3 machinery, with strong Pro-Am class results across multiple seasons.',
    'tf-sport'
  ) RETURNING id INTO v_tf_sport;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'RAM Racing',
    'team', 'motorsport', 'GB',
    'RAM Racing competes in British GT with Mercedes-AMG GT3 machinery.',
    'ram-racing'
  ) RETURNING id INTO v_ram_racing;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Optimum Motorsport',
    'team', 'motorsport', 'GB',
    'Optimum Motorsport is a British GT team running McLaren 720S GT3 Evo machinery.',
    'optimum-motorsport'
  ) RETURNING id INTO v_optimum;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Century Motorsport',
    'team', 'motorsport', 'GB',
    'Century Motorsport competes in British GT with BMW M4 GT3 machinery.',
    'century-motorsport'
  ) RETURNING id INTO v_century;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'WPI Motorsport',
    'team', 'motorsport', 'GB',
    'WPI Motorsport competes in British GT with Lamborghini GT3 machinery.',
    'wpi-motorsport'
  ) RETURNING id INTO v_wpi;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Steller Motorsport',
    'team', 'motorsport', 'GB',
    'Steller Motorsport competes in British GT with Audi R8 LMS GT3 Evo II machinery.',
    'steller-motorsport'
  ) RETURNING id INTO v_steller;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Enduro Motorsport',
    'team', 'motorsport', 'GB',
    'Enduro Motorsport competes in British GT with McLaren GT3 machinery.',
    'enduro-motorsport'
  ) RETURNING id INTO v_enduro;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Balfe Motorsport',
    'team', 'motorsport', 'GB',
    'Balfe Motorsport is a long-standing British GT team competing with McLaren GT3 machinery.',
    'balfe-motorsport'
  ) RETURNING id INTO v_balfe;

  -- 12th team identity is uncertain. Placeholder name used.
  -- NEEDS_VERIFICATION: Confirm 12th team before execution.
  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Fox Motorsport',
    'team', 'motorsport', 'GB',
    'Fox Motorsport competes in British GT Championship.',
    'fox-motorsport'
  ) RETURNING id INTO v_fox_motorsport;


  -- =========================================================
  -- SECTION 6: ATHLETES
  -- =========================================================

  -- --- CONFIRMED: athletes 1-6 -----------------------------

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Rob Collard',
    'athlete', 'motorsport', 'GB',
    'Rob Collard is a veteran British GT Pro-Am driver. He and his son Ricky Collard won the 2024 British GT Pro-Am GT3 championship driving the #63 Barwell Motorsport Lamborghini Huracán GT3 EVO2.',
    'rob-collard'
  ) RETURNING id INTO v_rob_collard;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Ricky Collard',
    'athlete', 'motorsport', 'GB',
    'Ricky Collard is a British GT driver and son of Rob Collard. He and Rob won the 2024 British GT Pro-Am championship in the #63 Barwell Motorsport Lamborghini Huracán GT3 EVO2.',
    'ricky-collard'
  ) RETURNING id INTO v_ricky_collard;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Phil Keen',
    'athlete', 'motorsport', 'GB',
    'Phil Keen is an experienced British GT Pro driver with multiple class wins. In 2024 he competed for 2 Seas Motorsport in the Mercedes-AMG GT3 Evo alongside co-driver Ian Loggie.',
    'phil-keen'
  ) RETURNING id INTO v_phil_keen;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Ian Loggie',
    'athlete', 'motorsport', 'GB',
    'Ian Loggie is a Scottish GT Am driver who competed in the 2024 British GT Championship with 2 Seas Motorsport, co-driving with Phil Keen in the Mercedes-AMG GT3 Evo.',
    'ian-loggie'
  ) RETURNING id INTO v_ian_loggie;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Jonny Adam',
    'athlete', 'motorsport', 'GB',
    'Jonny Adam is a highly experienced British GT Pro driver and multiple GT3 champion. In 2024 he competed for Blackthorn Motorsport in the Aston Martin Vantage GT3 alongside co-driver Giacomo Petrobelli.',
    'jonny-adam'
  ) RETURNING id INTO v_jonny_adam;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Giacomo Petrobelli',
    'athlete', 'motorsport', 'IT',
    'Giacomo Petrobelli is an Italian GT Am driver who competed in the 2024 British GT Championship with Blackthorn Motorsport, co-driving with Jonny Adam in the #87 Aston Martin Vantage GT3.',
    'giacomo-petrobelli'
  ) RETURNING id INTO v_giacomo_petrobelli;

  -- --- NEEDS_VERIFICATION: athletes 7-20 ------------------
  -- Drivers below are based on prior research and general
  -- knowledge of the 2024 British GT grid. Team assignments
  -- and car numbers must be verified against official results
  -- before this seed is executed. Entries are included to
  -- preserve structure; do not treat as confirmed data.

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Sandy Mitchell',
    'athlete', 'motorsport', 'GB',
    'Sandy Mitchell is a Scottish GT Pro driver and regular Barwell Motorsport competitor in British GT.',
    'sandy-mitchell'
  ) RETURNING id INTO v_sandy_mitchell;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Ahmad Al Harthy',
    'athlete', 'motorsport', 'OM',
    'Ahmad Al Harthy is an Omani GT Am driver and long-standing competitor in British GT and international GT racing.',
    'ahmad-al-harthy'
  ) RETURNING id INTO v_ahmad_al_harthy;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Mark Farmer',
    'athlete', 'motorsport', 'GB',
    'Mark Farmer is a British GT Pro driver who has competed with TF Sport in Aston Martin machinery.',
    'mark-farmer'
  ) RETURNING id INTO v_mark_farmer;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Marco Sorensen',
    'athlete', 'motorsport', 'DK',
    'Marco Sorensen is a Danish GT Pro driver with extensive international GT experience who has competed in British GT.',
    'marco-sorensen'
  ) RETURNING id INTO v_marco_sorensen;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Sam De Haan',
    'athlete', 'motorsport', 'GB',
    'Sam De Haan is a British GT Pro driver who has competed with RAM Racing in Mercedes-AMG GT3 machinery.',
    'sam-de-haan'
  ) RETURNING id INTO v_sam_de_haan;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Patrik Matthiesen',
    'athlete', 'motorsport', 'DK',
    'Patrik Matthiesen is a Danish GT Pro driver who has competed in British GT Championship rounds.',
    'patrik-matthiesen'
  ) RETURNING id INTO v_patrik_matthiesen;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Jordan Collard',
    'athlete', 'motorsport', 'GB',
    'Jordan Collard is a British racing driver who has competed in the British GT Championship.',
    'jordan-collard'
  ) RETURNING id INTO v_jordan_collard;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Ben Tuck',
    'athlete', 'motorsport', 'GB',
    'Ben Tuck is a British GT driver who has competed with Century Motorsport in BMW M4 GT3 machinery.',
    'ben-tuck'
  ) RETURNING id INTO v_ben_tuck;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Lewis Proctor',
    'athlete', 'motorsport', 'GB',
    'Lewis Proctor is a British GT Pro driver who has competed in the British GT Championship.',
    'lewis-proctor'
  ) RETURNING id INTO v_lewis_proctor;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Will Moore',
    'athlete', 'motorsport', 'GB',
    'Will Moore is a British GT Pro driver who has competed in the British GT Championship.',
    'will-moore'
  ) RETURNING id INTO v_will_moore;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Graham Johnson',
    'athlete', 'motorsport', 'GB',
    'Graham Johnson is a British GT Am driver and regular competitor in the British GT Championship.',
    'graham-johnson'
  ) RETURNING id INTO v_graham_johnson;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Marcus Clutton',
    'athlete', 'motorsport', 'GB',
    'Marcus Clutton is a British GT Am driver and regular competitor in the British GT Championship.',
    'marcus-clutton'
  ) RETURNING id INTO v_marcus_clutton;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Scott Malvern',
    'athlete', 'motorsport', 'GB',
    'Scott Malvern is a British GT Pro driver who has competed in the British GT Championship.',
    'scott-malvern'
  ) RETURNING id INTO v_scott_malvern;

  INSERT INTO public.properties (
    name, property_type, sport, country_code, bio, slug
  ) VALUES (
    'Derek Johnston',
    'athlete', 'motorsport', 'GB',
    'Derek Johnston is a British GT Am driver and long-standing competitor in the British GT Championship.',
    'derek-johnston'
  ) RETURNING id INTO v_derek_johnston;


  -- =========================================================
  -- SECTION 7: PROPERTY ALIASES
  -- =========================================================

  INSERT INTO public.property_aliases (property_id, alias, alias_type)
  VALUES
    (v_bgt_series,    'British GT',             'common'),
    (v_bgt_series,    'BGT',                    'abbreviation'),
    (v_sro,           'SRO',                    'abbreviation'),
    (v_barwell,       'Barwell',                'common'),
    (v_two_seas,      '2 Seas',                 'common'),
    (v_blackthorn,    'Blackthorn',             'common'),
    (v_tf_sport,      'TF Sport',               'common'),
    (v_ram_racing,    'RAM',                    'abbreviation'),
    (v_silverstone,   'Silverstone',            'common'),
    (v_oulton_park,   'Oulton Park',            'common'),
    (v_donington_park,'Donington',              'common'),
    (v_snetterton,    'Snetterton',             'common'),
    (v_snetterton,    'Snetterton 300',         'common'),
    (v_spa,           'Spa',                    'common'),
    (v_spa,           'Spa-Francorchamps',      'common'),
    (v_brands_hatch,  'Brands Hatch',           'common'),
    (v_rob_collard,   'RC63',                   'common'),
    (v_ricky_collard, 'Ricky',                  'common');


  -- =========================================================
  -- SECTION 8: RELATIONSHIPS
  -- Insert order: governing -> containment -> location ->
  --               team entry -> athlete-team -> athlete-series
  -- =========================================================

  -- -------------------------------------------------------
  -- 8a. governing_body_oversees_series
  -- -------------------------------------------------------

  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata)
  VALUES (
    v_sro,
    v_bgt_series,
    'governing_body_oversees_series',
    '{"role": "sanctioning_body", "season": 2024}'::jsonb
  );


  -- -------------------------------------------------------
  -- 8b. series_contains_event  (series -> event)
  -- valid_from/valid_to mirror event dates for round scope
  -- -------------------------------------------------------

  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    (v_bgt_series, v_rd1_oulton,     'series_contains_event', '{"season": 2024, "round_number": 1}'::jsonb, '2024-04-06', '2024-04-07'),
    (v_bgt_series, v_rd2_donington,  'series_contains_event', '{"season": 2024, "round_number": 2}'::jsonb, '2024-04-27', '2024-04-28'),
    (v_bgt_series, v_rd3_snetterton, 'series_contains_event', '{"season": 2024, "round_number": 3}'::jsonb, '2024-05-25', '2024-05-26'),
    (v_bgt_series, v_rd4_silverstone,'series_contains_event', '{"season": 2024, "round_number": 4}'::jsonb, '2024-06-22', '2024-06-23'),
    (v_bgt_series, v_rd5_spa,        'series_contains_event', '{"season": 2024, "round_number": 5}'::jsonb, '2024-07-27', '2024-07-28'),
    (v_bgt_series, v_rd6_donington2, 'series_contains_event', '{"season": 2024, "round_number": 6}'::jsonb, '2024-09-07', '2024-09-08'),
    (v_bgt_series, v_rd7_brands,     'series_contains_event', '{"season": 2024, "round_number": 7}'::jsonb, '2024-10-05', '2024-10-06');


  -- -------------------------------------------------------
  -- 8c. event_at_venue  (event -> venue)
  -- Note: round 2 and round 6 both link to v_donington_park
  -- -------------------------------------------------------

  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type)
  VALUES
    (v_rd1_oulton,     v_oulton_park,     'event_at_venue'),
    (v_rd2_donington,  v_donington_park,  'event_at_venue'),
    (v_rd3_snetterton, v_snetterton,      'event_at_venue'),
    (v_rd4_silverstone,v_silverstone,     'event_at_venue'),
    (v_rd5_spa,        v_spa,             'event_at_venue'),
    (v_rd6_donington2, v_donington_park,  'event_at_venue'),
    (v_rd7_brands,     v_brands_hatch,    'event_at_venue');


  -- -------------------------------------------------------
  -- 8d. team_competes_in_series  (team -> series)
  -- valid_from/valid_to span the full 2024 season
  -- -------------------------------------------------------

  -- CONFIRMED teams
  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    (v_barwell,    v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "Lamborghini Huracán GT3 EVO2"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_two_seas,   v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "Mercedes-AMG GT3 Evo"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_blackthorn, v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "Aston Martin Vantage GT3"}'::jsonb,
     '2024-04-06', '2024-10-06');

  -- NEEDS_VERIFICATION teams
  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    (v_tf_sport,      v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "Aston Martin Vantage GT3", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ram_racing,    v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "Mercedes-AMG GT3", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_optimum,       v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "McLaren 720S GT3 Evo", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_century,       v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "BMW M4 GT3", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_wpi,           v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "Lamborghini Huracán GT3 EVO2", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_steller,       v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "Audi R8 LMS GT3 Evo II", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_enduro,        v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "McLaren 720S GT3 Evo", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_balfe,         v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "car_model": "McLaren 720S GT3 Evo", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_fox_motorsport,v_bgt_series, 'team_competes_in_series',
     '{"season": 2024, "class": "GT3", "note": "NEEDS_VERIFICATION: team identity and car unconfirmed"}'::jsonb,
     '2024-04-06', '2024-10-06');


  -- -------------------------------------------------------
  -- 8e. athlete_belongs_to_team  (athlete -> team)
  -- car_number included where confirmed
  -- -------------------------------------------------------

  -- CONFIRMED pairings

  -- #63 Barwell: Rob Collard (Pro) + Ricky Collard (Am) -- CHAMPIONS
  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    (v_rob_collard, v_barwell, 'athlete_belongs_to_team',
     '{"season": 2024, "car_number": 63, "car_model": "Lamborghini Huracán GT3 EVO2",
       "class": "GT3 Pro-Am", "role": "Pro",
       "championship_result": "2024 Pro-Am GT3 Champions"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ricky_collard, v_barwell, 'athlete_belongs_to_team',
     '{"season": 2024, "car_number": 63, "car_model": "Lamborghini Huracán GT3 EVO2",
       "class": "GT3 Pro-Am", "role": "Am",
       "championship_result": "2024 Pro-Am GT3 Champions"}'::jsonb,
     '2024-04-06', '2024-10-06');

  -- 2 Seas: Phil Keen (Pro) + Ian Loggie (Am)
  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    (v_phil_keen, v_two_seas, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Mercedes-AMG GT3 Evo",
       "class": "GT3 Pro-Am", "role": "Pro"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ian_loggie, v_two_seas, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Mercedes-AMG GT3 Evo",
       "class": "GT3 Pro-Am", "role": "Am"}'::jsonb,
     '2024-04-06', '2024-10-06');

  -- #87 Blackthorn: Jonny Adam (Pro) + Giacomo Petrobelli (Am)
  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    (v_jonny_adam, v_blackthorn, 'athlete_belongs_to_team',
     '{"season": 2024, "car_number": 87, "car_model": "Aston Martin Vantage GT3",
       "class": "GT3 Pro-Am", "role": "Pro"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_giacomo_petrobelli, v_blackthorn, 'athlete_belongs_to_team',
     '{"season": 2024, "car_number": 87, "car_model": "Aston Martin Vantage GT3",
       "class": "GT3 Pro-Am", "role": "Am"}'::jsonb,
     '2024-04-06', '2024-10-06');

  -- NEEDS_VERIFICATION pairings: team assignments are best estimates only

  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    (v_sandy_mitchell, v_barwell, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Lamborghini Huracán GT3 EVO2",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION: car number and co-driver unknown"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ahmad_al_harthy, v_tf_sport, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Aston Martin Vantage GT3",
       "class": "GT3 Pro-Am", "role": "Am",
       "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_mark_farmer, v_tf_sport, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Aston Martin Vantage GT3",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_marco_sorensen, v_tf_sport, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Aston Martin Vantage GT3",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION: team assignment uncertain"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_sam_de_haan, v_ram_racing, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Mercedes-AMG GT3",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_patrik_matthiesen, v_optimum, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "McLaren 720S GT3 Evo",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION: team assignment uncertain"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_jordan_collard, v_optimum, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "McLaren 720S GT3 Evo",
       "class": "GT3 Pro-Am", "role": "Am",
       "note": "NEEDS_VERIFICATION: team and role uncertain"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ben_tuck, v_century, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "BMW M4 GT3",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_lewis_proctor, v_century, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "BMW M4 GT3",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION: may be co-driver or separate car entry"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_will_moore, v_enduro, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "McLaren 720S GT3 Evo",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION: team assignment uncertain"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_graham_johnson, v_balfe, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "McLaren 720S GT3 Evo",
       "class": "GT3 Pro-Am", "role": "Am",
       "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_marcus_clutton, v_wpi, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Lamborghini Huracán GT3 EVO2",
       "class": "GT3 Pro-Am", "role": "Am",
       "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_scott_malvern, v_steller, 'athlete_belongs_to_team',
     '{"season": 2024, "car_model": "Audi R8 LMS GT3 Evo II",
       "class": "GT3 Pro-Am", "role": "Pro",
       "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_derek_johnston, v_fox_motorsport, 'athlete_belongs_to_team',
     '{"season": 2024, "class": "GT3 Pro-Am", "role": "Am",
       "note": "NEEDS_VERIFICATION: team identity unconfirmed"}'::jsonb,
     '2024-04-06', '2024-10-06');


  -- -------------------------------------------------------
  -- 8f. athlete_competes_in_series  (athlete -> series)
  -- championship_result populated only where confirmed
  -- -------------------------------------------------------

  INSERT INTO public.property_relationships
    (from_id, to_id, relationship_type, metadata, valid_from, valid_to)
  VALUES
    -- CONFIRMED
    (v_rob_collard,        v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "championship_result": "1st Pro-Am"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ricky_collard,      v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "championship_result": "1st Pro-Am"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_phil_keen,          v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ian_loggie,         v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_jonny_adam,         v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_giacomo_petrobelli, v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    -- NEEDS_VERIFICATION
    (v_sandy_mitchell,     v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ahmad_al_harthy,    v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_mark_farmer,        v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_marco_sorensen,     v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_sam_de_haan,        v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_patrik_matthiesen,  v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_jordan_collard,     v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_ben_tuck,           v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_lewis_proctor,      v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_will_moore,         v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_graham_johnson,     v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_marcus_clutton,     v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_scott_malvern,      v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06'),
    (v_derek_johnston,     v_bgt_series, 'athlete_competes_in_series',
     '{"season": 2024, "class": "GT3 Pro-Am", "note": "NEEDS_VERIFICATION"}'::jsonb,
     '2024-04-06', '2024-10-06');

  RAISE NOTICE 'British GT 2024 seed complete.';
  RAISE NOTICE 'Properties inserted: 47 (1 series + 1 governing_body + 6 venues + 7 events + 12 teams + 20 athletes)';
  RAISE NOTICE 'Aliases inserted: 18';
  RAISE NOTICE 'Relationships inserted: 1 + 7 + 7 + 12 + 20 + 20 = 67';

END $$;
