# DEVELOPMENT_LEDGER.md

SponsorAI — Current Development State

Last updated: 2026-03-14 (Property page — ecosystem relationship explanation layer)

---

## Purpose

A living record of what is built, what is stub-only, what is broken, and what the next likely engineering decisions are. Update this file when the development state changes.

The authoritative technical source for prototype internals is:
`_internal/prototype-archive/HANDOVER.md`

The authoritative issue list is the March 2026 code review at:
`_internal/06_Experiments/SponsorAI_Code_Review.md`

---

## Prototype Status

### What is active and functional

| Surface | Status | Notes |
|---|---|---|
| Control Room (`app/control-room.html`) | Active — v1.0 (archive/delete run, 2026-03-14) | Internal-only page. "Start ingestion" calls `build_series_structure` RPC. Row menu: Run audit, Run again, Scan images, View images, Edit run, Checklist, visibility controls, Archive run, Delete permanently. Archive: soft-delete (archived=true on ingestion_runs + visible_in_ui=false on properties). Delete: cascade removes ingestion_run_checklist + control_room_log + ingestion_run; entity-count warning shown if entities>0; does NOT touch control_room_issue_states, series_visibility, or properties. loadIngestionRuns filters archived=eq.false. Section 2.5 (Images): full image audit surface. |
| Explore screen (`app/explore.html`) | Active — simplified UX (2026-03-14) | Grid-only layout. Full-page property overlay (scroll-preserving). Load More pagination (24 + 24). Scroll-to-top button. Masonry and list views removed. |
| Card grid | Active | Fetches up to 200 cards; renders first 24, loads +24 on demand |
| Type filters | Active | All / Drivers / Teams / Series / Events — client-side |
| AI chat panel | Active | Direct Anthropic API call, CMD-based grid control |
| Property detail panel | Active — full-page overlay (2026-03-14) | Full-page overlay with backdrop blur, closes on backdrop click or Escape, scroll position restored on close. Content: FanScore history, confidence, signals, bio, related properties, recent posts. Action buttons (Watch, Portfolio, Compare) wired to SAI_STORAGE. |
| Theme toggle | Active | Light/dark mode, persisted in localStorage |
| FanScore display | Active | 30d average, trend direction, confidence band, coverage % |
| Suppression handling | Active | Suppressed cards render `--` instead of score |
| Property images | Active | Typed image asset system (`images.js`). Kinds: car, portrait, logo, venue, series. `EVENT_VENUE_MAP` provides venue image fallback for events. Car assets apply CSS zoom + cubic-bezier ease-out on hover. 91 PROPERTY_IMAGES entries; 19 EVENT_VENUE_MAP entries. Premiership Rugby ecosystem: series, venue, 10 team logos, governing body all in images.js. entity_images: 13 confirmed rows post 2026-03-14 cleanup (bath, bristol, exeter, gloucester, harlequins, leicester, newcastle, northampton, sale, saracens, premiership-rugby series, premiership-rugby-ltd, + bath previously confirmed). Event (premiership-rugby-final-2026) uses EVENT_VENUE_MAP fallback. Athletes: 11 pending portrait sourcing. |
| Sort controls | Active | Sort menu UI with alpha, score, followers, engagement, trend, and Trending options. Triggered from explore header. |
| Momentum signals | Active | Signal badges on cards and in panel. `computeMomentumScore()` derives up to 2 badges (Rising Fast, Growing, Losing Momentum, High Engagement, Audience Surge) from `t30`, `engRate30d`, `followersDelta`, `followers`. Suppressed cards show no badges. Panel section 4b renders when signals are present; omits section entirely when none. |
| CSS token spacing | Active | Spacing rhythm pass applied 2026-03-13. Five raw-px values replaced with semantic tokens (`--spacing-xs` through `--spacing-xl`). |
| Shared UI helpers (`app/ui-helpers.js`) | Active — v1.0 (2026-03-14) | `window.SAI_UIH` namespace. Centralises: `initTheme`, `navigateTo` (global alias), `initMenuListeners`, `typeBadgeHtml`, `fanScoreText`, `trendText`, `trendColor`, `propertyCountText`, `isOnWatchlist`, `isInPortfolio`, `isInCompare`, `errorHtml`, `loadingHtml`. All 6 public pages load it after `ui.js`. CLAUDE.md rule added: check ui-helpers.js before creating new UI fragments or helpers. |

### What exists as stub only

| Surface | Status | Notes |
|---|---|---|
| Control Room — entity creation SQL | Not started | Start ingestion creates a run record and runs the audit. The actual property/account/post data population is still manual via Supabase SQL editor. |
| Compare view (`app/compare.html`) | Active | 3-way side-by-side comparison. URL-driven (?a=slug&b=slug&c=slug). localStorage-driven fallback. Handles 0/1/2/3 selection states with status feedback. Table scales to 2 or 3 columns. Clear selection + save-as-link. |
| Portfolio view (`app/portfolio.html`) | Active | Table layout. Loads live data from Supabase for saved slugs. Summary stats bar (count, avg FanScore, rising count). Remove, View, Compare actions all functional. SAI_STORAGE wired. |
| Watchlist view (`app/watchlist.html`) | Active | List layout. Loads live data from Supabase for saved slugs. Remove, View, Compare actions functional. SAI_STORAGE wired. |
| Property profile (`app/property.html`) | Active — ecosystem explanation added (2026-03-14) | Full property view. FanScore card, audience signals, momentum chart, ecosystem (grouped by relationship type with contextual labels + influence summary bar), recent posts. Watchlist toggle wired to SAI_STORAGE. |
| Opportunities (`app/opportunities.html`) | Placeholder | Bridge content only (top 5 FanScore properties). Not in main nav. Page loads directly but is not linked from primary navigation. |
| Scenarios | Removed | Nav item removed from all pages |
| Reports | Removed | Nav item removed from all pages |
| Shared storage module (`app/storage.js`) | Active | SAI_STORAGE.watchlist / .portfolio / .compare (max 3). Consistent localStorage API across all pages. |
| FitScore | Not started | Referenced in docs; no data in schema, no UI |
| Sparkline charts — FanScore (small) | Active | Rendered in FanScore block on property.html via `renderSparkline()`. 120x48 SVG, async after sparks load. |
| Momentum chart (large) | Active | Rendered in Momentum section on property.html via `renderMomentumChart()`. Full-width 600x72 SVG with date labels. Metric tiles (30d/90d change, daily trend) rendered synchronously via `renderMomentumMetrics()`. |
| Search input | Not started | Search is chat-only; no keyword search field exists |
| Pagination | Active — client-side (2026-03-14) | PAGE_SIZE=24. First 24 rendered on load/filter/sort. Load More appends +24. Full 200-card fetch preserved. Footer shows count + Load More button. |
| Panel relationship sections | Active | DB-backed; `loadRelationships()` queries `property_relationships` forward+reverse; grouped by `REL_LABELS` with 20 type×direction mappings; capped 8 per group; renders clickable `.dp-rel-item` rows |
| Momentum signals | Active | `computeMomentumScore()` in `data.js`; up to 2 badges per card; panel section 4b rendered conditionally; suppressed cards show no badges |
| Trending sort | Active | Trending sort option in explore sort menu; momentum_score derived client-side |
| Key Facts enrichment | Active | `sport`, `region`, `city` fetched from `v_property_summary_current` (view updated 2026-03-13 to expose these columns); rendered in panel Key Facts section |

---

## Known Issues

Derived from the March 2026 code review. Full detail at:
`_internal/06_Experiments/SponsorAI_Code_Review.md`

### Critical — security

1. **Anthropic API key in browser JS** (`app/config.js`)
   Keys are now isolated to `app/config.js` (gitignored) and no longer committed to the repository. The key is still visible in browser DevTools to anyone with local access. Must be proxied through a backend function (e.g. Supabase Edge Function) before wider sharing. Rotate the key if it has previously been shared in a committed file.

2. **Supabase anon key in browser JS with no RLS active** (`app/config.js`)
   Key isolated to `app/config.js` (gitignored) — no longer committed. Anyone with the key can still query the full database as RLS is not yet enabled. Must be resolved before production or wider prototype sharing.

3. **Investor portal credentials hardcoded in `website/investor-auth.js`**
   The username and password are visible in the public script file. The auth is trivially bypassed. Requires a real authentication layer.

### High — correctness

4. **Scoring model weights hardcoded in SQL, not read from `fanscore_models.weights_json`**
   Changing weights in the model registry has no effect on computed scores.

5. **`v_property_summary_current` column names diverge between master schema and `ui_data_layer.ts`**
   The master schema is out of sync with the live database state.

6. **`compute_fanscore_windows` does not write `suppression_reason`**
   The master schema is missing migration 008 logic. Running it from scratch produces a broken database.

7. **`MODEL_VERSION` hardcoded in TypeScript as `'v1.0'`**
   The UI will not pick up a new active model version until the constant is manually updated.

8. **Typo in TypeScript interface: `isSupressed` (missing one `p`)**
   Propagates through both `LatestDailyScore` and `ScorePoint` interfaces.

9. **Email signup form captures nothing**
   `website/script.js` calls `simulateSuccess()` and discards every signup. No data is sent anywhere. Every lead from the website is currently lost.

### Medium — performance

10. **Correlated subqueries in `compute_fanscore_daily`** — acceptable for current dataset size; will degrade at production scale.

11. **Sequential fetches with large URL parameter** — second Supabase fetch passes all 200 UUIDs as a URL string (~7,500 characters). Fragile at scale.

12. **Missing index for `suppression_reason IS NOT NULL` filter** — documented as acceptable for demo.

### Low — maintainability

13. ~~`explore.html` is a 3,699-line monolithic file — CSS and JS are not separated.~~ RESOLVED 2026-03-13. `explore.html` has been split into layered files: `styles.css`, `data.js`, `components/card.js`, `components/layout.js`, `components/panel.js`, `ui.js`, `ai.js`, `config.js`. The inline script now contains only two init IIFEs (`initLayout`, `initTheme`), two document-level event listeners, and the `init` IIFE. See `project-docs/REFACTOR_SUMMARY.md`.

14. CSS variable forward references in `:root` — works in all modern browsers but reduces legibility.

15. Inline onclick handlers in dynamically built HTML strings — event delegation would be cleaner.

16. `escHtml` function defined after first use — works due to function hoisting, but inconsistent.

17. ~~Detail panel action buttons are non-functional stubs.~~ RESOLVED 2026-03-14 -- all three panel action buttons (Watch, Portfolio, Compare) are fully wired. See WORKING_CONTEXT for detail.

18. Old prototype files in `prototype-archive/Old/` are not yet formally archived to `99_Archive/`.

19. `console.log` statements in production-facing website code expose internal state in DevTools.

20. Master schema is not the source of truth for the live database — migrations 006–008 are not consolidated.

22. **`series_visibility` table does not auto-populate when a new ingestion run is created.** A new series added via "Start ingestion" creates a row in `ingestion_runs` but no corresponding row in `series_visibility`. Its visibility defaults to `{ ready_for_ui: false, visible_in_ui: false }` (derived from `visData()` fallback). The Control Room shows "Hidden" for such series. The operator must click "Mark ready" or "Go live" to create the row and set flags. This is intentional -- new data is hidden by default -- but the absence of a DB row means the `series_visibility` table does not capture the hidden state explicitly until the operator takes action.

21. **GTWCE 2024 migrations applied directly, not tracked as SQL files.** Six migrations (`gtwce_core_properties`, `gtwce_relationships`, `gtwce_social_accounts_and_followers`, `gtwce_posts_and_metrics`, `gtwce_x_posts_for_completeness`, `gtwce_missing_athlete_posts`) were applied to the live database via the Supabase MCP tool during the 2026-03-13 session. They exist only in the live database. No tracked SQL seed file covers the full GTWCE dataset. If the database is dropped and rebuilt from `001_master_schema.sql`, all GTWCE properties, accounts, follower histories, posts, and scores will be lost. **Resolution:** create `database/gtwce_2024_seed.sql` as a consolidated idempotent seed file before any database rebuild is attempted.

---

## Next Likely Engineering Tasks

These are the most impactful improvements to work toward, roughly ordered by priority:

**Security (prerequisite for wider sharing)**
- Proxy the Anthropic API call through a Supabase Edge Function or similar backend
- Enable Row-Level Security on all Supabase tables
- Replace investor portal credentials with a real auth mechanism (Supabase Auth magic link would be minimal effort)
- Rotate any API keys that have been shared externally

**Business-critical**
- Fix the website email capture — connect it to a real backend or email service
- Connect `website/script.js` signup to actual data capture before pointing investors at the form

**Data model integrity**
- Consolidate migrations 006–008 into the master schema file
- Fix the scoring function to read weights from `fanscore_models.weights_json` dynamically
- Align `v_property_summary_current` column names across schema, TypeScript, and JS

**Structural maintainability**
- ~~Split `explore.html` into separate CSS and JS files~~ DONE 2026-03-13 — see `project-docs/REFACTOR_SUMMARY.md`
- Migrate direct REST calls to use the Supabase JS SDK pattern defined in `ui_data_layer.ts`
- Move TypeScript data layer into active use

**Product features**
- ~~Implement property detail panel action buttons~~ DONE 2026-03-14 -- Watch, Portfolio, Compare fully wired in panel and card overlay
- ~~Implement persistent watchlist/compare/portfolio state~~ DONE 2026-03-14 -- SAI_STORAGE wired across all pages; cross-page state sync confirmed
- ~~Watchlist/Portfolio card button state stale after panel action~~ DONE 2026-03-14 -- syncWatchlistButtons/syncPortfolioButtons helpers added; all toggle paths now cross-update card and panel buttons immediately
- Property profile momentum charts -- replace static sparkline with a proper 30d / 90d change chart on the property profile page (next prioritised UX item)
- Implement sparkline rendering on cards (data is already fetched and stored in `c.sparks`)
- Populate `image_url` with real property images

---

## Database Migration State

| Migration | Status | Effect |
|---|---|---|
| Base schema (`001_master_schema.sql`) | Applied | Core tables, scoring functions, base views |
| Migration 006 | Applied, not in master schema | Column renames on `v_property_summary_current` |
| Migration 007 | Applied, not in master schema | Additional schema changes |
| Migration 008 | Applied, not in master schema | Adds `suppression_reason` column and logic |
| `gtwce_core_properties` | Applied 2026-03-13 | 6 venues, 8 events (brands), 6 teams, 8 athletes for GTWCE |
| `gtwce_relationships` | Applied 2026-03-13 | Relationship graph: series_contains_event, event_at_venue, series_has_team, team_has_athlete |
| `gtwce_social_accounts_and_followers` | Applied 2026-03-13 | 24 accounts + 90-day HASHTEXT-seeded follower histories |
| `gtwce_posts_and_metrics` | Applied 2026-03-13 | IG + X posts with POWER(0.55, day_offset) decaying engagement metrics |
| `gtwce_x_posts_for_completeness` | Applied 2026-03-13 | X posts for 4 teams + 4 athletes that had X accounts but no posts (fixed completeness < 60% suppression) |
| `gtwce_missing_athlete_posts` | Applied 2026-03-13 | IG posts for Boguslavskiy and Varrone (had accounts but zero posts) |

| `add_sport_region_city_to_view` | Applied 2026-03-13 | `CREATE OR REPLACE VIEW v_property_summary_current` adds `p.sport`, `p.region`, `p.city` to SELECT; required for Key Facts enrichment (Feature 3) |
| `populate_region_from_country` | Applied 2026-03-13 | 9 country→region UPDATE statements; population script archived as `database/populate_sport_region.sql` |
| `populate_region_remaining` | Applied 2026-03-13 | Confirmed 99/99 region coverage after timeout; see DEVELOPMENT_LEDGER for details |
| `fix_missing_country_codes` | Applied 2026-03-13 | Fixed `country_code = 'GB'` for British GT Donington Park; `country_code = 'IT'` for Giacomo Petrobelli |
| `sro_synthetic_posts_and_metrics` | Applied 2026-03-13 | 30 IG posts + 30 X posts for SRO Motorsports Group; HASHTEXT-seeded; pipeline re-run to produce FanScore |
| `create_run_series_audit_function` | Applied 2026-03-13 | PostgreSQL function `run_series_audit(p_series_slug text)` -- full CTE chain over series ecosystem; RETURNS TABLE 18 columns; SECURITY DEFINER; GRANT to anon, authenticated |
| `create_run_series_audit_summary_function` | Applied 2026-03-13 | `run_series_audit_summary(p_series_slug text)` -- aggregates the audit function into 10-column count summary |
| `create_control_room_issue_states` | Applied 2026-03-13 | `control_room_issue_states` table -- persists resolved/intentional issue states from the Control Room. Schema: id, series_slug, property_id (FK), issue_type, issue_key, state, note, created_at, updated_at. UNIQUE (series_slug, property_id, issue_key). RLS enabled (permissive policies for anon/authenticated). Trigger auto-maintains updated_at. Index on series_slug. |
| `create_ingestion_runs` | Applied 2026-03-13 | `ingestion_runs` table -- tracks each ingestion lifecycle run. Schema: id, series_slug, series_name, season, sport, gov_body_slug, notes, include_teams, include_athletes, include_events, include_venues, synthetic_signals, status (pending/running/needs-review/complete), entity_count, issue_count, started_at, completed_at, created_at, updated_at. RLS enabled (permissive for anon/authenticated). Reuses `set_updated_at()` trigger. Indexes on series_slug and created_at DESC. |
| `create_control_room_log` | Applied 2026-03-13 | `control_room_log` table -- append-only log of Control Room operations. Schema: id, run_id (nullable FK to ingestion_runs, SET NULL on delete), series_slug, tag (audit/ingest/repair/error), message (HTML text), meta (jsonb), created_at. RLS: SELECT + INSERT for anon and authenticated; no UPDATE or DELETE. Indexes on created_at DESC, series_slug, and run_id (partial, WHERE NOT NULL). |
| `create_ingestion_run_checklist` | Applied 2026-03-13 | `ingestion_run_checklist` table -- one row per lifecycle stage per ingestion run. Schema: id (uuid PK), run_id (FK to ingestion_runs, CASCADE DELETE), stage_key (text), state (not_started/in_progress/complete/blocked, CHECK constraint), note (nullable text), updated_at. UNIQUE (run_id, stage_key). Trigger `set_checklist_updated_at` reuses existing `set_updated_at()` function. RLS: permissive all-operations policies for anon and authenticated. |
| `build_series_structure_rpc` | Applied 2026-03-13 | `build_series_structure(p_series_slug text, p_season int, p_sport text, p_include_flags jsonb, p_synthetic_signals boolean) RETURNS jsonb`. SECURITY DEFINER. Two templates: `premiership-rugby` (full creation -- 35 entities, ~45 relationships, optional synthetic signals + scoring pipeline) and `gt-world-challenge-europe` (idempotent repair -- fixes country/region fields, ensures SRO relationship). Returns `{ entities_created, entities_updated, relationships_created, warnings, unsupported_steps }`. Granted to anon and authenticated. |

### FanScore Results — post-repair-sweep (2026-03-13)

GTWCE teams (all High confidence): Manthey EMA 81.99, Akkodis ASP 80.98, Iron Lynx 80.91, Haupt Racing 80.72, Emil Frey 75.51, Boutsen VDS 75.42.

GTWCE athletes (all High confidence): Bortolotti 72.54, Weerts 70.87, Vanthoor 70.71, Juncadella 69.31, Gounon 65.73, Boguslavskiy 62.60, Varrone 62.37, Makowiecki 60.22.

SRO Motorsports Group (governing_body): 70.65, Low confidence. Low confidence is expected — 30 posts over 90 days with no prior scoring history.

GT World Challenge Europe (series): 57.79, High confidence.

### Image fix log (2026-03-13)

Barcelona and Magny-Cours broken images fixed (2026-03-13 session): both were using official circuit site URLs with hotlink protection. Replaced with Wikimedia Commons SkySat aerial URLs.

Monza, Paul Ricard, Misano broken image risk mitigated (repair sweep, 2026-03-13): official circuit site URLs replaced with Wikimedia Commons URLs (Monza: `Monza_aerial_photo.jpg`, Paul Ricard: `Circuit_Paul_Ricard,_April_22,_2018_SkySat.jpg`, Misano: `Misano_World_Circuit_Marco_Simoncelli.jpg`).

Nürburgring: no confirmed Wikimedia Commons aerial alternative found; retains official `nuerburgring.de` URL. Potential hotlink risk. Known outstanding gap.

### Intentional exceptions (repair sweep, 2026-03-13)

| Entity | Exception | Status |
|---|---|---|
| `timur-boguslavskiy` | No portrait URL confirmed — GTWCE portal driver_id known (2090) but photo_id not accessible without direct portal access | Intentional placeholder; to revisit |
| `marco-varrone` | No GTWCE driver page found under this name — portal lists Nico/Nicolas Varrone; name may need reconciliation | Intentional placeholder; entity name to verify |
| 8 GTWCE event entities | No social accounts; suppression reason `'Insufficient data'` | Intentional per Rule 8.4 |
| 6 GTWCE venue entities | No social accounts; suppression reason `'Insufficient data'` | Intentional per Rule 8.4 |
| Nürburgring venue image | Official circuit URL; no Wikimedia alternative confirmed | Known hotlink risk; to address when alternative source identified |
