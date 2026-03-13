-- populate_sport_region.sql
-- Derives region from country for all properties where region is NULL.
-- Applied as migration: populate_region_from_country + populate_region_remaining
-- Safe to re-run (WHERE region IS NULL guard on each statement).
-- Run after any new entity expansion if region was not set at ingestion time.

-- Country-to-region mapping
UPDATE properties SET region = 'United Kingdom' WHERE region IS NULL AND country = 'GB';
UPDATE properties SET region = 'Belgium'        WHERE region IS NULL AND country = 'BE';
UPDATE properties SET region = 'Italy'          WHERE region IS NULL AND country = 'IT';
UPDATE properties SET region = 'Germany'        WHERE region IS NULL AND country = 'DE';
UPDATE properties SET region = 'Switzerland'    WHERE region IS NULL AND country = 'CH';
UPDATE properties SET region = 'France'         WHERE region IS NULL AND country = 'FR';
UPDATE properties SET region = 'Spain'          WHERE region IS NULL AND country = 'ES';
UPDATE properties SET region = 'Russia'         WHERE region IS NULL AND country = 'RU';
UPDATE properties SET region = 'Asia'           WHERE region IS NULL AND country = 'HK';
UPDATE properties SET region = 'Ireland'        WHERE region IS NULL AND country = 'IE';

-- Pan-European / international governing bodies with no country
UPDATE properties SET region = 'Europe'
WHERE region IS NULL AND country IS NULL AND property_type = 'governing_body';

-- Verification query (should return 0 rows if fully populated):
-- SELECT name, property_type, country FROM properties WHERE region IS NULL;
