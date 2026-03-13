-- =============================================================
-- SponsorAI Seed: GT World Challenge Europe 2024
-- =============================================================
-- Purpose  : Data quality repair seed for GTWCE entities that
--            were ingested with incorrect country/region values.
--            Also ensures the governing_body_oversees_series
--            relationship exists for SRO Motorsports Group.
--
--            Mirrors the repair logic embedded in the
--            build_series_structure('gt-world-challenge-europe', ...) RPC.
--
--            Use this file for:
--              - Manual recovery if the RPC is unavailable
--              - Documentation of the known data quality issues
--              - Reference for future GTWCE entity additions
--
-- Last updated : 2026-03-13
-- Author       : SponsorAI ingestion pipeline
-- Context      : GTWCE entities were originally inserted via
--                british_gt_2024_seed_confirmed.sql with incorrect
--                country='GB' (should be 'United Kingdom') and
--                region='United Kingdom' (should be 'Europe').
--                This seed corrects those values idempotently.
-- Run in       : Supabase SQL Editor (project kyjpxxyaebxvpprugmof)
-- =============================================================

DO $repair$
DECLARE
  v_gtwce_id   uuid;
  v_sro_id     uuid;
  v_fixed_teams    int := 0;
  v_fixed_athletes int := 0;
BEGIN

  -- ================================================================
  -- SERIES: ensure correct metadata
  -- ================================================================
  SELECT id INTO v_gtwce_id FROM properties WHERE slug = 'gt-world-challenge-europe';

  IF v_gtwce_id IS NULL THEN
    RAISE EXCEPTION 'GTWCE series not found. Run the original seed first.';
  END IF;

  UPDATE properties SET
    region = 'Europe',
    sport  = 'motorsport'
  WHERE id = v_gtwce_id
    AND (region IS DISTINCT FROM 'Europe' OR sport IS DISTINCT FROM 'motorsport');

  -- ================================================================
  -- GOVERNING BODY: SRO Motorsports Group
  -- ================================================================
  SELECT id INTO v_sro_id FROM properties WHERE slug = 'sro-motorsports-group';

  IF v_sro_id IS NULL THEN
    -- Insert SRO if it does not exist
    INSERT INTO properties (name, slug, property_type, sport, region, bio)
    VALUES (
      'SRO Motorsports Group',
      'sro-motorsports-group',
      'governing_body',
      'motorsport',
      'Europe',
      'SRO Motorsports Group is a motorsport organiser and promoter responsible for running the GT World Challenge Europe, the British GT Championship, and several other GT series globally. Founded by Stephane Ratel, SRO operates from Geneva, Switzerland.'
    )
    RETURNING id INTO v_sro_id;
  ELSE
    -- Ensure SRO has correct metadata
    UPDATE properties SET
      region = 'Europe',
      sport  = 'motorsport'
    WHERE id = v_sro_id
      AND (region IS DISTINCT FROM 'Europe' OR sport IS DISTINCT FROM 'motorsport');
  END IF;

  -- Ensure governing_body_oversees_series relationship
  INSERT INTO property_relationships (from_id, to_id, relationship_type)
  SELECT v_sro_id, v_gtwce_id, 'governing_body_oversees_series'
  WHERE NOT EXISTS (
    SELECT 1 FROM property_relationships
    WHERE from_id = v_sro_id AND to_id = v_gtwce_id
      AND relationship_type = 'governing_body_oversees_series'
  );

  -- ================================================================
  -- TEAMS: fix country/region where incorrect
  -- Known pattern: country = 'GB' should be 'United Kingdom'
  --               region = 'United Kingdom' should be 'Europe'
  -- ================================================================
  UPDATE properties SET
    country = 'United Kingdom',
    region  = 'Europe'
  WHERE property_type = 'team'
    AND sport = 'motorsport'
    AND id IN (
      SELECT to_id FROM property_relationships
      WHERE from_id = v_gtwce_id AND relationship_type = 'series_has_team'
    )
    AND (country = 'GB' OR region = 'United Kingdom' OR region IS NULL OR region != 'Europe');

  GET DIAGNOSTICS v_fixed_teams = ROW_COUNT;

  -- ================================================================
  -- ATHLETES: fix country/region where incorrect
  -- ================================================================
  UPDATE properties SET
    region = 'Europe'
  WHERE property_type IN ('athlete', 'driver')
    AND sport = 'motorsport'
    AND id IN (
      SELECT from_id FROM property_relationships
      WHERE to_id = v_gtwce_id AND relationship_type = 'athlete_competes_in_series'
    )
    AND (region IS NULL OR region != 'Europe');

  GET DIAGNOSTICS v_fixed_athletes = ROW_COUNT;

  -- ================================================================
  -- VENUES: fix region where incorrect
  -- ================================================================
  UPDATE properties SET
    region = 'Europe'
  WHERE property_type = 'venue'
    AND id IN (
      SELECT v.id FROM properties v
      JOIN property_relationships ev ON ev.to_id = v.id AND ev.relationship_type = 'event_at_venue'
      JOIN property_relationships se ON se.to_id = ev.from_id AND se.relationship_type = 'series_contains_event'
      WHERE se.from_id = v_gtwce_id
    )
    AND (region IS NULL OR region != 'Europe');

  -- ================================================================
  -- EVENTS: fix region where incorrect
  -- ================================================================
  UPDATE properties SET
    region = 'Europe',
    sport  = 'motorsport'
  WHERE property_type = 'event'
    AND id IN (
      SELECT to_id FROM property_relationships
      WHERE from_id = v_gtwce_id AND relationship_type = 'series_contains_event'
    )
    AND (region IS DISTINCT FROM 'Europe' OR sport IS DISTINCT FROM 'motorsport');

  RAISE NOTICE 'GTWCE repair complete. Teams fixed: %. Athletes fixed: %.', v_fixed_teams, v_fixed_athletes;

END $repair$;

-- ================================================================
-- EXCEPTION DOCUMENTATION (from GTWCE expansion, March 2026)
-- ================================================================
-- The following entities were flagged during the original GTWCE ingestion
-- and are documented here per SERIES_INGESTION_PROCESS.md Section 9.
--
-- Exception: timur-boguslavskiy
--   Type: image-not-found
--   Reason: Portrait photo ID not confirmable from GTWCE portal
--   Status: intentional
--   Date: 2026-03-13
--
-- Exception: marco-varrone
--   Type: image-not-found
--   Reason: No driver page found under this name in GTWCE portal
--            (Varrone drivers listed as Nico/Nicolas Varrone).
--            Entity name may need reconciliation.
--   Status: to-be-resolved
--   Date: 2026-03-13
--
-- Exception: 8 GTWCE event entities (no dedicated social accounts)
--   Type: no-fanscore
--   Reason: Suppression intentional per Rule 8.4 -- events without
--            dedicated social presence.
--   Status: intentional
--   Date: 2026-03-13
--
-- Exception: 6 GTWCE venue entities (no social accounts)
--   Type: no-fanscore
--   Reason: Suppression intentional per Rule 8.4 -- venues do not
--            have social accounts.
--   Status: intentional
--   Date: 2026-03-13
-- ================================================================
