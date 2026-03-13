# PRODUCT_ROADMAP.md

SponsorAI — Product Roadmap

Last updated: 2026-03-13 (Control Room v0.7 — Ingestion pipeline automation)

---

## 1. Purpose

This document is the single source of truth for the SponsorAI build order and feature roadmap. It reflects what has been built, what is planned, and in what sequence development will proceed.

SponsorAI v1 focuses on measuring and visualising fan attention using FanScore and related signals. The goal is to give brands and properties a clear, neutral, and explainable view of where audience attention is concentrated across motorsport properties.

Brand Fit scoring and FitScore are intentionally excluded from v1. SponsorAI must first establish a trustworthy attention intelligence layer before introducing alignment modelling. Any work on FitScore requires an explicit update to this document and to `docs/SPONSORAI_SYSTEM_CONTRACT.md` before implementation begins.

---

## 2. Current System Capabilities (Built)

### Core Platform

- Modular frontend architecture — JS layer split into `data.js`, `images.js`, `ui.js`, `ai.js`, and `components/` (card, panel, layout)
- Supabase data connection — live REST queries against PostgreSQL 17 via `v_property_summary_current` view
- Edge Function AI proxy — Anthropic API call proxied through `supabase/functions/chat/` with key stored as Supabase secret
- API key isolation — `config.js` gitignored; no credentials committed to repository
- Config template system — `app/config.example.js` tracked as setup reference for new environments

### Explore System

- Explore grid — card grid rendering up to 200 properties with staggered enter/exit animation
- Card component — full card renderer with score, trend, bio, badges, and action buttons
- Card hover elevation — lift and shadow transition on hover
- Car image zoom behaviour — `cubic-bezier(0.22, 1, 0.36, 1)` ease-out zoom scoped to `[data-img-kind="car"]` only; logos and portraits unaffected
- Sort controls — UI sort menu with alpha, FanScore, followers, engagement rate, and trend options
- Filter controls — type filter chips (All, Drivers, Teams, Series, Events, Venues) with live count
- Image registry system — typed asset schema (`kind`, `fit`, `pos`, `pad`, `bg`) in `images.js`; 78 registered entries
- Event to venue mapping — `EVENT_VENUE_MAP` with 18 entries providing automatic venue image fallback for events without dedicated photography

### Property Panels

- Slide-out panel — detail panel with open/close animation, masonry reflow on transition
- Panel renderer — `components/panel.js` with 10 structured sections
- Property information display — FanScore block, engagement snapshot (audience, engagement, growth, loyalty), score explanation, key facts, score history, related properties, data and transparency, recent posts
- Image hero — typed image displayed in panel header with kind-appropriate fit and padding

### Data Layer

- Supabase database — PostgreSQL 17, project `kyjpxxyaebxvpprugmof`, with full schema, views, and compute functions
- Property table — Universal Property Model supporting driver, athlete, team, series, event, venue, governing_body types
- British GT seed data — full 2024 season: venues, events, teams, athletes, social accounts, follower histories, posts, FanScore pipeline
- GTWCE dataset migration — GT World Challenge Europe 2024: 6 teams, 8 athletes, 6 venues, 8 event brands; all 14 properties scoring at High confidence; SRO Motorsports Group governing_body scoring at Low confidence
- FanScore calculation — three-stage pipeline: `compute_daily_rollups`, `compute_fanscore_daily`, `compute_fanscore_windows`; suppression logic; confidence bands
- Event venue mapping — `property_relationships` table populated with `series_contains_event`, `event_at_venue`, `series_has_team`, `team_has_athlete` links
- Image mapping — `PROPERTY_IMAGES` registry with venue (Wikimedia Commons preferred), team logo, athlete portrait, and series logo entries
- Series ingestion process -- standardised workflow defined in `docs/SERIES_INGESTION_PROCESS.md`; all future series expansions follow this process
- Automated ingestion pipeline -- `build_series_structure` RPC covers `premiership-rugby` (full creation) and `gt-world-challenge-europe` (repair). "Start ingestion" in the Control Room now runs structure creation, checklist auto-advancement, and audit in a single pipeline. Seed SQL files: `database/seeds/premiership_rugby_2026.sql`, `database/seeds/gtwce_2024.sql`.

### AI Layer

- AI chat panel — conversational assistant with greeting on first open, context-aware responses
- Supabase Edge Function proxy — Anthropic key never exposed in browser; all API calls routed through `functions/chat/index.ts`

### Documentation

- Development ledger — `project-docs/DEVELOPMENT_LEDGER.md`, updated to reflect all 2026-03-13 changes
- System state doc — `docs/SYSTEM_STATE.md`, live snapshot of database and frontend feature status
- Working context doc — `docs/WORKING_CONTEXT.md`, session handoff document
- System contract — `docs/SPONSORAI_SYSTEM_CONTRACT.md`, 7-section architectural rules including Scoring Scope
- Local setup doc — `project-docs/LOCAL_SETUP.md`, explains gitignored files and setup steps for new environments

---

## 3. Planned Features

### Panel Intelligence

- Momentum signals — derived signal badges shown on cards and in the panel (Rising Fast, Growing, Losing Momentum, High Engagement, Audience Surge) based on `t30`, `engRate30d`, and `followersDelta`; includes Trending sort option
- Relationship sections — DB-backed display of entity connections in the detail panel (Drives For, Appears In, Drivers, Venue, Participating Teams, Hosted Events, etc.) using live queries against `property_relationships`
- Key facts enrichment — populate Sport category and Primary region in the panel Key Facts section using `sport`, `region`, and `city` columns that already exist on the live `properties` table

### Discovery Intelligence

- Trending / Emerging properties — `momentum_score` derived client-side; Trending sort option; properties surfaced by recent movement, not just size
- Fastest growing drivers — surface athletes showing strongest follower growth relative to their tier
- Cooling properties — identify properties with declining trend scores for contrast and completeness of market view

### Explore Improvements

- Search — visible keyword search field filtering `allCards` by name or type without requiring the AI chat panel
- Advanced filters — sport category, region, confidence band, suppression status
- Compare tray — persistent multi-select comparison state with side-by-side panel view

---

## 4. Development Phases

### Phase 1 — Discovery Engine

The immediate build priority. All features use existing data and require no schema changes.

- Momentum signals — derive and display signal badges on cards and in the panel; add `momentum_score` computation and Trending option to the sort menu
- Panel relationship sections — surface the `property_relationships` graph in the detail panel
- Key facts enrichment — fetch and display `sport`, `region`, `city` in the panel Key Facts section

### Phase 2 — Explore Intelligence

Improve discovery breadth and signal quality at the grid level.

- Search — keyword search input filtering the live card set
- Emerging drivers — dedicated discovery surface for athletes showing breakout momentum
- Breakout teams — teams with disproportionate recent growth relative to their historical baseline
- Cooling properties — market-completeness view surfacing declining engagement signals

### Phase 3 — Network Intelligence

Make the property graph navigable and explorable as a connected system.

- Driver to team to series relationship traversal in panels
- Event to venue to series relationship chains
- Network graph exploration — visual or list-based navigation of the relationship graph from any property

### Phase 4 — Sponsorship Layer (Future)

Introduce historical and contextual sponsorship data. This phase requires careful governance review before implementation.

- Sponsorship history — past and current brand partnerships associated with properties
- Brand presence signals — sponsorship density and category diversity per property
- Partnership timelines — temporal view of sponsorship activity

FitScore and Brand Fit modelling are outside the scope of v1 and are not included in any phase above. They may be introduced in a future phase once the attention intelligence layer is established, validated, and trusted. Any introduction requires an explicit update to both this document and `docs/SPONSORAI_SYSTEM_CONTRACT.md`.

---

## Future Discovery Concepts

Additional discovery features are captured in: `docs/PRODUCT_FEATURE_BACKLOG.md`

These include:

- AI-curated discovery rows (Attention Leaders, Rising Attention, Emerging Drivers, etc.)
- Ecosystem influence scoring (series reach including weighted team and driver audiences)
- Relationship-driven discovery (graph traversal to surface contextual connections)
- Explore card hierarchy improvements (FanScore as visual anchor with inline trend)

None of these are committed to the current build. They are preserved for future planning sessions.

---

## 5. Control Room (Internal Operational Tooling)

An internal-only page for ingestion management and data quality review. Not part of public product navigation.

### v0.1 — 2026-03-13 (complete)

File: `app/control-room.html`

Sections delivered:

- Ingestion form with series slug, season, sport category, governing body, entity-type toggles (teams, athletes, events, venues, synthetic signals), and Start Ingestion / Run Audit Only buttons
- Ingestion status table with per-series coverage bars for image registration and FanScore coverage, duplicate flags, status badges (Pending / Running / Needs Review / Complete), and last run timestamp
- Issues table with all seven audit flag types surfaced: `flag_missing_fanscore`, `flag_missing_posts`, `flag_missing_image`, `flag_image_hotlink_risk`, `flag_duplicate_slug`, `flag_duplicate_name`, `flag_duplicate_event`; filterable by issue type; severity-coded; per-row action buttons
- Action modal for Add Image URL, Review Duplicate, Retry Image Validation, and Mark Suppressed
- Run log with timestamped entries and tag labels (audit, ingest, repair, error)

Data source at v0.1: mock rows pre-populated from the GTWCE audit output. Live Supabase query integration is the next wiring step.

### v0.2 — 2026-03-13 (complete)

Live audit and persisted issue states.

Delivered:

- `Run audit only` wired to `run_series_audit()` PostgreSQL RPC function via Supabase REST. Returns 18 columns per entity; FLAG_MAP maps 7 flag columns to issue rows.
- Repair actions live: Retry image validation (browser Image element test), Recompute FanScore (live `fanscore_windows` query), Mark intentional placeholder, Mark intentional suppression. All four update issue state in memory and log to the run log.
- Issue states persisted in new `control_room_issue_states` table. On audit run, persisted states are loaded and merged -- resolved/intentional issues remain suppressed if the underlying flag is still TRUE. If the flag is now FALSE, the issue disappears naturally.
- Reopen action: suppressed issues remain visible in the table at 45% opacity with a state badge and Reopen button. Clicking Reopen deletes the DB row and restores the issue to open.
- Count header: `N open · M resolved · K intentional` across all issues regardless of active filter.

### v0.3 — 2026-03-13 (complete)

Start ingestion wired. The Control Room is now the entry point for the ingestion lifecycle.

Delivered:

- "Start ingestion" creates an `ingestion_runs` record (status: pending), shows it immediately in the status table, runs the live audit, then updates the record with the final status, entity count, and issue count.
- Status flow implemented end-to-end: pending (on create) → needs-review or complete (after audit).
- `loadIngestionRuns()` on page load fetches the most recent run per series from Supabase and merges into the status table. Previous runs survive page reload.
- Status table: "Run audit" button added per row. Fills the form slug and runs the audit; scrolls to the issues section on completion.
- `formatTimestamp()` helper extracted and used consistently.
- All form fields captured in the run record: slug, series name, season, sport, governing body, notes, include_teams/athletes/events/venues, synthetic_signals flag.

Still stubbed in v0.3:

- Actual entity creation SQL (properties, accounts, posts, FanScore). The run record is created and the audit is run; data population is still manual via Supabase SQL editor.
- Run log persistence. Entries remain in-memory.
- `synthetic_signals` pipeline. The flag is stored in the run record but no automation is wired.

### v0.4 — 2026-03-13 (complete)

Run log persisted. All three Control Room data surfaces now survive page reloads.

Delivered:

- `control_room_log` table: append-only, linked to `ingestion_runs` via nullable `run_id` FK.
- Every `addLogEntry()` call fires a background write to the DB (`persistLogEntry`) with `run_id`, `series_slug`, `tag`, and the HTML message string.
- `loadLog()` on init fetches the 200 most recent log entries and replaces `LOG_DATA`. Entries appear in the same visual format as before (ts, message, tag chip with colour).
- `currentRunId` module-level variable tracks the active ingestion run ID. Set on `createIngestionRun`, cleared in finally. Log entries during an ingestion flow carry the run FK; standalone audit entries have `run_id: null`.
- Mock log history removed. The log section shows "No runs recorded yet" on first load against a fresh DB.
- `currentAuditSlug` now set before the first `addLogEntry` call in both `handleRunAudit` and `handleStartIngestion`, so every entry -- including "Audit started" -- carries the correct `series_slug`.

Full persistence summary: ingestion runs (`ingestion_runs`), issue triage states (`control_room_issue_states`), run log (`control_room_log`) -- all persisted.

### v0.5 — 2026-03-13 (complete)

Per-run lifecycle checklist. Each ingestion run now tracks progress through five structured stages.

Delivered:

- `ingestion_run_checklist` table: one row per stage per run. FK to `ingestion_runs` (CASCADE DELETE). State values: `not_started`, `in_progress`, `complete`, `blocked`. UNIQUE on `(run_id, stage_key)`.
- Five stages: `structural_creation`, `presentation_data`, `score_data`, `ui_verification`, `exceptions_review`.
- Status table: each series row now has a "Checklist" button in the Actions column. Clicking expands a panel row showing the five stages as clickable state pills.
- Stage state cycles on click: not_started → in_progress → complete → blocked → not_started. State is persisted immediately (fire-and-forget POST with `resolution=merge-duplicates`).
- `CHECKLIST_DATA` in-memory cache: loaded lazily on first expand per run. Re-expanding after `renderStatus()` re-runs does not re-fetch (uses cache).
- Every stage transition adds a log entry with tag `ingest`.
- Checklist button is disabled for status rows with no persisted run record.

### v0.6 — 2026-03-13 (complete)

UI visibility control layer. Data can now exist in the system without appearing in the public UI.

Delivered:

- `properties.visible_in_ui` column (boolean, NOT NULL DEFAULT false). All existing rows migrated to `true`. Index created.
- `properties.hidden_reason` column (nullable text). For documenting why an entity is withheld.
- `series_visibility` table: `series_slug` (PK), `ready_for_ui`, `visible_in_ui`, `note`, `updated_at`. Tracks series-level readiness and live status independently of the entity-level flag.
- `set_series_ui_visibility(p_series_slug, p_visible)` RPC: SECURITY DEFINER function. Cascades `visible_in_ui` to all ecosystem members by walking `property_relationships` across all 9 relationship types including 2-hop series-to-venue paths.
- `v_property_summary_current` updated: `p.visible_in_ui` appended as last column.
- `data.js`: `loadGrid()` now filters `visible_in_ui=eq.true`. Hidden entities are excluded from Explore, all card grids, and all public detail panels.
- Control Room status table: new "UI" column with `Live` / `Ready` / `Hidden` badge and contextual action buttons (`Go live`, `Hide from UI`, `Mark ready`, `Mark not ready`).
- Optimistic local updates in the Control Room: badge and buttons update immediately; DB write and cascade fire in the background.
- Lifecycle: `ingested` → `audited` → `repaired` → `ready_for_ui` → `visible_in_ui`.

### v0.7 — 2026-03-13 (complete)

Automated ingestion pipeline. "Start ingestion" is now a real pipeline, not just a run creator.

Delivered:

- `build_series_structure` RPC: SECURITY DEFINER function. Routes on `p_series_slug`. Supported templates: `premiership-rugby` (full entity + relationship creation, optional synthetic signals), `gt-world-challenge-europe` (idempotent data quality repair). Returns `{ entities_created, entities_updated, relationships_created, warnings, unsupported_steps }`.
- Premiership Rugby template: 35 entities (1 series, 1 governing body, 9 teams, 11 athletes, 9 venues, 1 event) with complete metadata. ~45 relationships across all 7 required types. Synthetic signal path: accounts (instagram/x/tiktok for teams, instagram/x for athletes), 90-day follower history, posts every 3 days, decay-weighted post metrics, scoring pipeline run.
- GTWCE repair template: corrects `country='GB'` to `'United Kingdom'` and `region='United Kingdom'` to `'Europe'` across all GTWCE entities. Ensures `governing_body_oversees_series` relationship.
- `handleStartIngestion()` rewritten: 5-step pipeline -- (1) create run record as `status='running'`, (2) call `build_series_structure`, (3) auto-advance checklist stages from results, (4) run live audit, (5) set final status. Log entries at each step.
- Checklist auto-advance: `structural_creation` → complete when entities+relationships returned; `presentation_data` → in_progress; `score_data` → in_progress if synthetic signals used; `ui_verification` → in_progress when audit completes clean.
- Seed SQL files: `database/seeds/premiership_rugby_2026.sql` and `database/seeds/gtwce_2024.sql` -- standalone reference seeds mirroring the RPC templates. Safe to re-run; include embedded exception documentation.

Still manual after v0.7:

- Image URL registration in `app/images.js`
- `EVENT_VENUE_MAP` entries for new event slugs
- Entity name corrections and duplicate resolution
- Exception documentation in DEVELOPMENT_LEDGER.md

### v0.8 — planned

- `Add image URL` action: write proposed URL to a staging table for review before `images.js` is updated
- Log filtering by tag (audit / ingest / repair / error) in the UI

---

## 6. Next Build Targets

Implementation Phase 1 — Momentum Signals, Relationship Panels, Key Facts enrichment (spec: `docs/IMPLEMENTATION_PHASE1.md`)

The next three features to implement, in order:

1. **Momentum signals + Trending** — derive `momentum_score` client-side from existing card fields (`t30`, `engRate30d`, `followersDelta`); display up to two signal badges per card; add a Momentum Signals section to the detail panel; add Trending sort option to the explore sort menu

2. **Panel relationship sections** — surface the live `property_relationships` graph in the detail panel for all property types (driver, team, series, event, venue); replace current client-side heuristics with DB-backed results

3. **Key facts enrichment** — fetch `sport`, `region`, `city` from the `properties` table (columns already exist); populate the four currently null rows in the panel Key Facts section
