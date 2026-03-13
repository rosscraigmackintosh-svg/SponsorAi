# SponsorAI Schema Proposal v2

Status: Phase 1 Approved -- awaiting execution
Revision: 2026-03-13 (four adjustments applied per feedback)
Author: Claude (schema audit session)
Date: 2026-03-13
Scope: Universal property model, location support, canonical relationship names, athlete migration
Prerequisite: No migrations or data insertions until this document is approved.

---

## Part 1: Current State Audit

### 1.1 Table Inventory

| Table | Rows (approx) | Notes |
|---|---|---|
| `raw_post_daily_metrics` | 396,862 | High-volume, bigserial PK -- correct |
| `raw_account_followers` | 43,259 | Per-account daily snapshots |
| `property_platform_daily_metrics` | 43,259 | Derived rollups |
| `raw_posts` | 29,415 | Post-level raw records |
| `fanscore_daily` | 21,720 | Per-property daily scores |
| `fanscore_windows` | 1,080 | 30/60/90-day windows |
| `accounts` | 239 | Social accounts linked to properties |
| `properties` | 120 | Core entity registry |
| `property_relationships` | 50 | Entity-entity relationships |
| `fanscore_models` | 1 | Model registry (v1.0 active) |

### 1.2 Properties Table -- Current Columns

```
id               uuid        PK
name             text        NOT NULL
property_type    property_type_enum NOT NULL
country          text        nullable (free text -- not ISO)
bio              text        nullable (unstructured)
event_start_date date        nullable (events only)
created_at       timestamptz
updated_at       timestamptz
```

Problems identified:
- `country` is free text, not ISO 3166-1 alpha-2 -- inconsistent values expected at scale
- No `sport` field -- cannot filter or segment by sport category
- No `slug` field -- no URL-safe identifier for routing
- Location is implicit in `bio` text -- not queryable
- Venue is not a property type -- events currently have no structured location
- No `event_end_date` -- single-day events assumed everywhere

### 1.3 property_type_enum -- Current Values

```
driver, team, series, event
```

Missing:
- `athlete` -- the universal person type intended to replace `driver`
- `venue` -- required to make venues first-class entities
- `governing_body` -- required for series oversight relationships

### 1.4 property_relationships -- Current State

```
id               uuid        PK
from_id          uuid        FK -> properties (CASCADE)
to_id            uuid        FK -> properties (CASCADE)
relationship_type text       NOT NULL
created_at       timestamptz
UNIQUE (from_id, to_id, relationship_type)
```

Problems identified:
- No `metadata JSONB` column -- cannot store relationship-level detail (season, car number, role, start/end dates)
- Non-canonical relationship names in use: only `driver_team` (50 records)
- No index on `relationship_type` alone -- lookup by type requires full scan

### 1.5 Views -- Dependency Map

| View | Depends on | Critical notes |
|---|---|---|
| `v_active_model` | `fanscore_models` | Reads `is_active = true` |
| `v_fanscore_daily_current` | `fanscore_daily`, `v_active_model` | Filters by active model |
| `v_fanscore_windows_current` | `fanscore_windows`, `v_active_model` | Filters by active model |
| `v_property_summary_current` | `properties`, `v_fanscore_daily_current`, `v_fanscore_windows_current` | Hardcodes no type/relationship filters (reviewed) |

Note on `v_property_summary_current`: the view does NOT hardcode `relationship_type = 'driver_team'` or type filters in the current codebase. It joins only on `property_id` against score tables. The view is safe to leave unchanged during the migration. However, it does expose `property_type` as a column -- once `driver` rows are renamed to `athlete`, any app code filtering on `property_type = 'driver'` will break. See Section 4.3.

### 1.6 Missing Indexes

The following queries will perform full table scans as data grows. Indexes should be added as part of this migration:

- `properties (property_type)` -- filter by type
- `properties (sport)` -- filter by sport category (new column)
- `properties (slug)` -- lookup by slug (new column, unique)
- `property_relationships (relationship_type)` -- filter by relationship type
- `property_relationships (to_id)` -- reverse relationship traversal (only `from_id` direction is covered by FK index)

---

## Part 2: Proposed Universal Property Model

### 2.1 Core Design Principles

All sports entities -- athletes, teams, series, events, venues, governing bodies -- are stored as rows in `properties`. Identity is expressed through `property_type`. Relationships between entities are stored in `property_relationships` with typed, canonical relationship names. The `properties` table grows horizontally (new columns) to support structured location and classification, not vertically (new tables).

This model is sport-agnostic. A motorsport athlete, a football club, and a tennis tournament are all `properties` rows. The `sport` field records the high-level category. Series identity, country, and sport-specific metadata are not mixed into the same field.

### 2.2 Revised `properties` Table

Proposed final column set:

```sql
id               uuid          PRIMARY KEY DEFAULT gen_random_uuid()
name             text          NOT NULL
property_type    property_type_enum NOT NULL
sport            text          -- high-level category: 'motorsport', 'football', 'tennis', etc.
slug             text          UNIQUE -- URL-safe identifier e.g. 'rob-collard', 'barwell-motorsport'
country_code     char(2)       -- ISO 3166-1 alpha-2 e.g. 'GB', 'DE', 'US'
city             text          -- city name in English
region           text          -- state, county, circuit region, free text
latitude         numeric(9,6)  -- WGS84
longitude        numeric(9,6)  -- WGS84
bio              text          -- unstructured long description, optional
event_start_date date          -- events only
event_end_date   date          -- events only (new)
created_at       timestamptz   NOT NULL DEFAULT now()
updated_at       timestamptz   NOT NULL DEFAULT now()
```

All new columns are nullable. No existing rows break on migration. `country` (free text) is deprecated but not dropped in Phase 1 -- see migration plan.

### 2.3 Location Field Usage by Entity Type

| Property type | country_code | city | region | lat/lng |
|---|---|---|---|---|
| `athlete` | nationality (primary citizenship) | hometown or base | optional | omit |
| `team` | registered country | base city | optional | omit |
| `series` | leave null for international series; set only if the series is unambiguously national | omit | omit | omit |
| `event` | country where held | nearest city | circuit region or name | venue coordinates via linked venue entity |
| `venue` | country where located | city | region/circuit area | exact coordinates |
| `governing_body` | headquarters country | headquarters city | optional | omit |

`country_code` is strict ISO 3166-1 alpha-2 only (e.g. `GB`, `DE`, `US`). No placeholder or invented codes are permitted. International series such as the FIA World Endurance Championship or European-wide competitions have no valid single country_code and must use null. If a series later becomes unambiguously national (e.g. a domestic touring car series with a single organising country), `country_code` may be set at that point.

For events: `country_code` and `city` on the event row record where the event is held. Precise coordinates belong on the linked `venue` entity. This avoids duplicating coordinate data and keeps the event record clean if a venue hosts multiple events.

### 2.4 Revised `property_type_enum`

```
driver          -- DEPRECATED, retained for backward compat during migration
athlete         -- universal person type: racing drivers, footballers, tennis players, etc.
team            -- retained
series          -- retained
event           -- retained
venue           -- NEW: circuits, stadiums, tracks, arenas
governing_body  -- NEW: FIA, SRO, BTCC promoter, national federations
```

`driver` is not removed in Phase 1. It is soft-deprecated: new inserts use `athlete`. Existing rows are migrated in Phase 2.

### 2.5 Revised `property_relationships` Table

```sql
id               uuid    PRIMARY KEY DEFAULT gen_random_uuid()
from_id          uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE
to_id            uuid    NOT NULL REFERENCES properties(id) ON DELETE CASCADE
relationship_type text   NOT NULL
metadata         jsonb   -- relationship-level detail (season, car_number, role, valid_from, valid_to)
valid_from       date    -- optional: when this relationship became active
valid_to         date    -- optional: when this relationship ended (null = current)
created_at       timestamptz NOT NULL DEFAULT now()
UNIQUE (from_id, to_id, relationship_type)
```

`metadata` allows attaching structured data to the edge itself. Examples:

```json
{ "season": 2024, "car_number": 63, "car": "Lamborghini Huracan GT3 EVO2" }
{ "season": 2024, "role": "Pro-Am driver" }
```

`valid_from` / `valid_to` allow tracking historical relationships without separate tables. Both are nullable for relationships where temporal scope is not known or relevant.

Note: the UNIQUE constraint remains `(from_id, to_id, relationship_type)`. If the same pair holds multiple roles (e.g., an athlete who was a team driver in 2023 and team principal in 2025), that would require a schema extension. For the current prototype, this is an acceptable constraint.

---

## Part 3: Canonical Relationship Vocabulary

### 3.1 Approved Canonical Names

All relationship_type values must use this vocabulary. No ad-hoc values permitted.

| relationship_type | from | to | meaning |
|---|---|---|---|
| `series_contains_event` | series | event | This event is a round/race of this series |
| `event_at_venue` | event | venue | This event takes place at this venue |
| `team_competes_in_series` | team | series | This team entered this series |
| `athlete_belongs_to_team` | athlete | team | This athlete drives/competes for this team |
| `athlete_competes_in_series` | athlete | series | This athlete entered this series |
| `governing_body_oversees_series` | governing_body | series | This body sanctions/governs this series |

### 3.2 Deprecated Names

| Old name | Replacement |
|---|---|
| `driver_team` | `athlete_belongs_to_team` |
| `team_series` | `team_competes_in_series` |
| `driver_series` | `athlete_competes_in_series` |
| `event_series` | `series_contains_event` (direction inverted) |

The 50 existing `driver_team` records will be renamed to `athlete_belongs_to_team` as part of the Phase 2 relationship migration.

Direction is defined by the relationship name itself, not by a general rule. Each relationship has a fixed and explicit direction:

| relationship_type | from_id | to_id |
|---|---|---|
| `series_contains_event` | series | event |
| `event_at_venue` | event | venue |
| `team_competes_in_series` | team | series |
| `athlete_belongs_to_team` | athlete | team |
| `athlete_competes_in_series` | athlete | series |
| `governing_body_oversees_series` | governing_body | series |

These directions are fixed. Do not infer direction from a general rule. When inserting a relationship, look up this table.

### 3.3 metadata Patterns by Relationship Type

| relationship_type | Suggested metadata keys |
|---|---|
| `series_contains_event` | `season`, `round_number` |
| `event_at_venue` | (usually none needed) |
| `team_competes_in_series` | `season`, `class`, `car_model` |
| `athlete_belongs_to_team` | `season`, `car_number`, `car_model`, `role` (`driver`, `reserve`, `co-driver`) |
| `athlete_competes_in_series` | `season`, `class`, `championship_position` |
| `governing_body_oversees_series` | `role` (`promoter`, `sanctioning_body`, `co-organiser`) |

---

## Part 4: New Supporting Tables

### 4.1 `property_aliases`

Stores alternative names for a property: common abbreviations, historical names, alternate spellings.

```sql
CREATE TABLE property_aliases (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  alias       text  NOT NULL,
  alias_type  text  -- 'abbreviation', 'historical', 'common', 'translated'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, alias)
);

CREATE INDEX idx_property_aliases_property ON property_aliases (property_id);
CREATE INDEX idx_property_aliases_alias    ON property_aliases (alias);
```

Usage examples:

| property.name | alias | alias_type |
|---|---|---|
| British GT Championship | BGT | abbreviation |
| Barwell Motorsport | Barwell | common |
| Silverstone Circuit | Silverstone | common |

The `alias` index supports fuzzy search and autocomplete without coupling it to the main properties name field.

### 4.2 `property_metrics`

A structured key-value table for domain facts about properties. This table stores sport-specific and entity-specific facts that do not belong in any existing table.

**Scope:** non-social, non-engagement, non-FanScore data only.

Not permitted in this table:
- Anything computable from `raw_post_daily_metrics`, `raw_account_followers`, or `property_platform_daily_metrics` (that is social/engagement data)
- FanScore values, confidence bands, or window averages (those belong in `fanscore_daily` and `fanscore_windows`)
- Follower counts or follower growth (belongs in `raw_account_followers`)

Permitted in this table:
- Domain facts: race wins, championship results, grid size, prize fund, lap records
- Structural facts about the entity: number of rounds in a series, team car count, venue capacity
- Historical classification: category classification, licence grade, championship tier

```sql
CREATE TABLE property_metrics (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  metric_name  text  NOT NULL,  -- e.g. 'race_wins', 'championship_position', 'grid_size', 'venue_capacity'
  metric_value numeric,         -- null if value is textual
  metric_text  text,            -- null if value is numeric
  metric_date  date,            -- null if not tied to a specific date (e.g. career total)
  season       int,             -- year/season label e.g. 2024; null if career or timeless
  source       text,            -- data origin: 'manual', 'motorsportstats', 'fia', etc.
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_metrics_property  ON property_metrics (property_id);
CREATE INDEX idx_property_metrics_name      ON property_metrics (metric_name);
CREATE INDEX idx_property_metrics_season    ON property_metrics (season);
```

Usage examples:

| property | metric_name | metric_value | season |
|---|---|---|---|
| British GT Championship | grid_size | 30 | 2024 |
| British GT Championship | rounds_count | 10 | 2024 |
| Barwell Motorsport | race_wins | 3 | 2024 |
| Rob Collard | championship_position | 1 | 2024 |
| Silverstone Circuit | venue_capacity | 150000 | null |
| Silverstone Circuit | lap_record_seconds | 127.4 | 2024 |

---

## Part 5: Athlete Migration Plan

### 5.1 Migration Philosophy

The migration from `driver` to `athlete` is a soft rename executed in two phases. Phase 1 adds the new enum value and supporting columns without touching any existing data. Phase 2 performs the data migration. The two phases are separate migrations that can be approved and run independently.

### 5.2 Phase 1: Schema Extension (no data change)

Migration name: `universal_property_model_phase1`

Actions:
1. Add `athlete`, `venue`, `governing_body` to `property_type_enum`
2. Add new columns to `properties`: `sport`, `slug`, `country_code`, `city`, `region`, `latitude`, `longitude`, `event_end_date`
3. Add `metadata`, `valid_from`, `valid_to` to `property_relationships`
4. Create `property_aliases` table with indexes
5. Create `property_metrics` table with indexes
6. Add new indexes on `properties` and `property_relationships`

After Phase 1:
- Existing `driver` rows are untouched
- New athlete inserts use `property_type = 'athlete'`
- App code can filter on either `'driver'` or `'athlete'` during the transition window
- No view changes required yet

### 5.3 Phase 2: Data Migration (requires approval)

Migration name: `universal_property_model_phase2_athlete_rename`

Actions:
1. `UPDATE properties SET property_type = 'athlete' WHERE property_type = 'driver'`
2. `UPDATE property_relationships SET relationship_type = 'athlete_belongs_to_team' WHERE relationship_type = 'driver_team'`
3. Populate `sport = 'motorsport'` on all existing properties (all current data is motorsport)
4. Populate `slug` for all existing properties (derived from `name`, lowercased, hyphenated, de-duped)
5. Populate `country_code` from `country` where mappable (US -> US, UK -> GB, DE -> DE, etc.)
6. Drop `driver` from `property_type_enum` (only after all rows confirmed migrated)

Note on enum value removal: dropping an enum value in PostgreSQL requires `ALTER TYPE ... RENAME VALUE` or type replacement. This is a DDL operation that locks the table briefly. It should be deferred until the prototype is confirmed stable on the new values.

### 5.4 View Update Required: `v_property_summary_current`

The current view does not filter on `property_type` -- it selects all properties. After Phase 2, the view continues to work correctly. No view change is required for the migration itself.

However, a future improvement is to expose `sport`, `slug`, `country_code` in the view so the app can use them in card rendering and filtering. This is a separate, non-breaking view update that can be done after Phase 2 is approved and stable.

### 5.5 App Code Audit Required Before Phase 2

Before running Phase 2, search all app files for hardcoded `property_type = 'driver'` or `'driver'` comparisons. Known locations to check:

- `app/card.js` -- card rendering logic that branches by type
- `app/layout.js` -- tab or filter logic that references driver type
- `app/panel.js` -- detail panel that may display type-specific fields
- Any Supabase REST query in `app/data.js` that filters `property_type=eq.driver`

These references must be updated to `athlete` before Phase 2 runs, or the UI will silently show empty results for all athletes.

---

## Part 6: Venue as First-Class Entity

### 6.1 Model

A venue is a `properties` row with `property_type = 'venue'`. It has its own name, country, city, region, and coordinates. Events link to venues via `event_at_venue` relationships.

Example rows:

```
properties:
  name = 'Silverstone Circuit', property_type = 'venue', country_code = 'GB',
  city = 'Silverstone', region = 'Northamptonshire', latitude = 52.0786, longitude = -1.0169

  name = 'Snetterton Circuit', property_type = 'venue', country_code = 'GB',
  city = 'Snetterton', region = 'Norfolk'

property_relationships:
  from_id = <British GT Snetterton 300 event>, to_id = <Snetterton Circuit venue>,
  relationship_type = 'event_at_venue'
```

### 6.2 Benefits Over Bio Text

- Venues are queryable: `SELECT * FROM properties WHERE property_type = 'venue'`
- Multiple events at the same venue share one venue entity -- no duplication
- Venue coordinates enable geo-filtering and map views
- Venue FanScore is possible if the venue has social accounts (circuits with Instagram presence, for example)
- Sponsor properties can be linked to venues directly if relevant

### 6.3 Migration from Current State

Current events have venue information embedded in `bio` text (e.g. "Race at Snetterton"). There is no structured venue data to migrate -- the 20 current events are synthetic seed data with generic bios. When real British GT event data is inserted, venue entities should be created first and linked via `event_at_venue` before the event inserts.

---

## Part 7: Migration Plan Summary

### Phase 1: Schema Extension

```
Migration: universal_property_model_phase1
Destructive: No
Data change: No
View change: No
App change: No (additive only)
```

Changes:
- `ALTER TYPE property_type_enum ADD VALUE 'athlete'`
- `ALTER TYPE property_type_enum ADD VALUE 'venue'`
- `ALTER TYPE property_type_enum ADD VALUE 'governing_body'`
- `ALTER TABLE properties ADD COLUMN sport text`
- `ALTER TABLE properties ADD COLUMN slug text UNIQUE`
- `ALTER TABLE properties ADD COLUMN country_code char(2)`
- `ALTER TABLE properties ADD COLUMN city text`
- `ALTER TABLE properties ADD COLUMN region text`
- `ALTER TABLE properties ADD COLUMN latitude numeric(9,6)`
- `ALTER TABLE properties ADD COLUMN longitude numeric(9,6)`
- `ALTER TABLE properties ADD COLUMN event_end_date date`
- `ALTER TABLE property_relationships ADD COLUMN metadata jsonb`
- `ALTER TABLE property_relationships ADD COLUMN valid_from date`
- `ALTER TABLE property_relationships ADD COLUMN valid_to date`
- `CREATE TABLE property_aliases (...)`
- `CREATE TABLE property_metrics (...)`
- New indexes: `properties(property_type)`, `properties(sport)`, `properties(slug)`, `property_relationships(relationship_type)`, `property_relationships(to_id)`

### Phase 2: Data Migration

```
Migration: universal_property_model_phase2_athlete_rename
Destructive: No (no rows deleted)
Data change: Yes (property_type values, relationship_type values, new column population)
View change: Optional additive update to v_property_summary_current
App change: Required before running (audit driver references)
```

Changes:
- Rename `driver` -> `athlete` on all existing rows
- Rename `driver_team` -> `athlete_belongs_to_team` on all existing rows
- Populate `sport = 'motorsport'` on all rows
- Populate `slug` (derived, unique)
- Populate `country_code` from `country` mapping
- Optional: add `sport`, `slug`, `country_code` columns to `v_property_summary_current`

### Phase 3: Cleanup (deferred)

```
Migration: universal_property_model_phase3_cleanup
Destructive: Yes (removes deprecated enum value)
Prerequisite: Phase 2 confirmed stable, all app code updated
```

Changes:
- Remove `driver` from `property_type_enum` (requires type replacement in Postgres)
- Drop `country` column from `properties` (after confirming `country_code` is populated)

---

## Part 8: First Real Dataset -- British GT 2024

The British GT 2024 insertion SQL is blocked pending approval of this schema proposal. Once Phase 1 is approved and executed, the insert SQL should be rewritten using:

- `property_type = 'athlete'` for all drivers (not `'driver'`)
- `sport = 'motorsport'` on all rows
- `country_code` using ISO 3166-1 alpha-2 values
- `venue` entities created before events (Silverstone, Snetterton, Oulton Park, Donington, Spa, Brands Hatch)
- `event_at_venue` relationships linking events to venues
- Canonical relationship names throughout:
  - `team_competes_in_series` (team -> series)
  - `athlete_belongs_to_team` (athlete -> team)
  - `athlete_competes_in_series` (athlete -> series)
  - `series_contains_event` (series -> event)
  - `event_at_venue` (event -> venue)
- `metadata` JSONB on `athlete_belongs_to_team` records: `{ "season": 2024, "car_number": 63, "car": "Lamborghini Huracan GT3 EVO2" }`

---

## Part 9: Open Questions

The following items are not resolved by this proposal and require a decision before the relevant migration or data insertion proceeds.

**Q1: Slug generation** (resolved)
Slugs are derived from `name` by lowercasing and replacing non-alphanumeric characters with hyphens. If the derived slug already exists, append `-2`, `-3`, etc. until unique. No other disambiguation fields are used. Slug stability takes priority: once assigned, a slug does not change if the entity's country or classification changes.

**Q2: `country` column deprecation timing**
The existing `country` column contains free text values (e.g. `US`, `UK`, `DE`). `UK` is not a valid ISO code -- the correct value is `GB`. Phase 1 adds `country_code` without removing `country`. Phase 3 drops `country`. Is Phase 3 approved in principle, or should `country` be retained indefinitely for legacy compatibility?

**Q3: `event_end_date` requirement**
The current schema has `event_start_date` only. British GT rounds are multi-day (qualifying Saturday, races Sunday, some rounds span a weekend). Should `event_end_date` be added as part of Phase 1 (additive, nullable), or is single-day representation acceptable for the prototype?

**Q4: `valid_from` / `valid_to` on relationships**
These columns allow tracking historical team memberships. For the prototype, most records will have `valid_from = NULL` (meaning "current or unspecified"). Is there a requirement to backfill historical relationship data, or are these columns purely forward-looking?

**Q5: SECURITY DEFINER on `v_active_model`**
Currently, the `anon` role can read `fanscore_models` (including `weights_json`) because `v_property_summary_current` uses SECURITY INVOKER. Redefining `v_active_model` as SECURITY DEFINER would remove the need to grant anon SELECT on `fanscore_models`. Flagged as a hardening task -- is this in scope for the current sprint?

---

## Part 10: Deferred Items (Not in This Proposal)

The following items were identified during the audit but are outside the scope of this schema migration. They are documented here to avoid loss:

- **`layout.js` stale comment** -- line 2 says `updateGhostMeta()` is "in inline script", actually defined in `ui.js`. One-line fix.
- **Edge Function not deployed** -- `supabase functions deploy chat --project-ref kyjpxxyaebxvpprugmof` required; Anthropic key must be set via `supabase secrets set ANTHROPIC_KEY=<key>`. The function code and JWT config are correct. Deployment is a CLI command only.
- **Rotate Anthropic API key** -- the key was previously in browser scope (`app/config.js` before the proxy migration). It should be rotated in the Anthropic console and re-set via `supabase secrets set`.
- **`v_property_summary_current` additive update** -- adding `sport`, `slug`, `country_code` to the view's SELECT list. Safe additive change, no breaking impact. Suggested after Phase 2 approval.

---

*End of SCHEMA_PROPOSAL_V2.md*
