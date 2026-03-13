-- british_gt_2024_events.sql
-- British GT Championship 2024 -- confirmed event seed
--
-- Status: Approved for execution 2026-03-13
-- Source: britishgt.com official calendar (season ID 11)
--         corroborated by racingyears.com results archive
--
-- Scope: 7 event properties, 14 relationships
--   7 series_contains_event (British GT -> event)
--   7 event_at_venue (event -> venue)
--
-- Prerequisite: british_gt_2024_seed_confirmed.sql must be applied first
-- Note: no athlete_event or team_event relationships in this seed
--
-- Metadata shape on series_contains_event:
--   season       integer   always present
--   round_start  integer   first round number for this weekend
--   round_end    integer   last round number (equals round_start for single rounds)
--   format       string    present when non-standard (doubleheader, Silverstone 500)
--   notes        string    present for contextual flags (continental round, season finale)
--   source       string    always present -- factual calendar source

DO $$
DECLARE
  -- Existing properties (resolved by slug)
  v_british_gt      uuid;
  v_oulton_park     uuid;
  v_silverstone     uuid;
  v_donington       uuid;
  v_snetterton      uuid;
  v_spa             uuid;
  v_brands_hatch    uuid;

  -- New event properties
  v_ev_oulton       uuid;
  v_ev_silverstone  uuid;
  v_ev_donington_r4 uuid;
  v_ev_spa          uuid;
  v_ev_snetterton   uuid;
  v_ev_donington_r8 uuid;
  v_ev_brands       uuid;

BEGIN

  -- ================================================================
  -- RESOLVE EXISTING IDS
  -- ================================================================

  SELECT id INTO v_british_gt    FROM public.properties WHERE slug = 'british-gt-championship';
  SELECT id INTO v_oulton_park   FROM public.properties WHERE slug = 'oulton-park';
  SELECT id INTO v_silverstone   FROM public.properties WHERE slug = 'silverstone-circuit';
  SELECT id INTO v_donington     FROM public.properties WHERE slug = 'donington-park';
  SELECT id INTO v_snetterton    FROM public.properties WHERE slug = 'snetterton-circuit';
  SELECT id INTO v_spa           FROM public.properties WHERE slug = 'circuit-de-spa-francorchamps';
  SELECT id INTO v_brands_hatch  FROM public.properties WHERE slug = 'brands-hatch';

  IF v_british_gt   IS NULL THEN RAISE EXCEPTION 'Prerequisite missing: british-gt-championship'; END IF;
  IF v_oulton_park  IS NULL THEN RAISE EXCEPTION 'Prerequisite missing: oulton-park'; END IF;
  IF v_silverstone  IS NULL THEN RAISE EXCEPTION 'Prerequisite missing: silverstone-circuit'; END IF;
  IF v_donington    IS NULL THEN RAISE EXCEPTION 'Prerequisite missing: donington-park'; END IF;
  IF v_snetterton   IS NULL THEN RAISE EXCEPTION 'Prerequisite missing: snetterton-circuit'; END IF;
  IF v_spa          IS NULL THEN RAISE EXCEPTION 'Prerequisite missing: circuit-de-spa-francorchamps'; END IF;
  IF v_brands_hatch IS NULL THEN RAISE EXCEPTION 'Prerequisite missing: brands-hatch'; END IF;


  -- ================================================================
  -- EVENT PROPERTIES
  -- ================================================================

  -- R1 & R2: Oulton Park (Easter weekend doubleheader)
  -- Source: britishgt.com 29 Mar - 1 Apr; racingyears confirms both races on 1 Apr 2024
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code,
    event_start_date, event_end_date, bio
  ) VALUES (
    'British GT: Oulton Park 2024',
    'event', 'motorsport', 'british-gt-oulton-park-2024', 'GB',
    '2024-03-29', '2024-04-01',
    'The opening rounds of the 2024 British GT Championship at Oulton Park, Cheshire. A traditional Easter weekend doubleheader hosting Rounds 1 and 2 of the season.'
  ) RETURNING id INTO v_ev_oulton;

  -- R3: Silverstone 500 (official branded event name)
  -- Source: britishgt.com 26-28 Apr; racingyears confirms race day 28 Apr 2024
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code,
    event_start_date, event_end_date, bio
  ) VALUES (
    'British GT: Silverstone 500 2024',
    'event', 'motorsport', 'british-gt-silverstone-500-2024', 'GB',
    '2024-04-26', '2024-04-28',
    'Round 3 of the 2024 British GT Championship at Silverstone Circuit, Northamptonshire. The Silverstone 500 is one of the headline endurance events on the British GT calendar.'
  ) RETURNING id INTO v_ev_silverstone;

  -- R4: Donington Park first visit (May)
  -- Source: britishgt.com 23-26 May; racingyears confirms race day 26 May 2024
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code,
    event_start_date, event_end_date, bio
  ) VALUES (
    'British GT: Donington Park 2024 Round 4',
    'event', 'motorsport', 'british-gt-donington-park-2024-r4', 'GB',
    '2024-05-23', '2024-05-26',
    'Round 4 of the 2024 British GT Championship at Donington Park, Leicestershire. The first of two visits to Donington Park in the 2024 season.'
  ) RETURNING id INTO v_ev_donington_r4;

  -- R5: Spa-Francorchamps (sole continental round)
  -- Source: britishgt.com 21-23 Jun; racingyears confirms race day 23 Jun 2024
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code,
    event_start_date, event_end_date, bio
  ) VALUES (
    'British GT: Spa-Francorchamps 2024',
    'event', 'motorsport', 'british-gt-spa-francorchamps-2024', 'BE',
    '2024-06-21', '2024-06-23',
    'Round 5 of the 2024 British GT Championship at Circuit de Spa-Francorchamps, Belgium. The sole continental round of the season.'
  ) RETURNING id INTO v_ev_spa;

  -- R6 & R7: Snetterton (summer doubleheader)
  -- Source: britishgt.com 12-14 Jul; racingyears confirms race days 13 and 14 Jul 2024
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code,
    event_start_date, event_end_date, bio
  ) VALUES (
    'British GT: Snetterton 2024',
    'event', 'motorsport', 'british-gt-snetterton-2024', 'GB',
    '2024-07-12', '2024-07-14',
    'Rounds 6 and 7 of the 2024 British GT Championship at Snetterton Circuit, Norfolk. A summer doubleheader weekend with races on both Saturday and Sunday.'
  ) RETURNING id INTO v_ev_snetterton;

  -- R8: Donington Park second visit (September)
  -- Source: britishgt.com 5-8 Sep; racingyears confirms race day 8 Sep 2024
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code,
    event_start_date, event_end_date, bio
  ) VALUES (
    'British GT: Donington Park 2024 Round 8',
    'event', 'motorsport', 'british-gt-donington-park-2024-r8', 'GB',
    '2024-09-05', '2024-09-08',
    'Round 8 of the 2024 British GT Championship at Donington Park, Leicestershire. The second visit to Donington Park in the 2024 season.'
  ) RETURNING id INTO v_ev_donington_r8;

  -- R9: Brands Hatch (season finale)
  -- Source: britishgt.com 28-29 Sep; racingyears confirms race day 29 Sep 2024
  INSERT INTO public.properties (
    name, property_type, sport, slug, country_code,
    event_start_date, event_end_date, bio
  ) VALUES (
    'British GT: Brands Hatch 2024',
    'event', 'motorsport', 'british-gt-brands-hatch-2024', 'GB',
    '2024-09-28', '2024-09-29',
    'Round 9 of the 2024 British GT Championship at Brands Hatch Grand Prix Circuit, Kent. The season finale.'
  ) RETURNING id INTO v_ev_brands;


  -- ================================================================
  -- RELATIONSHIPS: series_contains_event
  -- Direction: British GT series (from_id) -> event (to_id)
  -- Metadata: season, round_start, round_end always present
  --           format present for non-standard round structures
  --           notes present for contextual flags
  --           source always present
  -- ================================================================

  INSERT INTO public.property_relationships (
    from_id, to_id, relationship_type, valid_from, valid_to, metadata
  ) VALUES
    (
      v_british_gt, v_ev_oulton,
      'series_contains_event', '2024-03-29', '2024-04-01',
      '{"season": 2024, "round_start": 1, "round_end": 2, "format": "doubleheader", "source": "britishgt.com"}'
    ),
    (
      v_british_gt, v_ev_silverstone,
      'series_contains_event', '2024-04-26', '2024-04-28',
      '{"season": 2024, "round_start": 3, "round_end": 3, "format": "Silverstone 500", "source": "britishgt.com"}'
    ),
    (
      v_british_gt, v_ev_donington_r4,
      'series_contains_event', '2024-05-23', '2024-05-26',
      '{"season": 2024, "round_start": 4, "round_end": 4, "source": "britishgt.com"}'
    ),
    (
      v_british_gt, v_ev_spa,
      'series_contains_event', '2024-06-21', '2024-06-23',
      '{"season": 2024, "round_start": 5, "round_end": 5, "notes": "continental round", "source": "britishgt.com"}'
    ),
    (
      v_british_gt, v_ev_snetterton,
      'series_contains_event', '2024-07-12', '2024-07-14',
      '{"season": 2024, "round_start": 6, "round_end": 7, "format": "doubleheader", "source": "britishgt.com"}'
    ),
    (
      v_british_gt, v_ev_donington_r8,
      'series_contains_event', '2024-09-05', '2024-09-08',
      '{"season": 2024, "round_start": 8, "round_end": 8, "source": "britishgt.com"}'
    ),
    (
      v_british_gt, v_ev_brands,
      'series_contains_event', '2024-09-28', '2024-09-29',
      '{"season": 2024, "round_start": 9, "round_end": 9, "notes": "season finale", "source": "britishgt.com"}'
    );


  -- ================================================================
  -- RELATIONSHIPS: event_at_venue
  -- Direction: event (from_id) -> venue (to_id)
  -- Note: Donington Park (v_donington) is referenced twice -- R4 and R8
  --       are two separate events at the same venue. This is correct.
  -- ================================================================

  INSERT INTO public.property_relationships (
    from_id, to_id, relationship_type, valid_from, valid_to, metadata
  ) VALUES
    (v_ev_oulton,       v_oulton_park,  'event_at_venue', '2024-03-29', '2024-04-01', '{"source": "britishgt.com"}'),
    (v_ev_silverstone,  v_silverstone,  'event_at_venue', '2024-04-26', '2024-04-28', '{"source": "britishgt.com"}'),
    (v_ev_donington_r4, v_donington,    'event_at_venue', '2024-05-23', '2024-05-26', '{"source": "britishgt.com"}'),
    (v_ev_spa,          v_spa,          'event_at_venue', '2024-06-21', '2024-06-23', '{"source": "britishgt.com"}'),
    (v_ev_snetterton,   v_snetterton,   'event_at_venue', '2024-07-12', '2024-07-14', '{"source": "britishgt.com"}'),
    (v_ev_donington_r8, v_donington,    'event_at_venue', '2024-09-05', '2024-09-08', '{"source": "britishgt.com"}'),
    (v_ev_brands,       v_brands_hatch, 'event_at_venue', '2024-09-28', '2024-09-29', '{"source": "britishgt.com"}');


  RAISE NOTICE '=========================================';
  RAISE NOTICE 'british_gt_2024_events.sql';
  RAISE NOTICE 'Events inserted: 7';
  RAISE NOTICE '  R1+2: Oulton Park         29 Mar - 01 Apr 2024';
  RAISE NOTICE '  R3:   Silverstone 500     26 Apr - 28 Apr 2024';
  RAISE NOTICE '  R4:   Donington Park      23 May - 26 May 2024';
  RAISE NOTICE '  R5:   Spa-Francorchamps   21 Jun - 23 Jun 2024';
  RAISE NOTICE '  R6+7: Snetterton          12 Jul - 14 Jul 2024';
  RAISE NOTICE '  R8:   Donington Park      05 Sep - 08 Sep 2024';
  RAISE NOTICE '  R9:   Brands Hatch        28 Sep - 29 Sep 2024';
  RAISE NOTICE 'Relationships inserted: 14';
  RAISE NOTICE '  7 series_contains_event';
  RAISE NOTICE '  7 event_at_venue';
  RAISE NOTICE '=========================================';

END $$;
