# SERIES_INGESTION_PROCESS.md

SponsorAI Series Ingestion Process

Last updated: 2026-03-13 (v0.7 automated pipeline)

Status: Active

---

## 1. Overview

This document defines the standard workflow for adding a new sports series to the SponsorAI property graph and UI. It exists because the GTWCE expansion (March 2026) revealed a workflow gap: entities were inserted correctly at the structural level, but several presentation and scoring elements required manual repair afterward -- images, bios, metadata, FanScore expectations, and relationship verification.

This process is mandatory for all future series expansions. No expansion is considered complete until every stage has been verified and exceptions are documented.

For the authoritative Definition of Done rules, see `docs/SPONSORAI_SYSTEM_CONTRACT.md` Section 8.

---

## 1a. Automated Pipeline (v0.7 and later)

As of 2026-03-13, Stage 1 (entity and relationship creation) is automated for supported series templates via the Control Room.

**How to use the automated pipeline:**

1. Open `app/control-room.html` and fill in the ingestion form (series slug, season, sport, entity toggles).
2. Click **Start ingestion**. For a supported slug, the pipeline will:
   - Create a run record (status: running)
   - Call `build_series_structure(slug, season, sport, include_flags, synthetic_signals)` RPC
   - Log `entities_created`, `entities_updated`, `relationships_created`, and any warnings
   - Auto-advance the lifecycle checklist: `structural_creation` to Complete; `presentation_data` to In progress
   - Run the live audit immediately
   - Set final status based on audit results
3. After the pipeline completes, proceed to the manual stages: image registration, bio verification, exception documentation.

**Supported templates (as of 2026-03-13):**

| Slug | Template type | Coverage |
|---|---|---|
| `premiership-rugby` | Full creation | 35 entities, ~45 relationships, optional synthetic signals + scoring pipeline |
| `gt-world-challenge-europe` | Idempotent repair | Fixes country/region fields; ensures SRO governing_body relationship |

**For unsupported slugs:** The pipeline returns `unsupported_steps` and sets `structural_creation` to In progress. Build entities manually via the SQL editor using the seed file format in `database/seeds/`, then re-run the audit.

**Seed SQL files (reference and recovery):**

| File | Purpose |
|---|---|
| `database/seeds/premiership_rugby_2026.sql` | Standalone reference for Premiership Rugby 2025/26 entities and relationships |
| `database/seeds/gtwce_2024.sql` | Data quality repair seed for GTWCE country/region fields; exception documentation |

Use these files if the RPC is unavailable, for disaster recovery, or as diff reference when updating templates.

---

## Stage 0 — Ingestion Audit

After inserting all entities and running the FanScore pipeline, run the ingestion audit before marking the series as complete or rendering it in the UI.

**Script location**

`scripts/series_ingestion_audit.sql`

**Workflow**

1. Set the `series_slug` parameter at the top of the `params` CTE to the target series slug (e.g. `'gtwce'`).
2. Run the full script in the Supabase SQL Editor. The script outputs one row per entity in the series ecosystem.
3. Review the flag columns. Every TRUE flag must be resolved before the series is considered ingestion-complete.
4. Repair all flagged entities:
   - `flag_missing_fanscore` -- accounts exist but FanScore is absent; check post count and re-run pipeline
   - `flag_missing_posts` -- accounts exist but no posts; insert posts before re-running pipeline
   - `flag_missing_image` -- no entry in `app/images.js`; find a confirmed URL and register it
   - `flag_image_hotlink_risk` -- image URL contains domain patterns known to block hotlinking; replace with Wikimedia Commons or confirmed CDN
5. After repairing, re-run the audit and confirm zero rows with `flag_missing_fanscore = TRUE` (except intentional suppressions such as events and venues without social accounts) and zero rows with `flag_missing_image = TRUE`.
6. Only then render the series in the Explore grid.

**Intentional suppressions (expected, not errors)**

The following are correct and should not be treated as failures:

- `flag_missing_fanscore = TRUE` with `social_accounts_count = 0` -- venues and events with no social presence; suppression is by design
- `flag_missing_image = TRUE` for specific athletes where no confirmed portrait URL is available -- document in `DEVELOPMENT_LEDGER.md` as an intentional placeholder

**Maintenance note**

The `image_registry` and `event_venue_map` CTEs inside the script are snapshots of `app/images.js`. Update them whenever image entries are added or changed. The script does not read `images.js` directly.

---

## 2. Entity Mapping

Before inserting any data, map the complete entity graph for the incoming series.

Every series expansion produces the following entity types:

**Tier 1 -- Always present**
- One `series` property (e.g. GT World Challenge Europe)
- One `governing_body` property if a distinct governing organisation exists (e.g. SRO Motorsports Group)

**Tier 2 -- Per-season**
- `team` properties -- every competing team with a dedicated social presence
- `athlete` properties -- every competing driver or athlete with a dedicated social presence

**Tier 3 -- Event structure**
- `event` properties -- one per round brand (not per occurrence/year)
- `venue` properties -- one per circuit or physical location

**Entity graph relationships to insert:**

| Relationship type | From | To |
|---|---|---|
| `governing_body_oversees_series` | governing_body | series |
| `series_has_team` | series | team |
| `team_has_athlete` | team | athlete |
| `athlete_belongs_to_team` | athlete | team |
| `athlete_competes_in_series` | athlete | series |
| `series_contains_event` | series | event |
| `event_at_venue` | event | venue |

All relationship rows must be inserted before Stage 4 UI verification, or the Related Properties panel section will render empty.

---

## 3. Entity Creation Requirements

Every property row must be inserted with the following fields populated before the expansion moves to Stage 2:

**Structural fields (Stage 1)**
- `name` -- display name, title-cased
- `slug` -- kebab-case, unique, permanent once assigned
- `property_type` -- from `property_type_enum`

**Presentation fields (Stage 2)**
- `bio` -- factual, 1 to 3 sentences, calm analytical tone, no hype language
- `country` -- full country name (e.g. `Belgium`, not `BE`); null only for pan-regional entities
- `country_code` -- ISO 3166-1 alpha-2 (e.g. `BE`); null only for pan-regional entities
- `sport` -- `'motorsport'` for all current SponsorAI properties
- `region` -- `'Europe'` for all current SponsorAI properties; do not use country name
- `city` -- required for teams and venues; optional for athletes and events

**Known failure mode from GTWCE expansion:** `country` and `region` were set to ISO codes or country names respectively (e.g. `country='BE'`, `region='Belgium'`) instead of the correct full name and canonical region string. This caused incorrect flag rendering and Key Facts display. Always verify these fields after insertion.

---

## 4. Image Pipeline and Validation

Image completion is a four-step process. Registry presence alone is not sufficient.

### Step 1 -- Identify source

For each entity, identify a reliable image source before inserting the registry entry.

**Preferred sources by entity type:**

| Entity type | Preferred source |
|---|---|
| Series | Official series SVG logotype (SRO portal, series website) |
| Governing body | Official organisation SVG logotype |
| Team logo | Official team website SVG or PNG |
| Team car | Official series media portal (britishgt.com, gt-world-challenge-europe.com) |
| Athlete portrait | Official series driver portal (britishgt.com/images/drivers/, gt-world-challenge-europe.com/images/drivers/) |
| Venue | Wikimedia Commons aerial photography |
| Event | No dedicated image required -- use EVENT_VENUE_MAP fallback |

**Image sourcing guideline -- avoid hotlink-blocked sources:**

External venue websites (official circuit sites) frequently block image embedding from external domains. Requests without the correct Referer header return 403. This is the root cause of the Barcelona and Magny-Cours broken images discovered in March 2026.

Preferred sources for venue images:
- Wikimedia Commons (upload.wikimedia.org) -- no hotlink protection, stable, freely licensed
- Stable motorsport media CDNs (e.g. msvstatic.blob.core.windows.net for MSV circuits)

Avoid:
- Official circuit websites (circuitcat.com, magnycours.com, circuitpaulricard.com, monzanet.it, misanocircuit.com, nuerburgring.de)
- Any source that requires a specific Referer header
- URLs with authentication tokens or time-limited signatures

For Wikimedia Commons venues, compute the thumbnail URL using the MD5 formula:

```
import hashlib
filename = 'Circuit_Paul_Ricard,_April_22,_2018_SkySat.jpg'
h = hashlib.md5(filename.encode('utf-8')).hexdigest()
url = f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{filename}/1280px-{filename}'
```

### Step 2 -- Insert registry entry

Add the entry to `app/images.js` using the typed object format:

```js
'your-slug': {
  src:  'https://confirmed-working-url.example.com/image.jpg',
  kind: 'venue',   // venue | portrait | logo | car | series
  fit:  'cover',   // cover for portraits and venues; contain for logos
  pos:  'center center'
}
```

If no confirmed image URL exists, document the absence with a comment instead of omitting the entry:

```js
/* your-slug -- no confirmed portrait URL found; image source was unavailable
   at ingestion time. Falls through to placeholder hero icon. */
```

### Step 3 -- Verify URL is reachable

After inserting the URL, confirm the image loads in a browser. Load the URL directly and confirm no 403, 404, or redirect to an error page.

If the URL fails: replace it with a Wikimedia Commons URL or a confirmed CDN source before marking the image step complete.

### Step 4 -- Verify card renders correctly

Open the application and confirm the card hero renders the image. A broken-image icon (or the placeholder SVG) means the URL is broken, the slug does not match the registry key, or the EVENT_VENUE_MAP entry is missing.

Registry presence alone does not constitute image completion. All four steps must pass.

---

## 5. FanScore Expectations

Before inserting social accounts, classify each entity by its expected FanScore status.

| Entity type | FanScore expected | Notes |
|---|---|---|
| `series` | Yes | Must have accounts, follower history, posts |
| `governing_body` | Yes, if social accounts exist | Treat like a series entity if accounts are present |
| `team` | Yes | Must have accounts, follower history, posts |
| `athlete` | Yes | Must have accounts, follower history, posts |
| `event` | No (intentional suppression acceptable) | Suppression reason `'Insufficient data'` is correct if no dedicated accounts |
| `venue` | No | Venues do not have social accounts; suppression is always intentional |

**Scoring pipeline requirements for scoreable entities:**
1. At least one account row in `accounts` per intended platform
2. Follower history in `raw_account_followers` covering 90 days minimum
3. At least 30 posts in `raw_posts` per account over the 90-day window
4. Post daily metrics in `raw_post_daily_metrics` for each post
5. Run `compute_daily_rollups(start_date, end_date)`
6. Run `compute_fanscore_daily(start_date, end_date, 'v1.0')`
7. Run `compute_fanscore_windows(CURRENT_DATE, 'v1.0')`

**Pipeline function signatures (as of 2026-03-13):**
- `compute_daily_rollups(p_start_date date, p_end_date date)`
- `compute_fanscore_daily(p_start_date date, p_end_date date, p_model_version text)`
- `compute_fanscore_windows(p_as_of_day date, p_model_version text)`

**Known failure mode from GTWCE expansion:** SRO Motorsports Group had follower history inserted but no posts, causing FanScore to be suppressed silently (missing rather than suppressed). Always insert posts at the same time as accounts per Rule 2.5.

---

## 6. Relationship Verification

After inserting all `property_relationships` rows, run a verification query to confirm coverage:

```sql
SELECT r.relationship_type, COUNT(*) AS relationship_count
FROM property_relationships r
JOIN properties p_from ON r.from_id = p_from.id
WHERE p_from.slug IN ('<series-slug>')
   OR r.to_id IN (SELECT id FROM properties WHERE slug = '<series-slug>')
GROUP BY r.relationship_type
ORDER BY r.relationship_type;
```

Expected relationship types present for a full series expansion:
- `series_contains_event`
- `series_has_team`
- `team_has_athlete`
- `athlete_belongs_to_team`
- `athlete_competes_in_series`
- `event_at_venue`
- `governing_body_oversees_series`

If any expected type is absent, the Related Properties section in the detail panel will be missing that group. Insert the missing rows before marking the expansion complete.

---

## 7. UI Verification Checklist

Before marking an entity expansion as complete, verify each of the following in a running instance of the application:

**Card level**
- Cards render for all new entities with no JS errors in the console
- Card hero images load (not the placeholder SVG icon)
- Country flags display correctly (requires valid `country_code`)
- Type badges display the correct label
- FanScore values appear for scoreable entities; suppression message appears for unscorable ones
- Signal badges (Rising Fast, Growing, etc.) render on cards with active momentum

**Panel level**
- Panel opens on card click with no blank sections
- Bio is populated (1 to 3 sentences)
- Key Facts section shows Sport category and Primary region (not `null` or `undefined`)
- Related Properties section loads linked entities from the database
- Score History section renders sparklines (requires fanscore_daily data)
- Engagement Snapshot shows follower count, engagement rate, posts count

**Event fallback**
- All new event slugs are present in `EVENT_VENUE_MAP` in `app/images.js`
- Each event's venue slug has a registered image entry in `PROPERTY_IMAGES`
- Event cards render the venue image (not the placeholder icon)

---

## 8. Documentation Updates

At the end of every series expansion session, update the following documents:

| Document | What to update |
|---|---|
| `project-docs/DEVELOPMENT_LEDGER.md` | Add an entry for the session: entities inserted, images registered, pipeline state, exceptions |
| `docs/SYSTEM_STATE.md` | Update entity counts, scoring state, known gaps |
| `docs/WORKING_CONTEXT.md` | Record what was done and what remains |
| `docs/PRODUCT_ROADMAP.md` | Update the Data Layer section to reflect the new series |

If any entity intentionally deviates from the standard Definition of Done (no image found, no social accounts, no FanScore), document the exception explicitly in `DEVELOPMENT_LEDGER.md` in the same session.

---

## 9. Ingestion QA Checklist

Run this checklist after every series expansion before closing the session.

**Entity ingestion QA:**

- [ ] All cards render without JS errors
- [ ] All entity images load (no broken-image icons)
- [ ] All country flags render (verify country_code is 2-char ISO)
- [ ] All bios are populated (no null or empty bio fields)
- [ ] FanScore is present and non-suppressed for all scoreable entities (series, teams, athletes)
- [ ] Suppressed entities (venues, events without accounts) show correct suppression message
- [ ] All property_relationships rows are present (verify with query)
- [ ] Panels render without null data fields in Key Facts section
- [ ] EVENT_VENUE_MAP entries exist for all new event slugs
- [ ] No broken image assets in the image registry
- [ ] All exceptions documented in DEVELOPMENT_LEDGER.md

---

## Reference: Exception Documentation Format

When an entity cannot meet a standard requirement, document it in `DEVELOPMENT_LEDGER.md` using this format:

```
Exception: [entity name] ([slug])
Type: [image-not-found | no-social-accounts | no-fanscore | bio-missing]
Reason: [brief explanation]
Status: [intentional | to-be-resolved]
Date: [YYYY-MM-DD]
```

Examples from GTWCE expansion:
- `timur-boguslavskiy`: portrait photo ID not confirmable from GTWCE portal without direct access -- intentional placeholder
- `marco-varrone`: no driver page found under this name in GTWCE portal (Varrone drivers listed as Nico/Nicolas Varrone) -- entity name may need reconciliation
- 8 GTWCE event entities: no dedicated social accounts -- suppression intentional per Rule 8.4
- 6 GTWCE venue entities: no social accounts -- suppression intentional per Rule 8.4
