# WORKING_CONTEXT.md

SponsorAI — Working Context

Last updated: 2026-03-13 (Control Room v0.7 — Ingestion pipeline automation)

---

## Purpose

A short-lived document tracking what was just done, what is in progress, and what comes next. Read this before starting any engineering session. Update at the end of each session.

---

## Working Modes

Every prompt on this project should declare which mode it is operating in. This controls how Claude behaves.

| Mode | One-liner |
|---|---|
| **Build** | Implement features or fixes as a senior engineer. Automate safe steps. Keep DB changes explicit. |
| **Review** | Check for bugs, regressions, edge cases. Explain issues. Do not rewrite unnecessarily. |
| **Audit** | Validate data completeness and ingestion state. Diagnose before repairing. Report exact gaps. |
| **Architecture** | Design systems and plan structure. Evaluate tradeoffs. Recommend before implementing. |
| **Documentation** | Update docs only. No app code changes. Keep all docs aligned with current build state. |

Default automation rule: if something can be safely automated, automate it.
Balancing rule: where ambiguity or risk exists, keep a human in the loop rather than faking automation.

Full mode definitions, prompt templates, and workflow sequences: `project-docs/AI_ENGINEERING_PLAYBOOK.md` Sections 11-14.

---

## Last Session — 2026-03-13 (Control Room v0.7 — Ingestion pipeline automation)

### Control Room v0.7 -- automated ingestion pipeline

"Start ingestion" is now a real ingestion pipeline, not just a run creator. The Control Room can create an entire series ecosystem automatically for supported templates, then immediately audit and grade it.

**DB change: `build_series_structure_rpc` migration**

New PostgreSQL function `public.build_series_structure(p_series_slug text, p_season int, p_sport text, p_include_flags jsonb, p_synthetic_signals boolean) RETURNS jsonb`. SECURITY DEFINER. Granted to anon and authenticated.

The function supports two templates:

- `'premiership-rugby'` -- full creation. Upserts 35 entities: 1 series (`premiership-rugby`), 1 governing body (`premiership-rugby-ltd`), 9 teams (Bath, Bristol, Exeter, Gloucester, Harlequins, Leicester, Northampton, Sale, Saracens), 11 athletes (Finn Russell, Henry Slade, Ellis Genge, Maro Itoje, Sam Underhill, Ben Youngs, George Ford, Tommy Taylor, Alex Lozowski, Ben Morgan, Tom Curry / `tom-curry-rugby`), 9 venues, 1 event (`premiership-rugby-final-2026`). Creates all relationship types. Optionally generates synthetic social signals (accounts, 90-day follower history, posts every 3 days, post metrics) and runs the scoring pipeline. Returns `{ entities_created, entities_updated, relationships_created, warnings, unsupported_steps }`.

- `'gt-world-challenge-europe'` -- idempotent repair. Fixes `country='GB'` to `'United Kingdom'` and `region='United Kingdom'` to `'Europe'` across teams, athletes, venues, and events. Ensures `governing_body_oversees_series` relationship for SRO. Returns updated counts.

- Any other slug -- returns `unsupported_steps` with an advisory to use the SQL editor manually.

Idempotency: SELECT-then-INSERT/UPDATE pattern for all properties; `IF NOT EXISTS` pattern for all relationships; `ON CONFLICT DO NOTHING` for accounts, follower history, and post metrics; post-level idempotency guard prevents duplicate synthetic posts on re-run.

**Seed SQL files created**

- `database/seeds/premiership_rugby_2026.sql` -- standalone reference seed mirroring the RPC template. Safe to re-run independently. Includes embedded exception documentation.
- `database/seeds/gtwce_2024.sql` -- data quality repair seed for GTWCE country/region fields. Includes all GTWCE exception documentation from the March 2026 expansion.

**`app/control-room.html` changes (handleStartIngestion rewrite)**

The `handleStartIngestion()` function was rewritten to wire a real five-step pipeline:

1. Create run record with `status = 'running'` (was `'pending'`). Show status row immediately as Running.
2. Call `build_series_structure` RPC with all form parameters. Log `entities_created`, `entities_updated`, `relationships_created`, warnings, and unsupported steps.
3. Auto-advance checklist stages based on results:
   - If structure builder returns entities/relationships > 0: `structural_creation` → `complete`; `presentation_data` → `in_progress`; if `synthetic_signals` used: `score_data` → `in_progress`.
   - If unsupported template: `structural_creation` → `in_progress` (prompts manual work).
4. Run the live audit (`run_series_audit`) as before.
5. Set final status (`pending` / `needs-review` / `complete`) based on audit results. If zero open issues after audit, `ui_verification` advances to `in_progress`.

Log messages updated throughout: "Building structure...", structure builder result summary, per-warning entries, audit result. Error path correctly sets `needs-review`.

**What remains manual (Part 8)**

- Image URL registration (`app/images.js`) -- requires confirmed URL per SERIES_INGESTION_PROCESS.md Step 1
- Duplicate resolution and entity name corrections
- Intentional exception documentation in DEVELOPMENT_LEDGER.md
- Score repair for entities with insufficient data
- `EVENT_VENUE_MAP` entries for new event slugs

---

## Previous Session — 2026-03-13 (Control Room v0.6 — UI visibility controls)

### Control Room v0.6 -- UI visibility control layer

A visibility control layer has been added so data can exist in the system without automatically appearing in the public UI. All existing entities remain visible (migrated to `visible_in_ui = true`). New entities default to hidden.

**DB changes (three migrations):**

- `add_visibility_to_properties` -- Added `visible_in_ui boolean NOT NULL DEFAULT false` and `hidden_reason text` to `properties`. Existing rows immediately set to `true` via UPDATE. Index created on `visible_in_ui`. New `set_series_ui_visibility(p_series_slug text, p_visible boolean)` SECURITY DEFINER function walks the `property_relationships` graph (all 9 relationship types, 2-hop via series events to venues) and sets `visible_in_ui` on every ecosystem member in a single transaction. Granted to anon and authenticated.
- `create_series_visibility` -- New `series_visibility` table: `series_slug` (PK text), `ready_for_ui boolean DEFAULT false`, `visible_in_ui boolean DEFAULT false`, `note text`, `updated_at`. RLS enabled with permissive policies for anon and authenticated.
- `update_v_property_summary_current_visibility` -- `v_property_summary_current` view recreated with `p.visible_in_ui` appended as the final SELECT column (preserving all existing column positions to avoid the `cannot change name of view column` error).

**`app/data.js` change:** `loadGrid()` now appends `&visible_in_ui=eq.true` to the `v_property_summary_current` query. Hidden entities are excluded from all public card grids, filters, and panels.

**`app/control-room.html` changes:**

- `SERIES_VISIBILITY` -- module variable. `{ [slug]: { ready_for_ui, visible_in_ui, note } }`. Loaded from `series_visibility` table on init.
- `loadSeriesVisibility()` -- fetches `/series_visibility` and populates `SERIES_VISIBILITY`. Calls `renderStatus()` on completion so badges render without a second init cycle.
- `upsertSeriesVisibility(slug, fields)` -- POSTs to `/series_visibility` with `Prefer: resolution=merge-duplicates`. Fire-and-forget.
- `visData(slug)` -- safe accessor returning `SERIES_VISIBILITY[slug]` or `{ ready_for_ui: false, visible_in_ui: false }` if not yet in table.
- `visBadge(s)` -- returns a `.cr-vis-badge` span: `Live` (green) if `visible_in_ui`, `Ready` (blue) if `ready_for_ui`, `Hidden` (muted) otherwise.
- `visActionBtns(s)` -- returns contextual micro-buttons: `Go live` or `Hide from UI` (primary); `Mark ready` or `Mark not ready` (secondary, shown based on state).
- `setSeriesLive(slug)` -- optimistic local update, calls `set_series_ui_visibility` RPC with `p_visible: true`. Cascade applies to all ecosystem members.
- `hideSeriesFromUI(slug)` -- optimistic local update, calls `set_series_ui_visibility` RPC with `p_visible: false`. Cascade hides all ecosystem members.
- `setSeriesReady(slug, ready)` -- updates `ready_for_ui` flag only in `series_visibility`. Does not trigger cascade.
- `renderStatus()` updated: "UI" column inserted before the Actions column; `colspan="10"` on checklist rows updated to `colspan="11"`.
- `loadSeriesVisibility()` called from `init()` alongside `loadIngestionRuns()` and `loadLog()`.

**CSS additions:** `.cr-vis-badge` base class with `[data-vis="live"]`, `[data-vis="ready"]`, `[data-vis="hidden"]` variants. Light and dark-mode token-based colour handling.

**Lifecycle model:** `ingested` → `audited` → `repaired` → `ready_for_ui` → `visible_in_ui`. Hidden entities remain in the database and fully visible in the Control Room. The public UI (`explore.html`, `loadGrid()`) only loads properties where `visible_in_ui = true`.

---

## Previous Session — 2026-03-13 (Control Room run checklist)

### Control Room v0.5 -- per-run lifecycle checklist

Each ingestion run now carries a five-stage lifecycle checklist. Stage states persist in the database and are updated directly from the status table UI.

**DB change:** New table `public.ingestion_run_checklist`. Schema: `id` (uuid PK), `run_id` (uuid, FK to `ingestion_runs`, CASCADE DELETE), `stage_key` (text), `state` (not_started/in_progress/complete/blocked, CHECK constraint), `note` (nullable text), `updated_at` (timestamptz). UNIQUE constraint on `(run_id, stage_key)`. Trigger `set_checklist_updated_at` auto-maintains `updated_at` by reusing the existing `set_updated_at()` function. RLS enabled with permissive SELECT+INSERT+UPDATE+DELETE policies for anon and authenticated.

**Five stages:** `structural_creation`, `presentation_data`, `score_data`, `ui_verification`, `exceptions_review`.

**UI changes in `app/control-room.html`:**

- `STAGE_DEFS` -- module constant. Array of `{ key, label }` for all five stages.
- `STATE_LABELS` -- map from state key to display string (Not started, In progress, Complete, Blocked).
- `CHECKLIST_DATA` -- module variable. `{ [runId]: { [stageKey]: { state, note } } }`. Lazily populated on first expand.
- `loadChecklistForRun(runId)` -- fetches `ingestion_run_checklist?run_id=eq.{id}` and populates `CHECKLIST_DATA[runId]`.
- `upsertChecklistStage(runId, stageKey, state)` -- POSTs to `/ingestion_run_checklist` with `Prefer: resolution=merge-duplicates`. Fire-and-forget.
- `renderChecklist(runId, slug)` -- updates the `.cr-stage-list` container inside the hidden checklist row with current state from `CHECKLIST_DATA`. Called after load and after each cycle.
- `toggleChecklist(runId, slug)` -- async. Toggles the hidden checklist row. On first open, calls `loadChecklistForRun` then `renderChecklist`. On close, hides the row.
- `cycleStageState(runId, stageKey, slug)` -- cycles state: not_started → in_progress → complete → blocked → not_started. Updates `CHECKLIST_DATA` in memory, calls `renderChecklist`, adds a log entry, and fires `upsertChecklistStage`.
- `renderStatus()` -- rewritten to emit two `<tr>` per series: the existing main row (with "Run audit" and a new "Checklist" button in the Actions column) plus a `<tr id="cl-row-{slug}" class="cr-checklist-row" style="display:none;">` containing the stage list. If `run_id` is null (no run record yet), Checklist button is disabled.

**CSS additions:** `.cr-checklist-row td`, `.cr-checklist-panel`, `.cr-checklist-label`, `.cr-stage-list`, `.cr-stage`, `.cr-stage-dot`, `.cr-stage-label`. State variants use existing design tokens. Dark mode overrides follow the rgba pattern used for other control room components.

**Behaviour:** The checklist row is hidden by default. Clicking "Checklist" in the Actions column expands it. Stage pills display current state from the database on first open. Clicking a pill cycles the state one step forward and persists immediately. The run log records every stage transition. If `renderStatus()` is re-called (e.g. after a new audit), checklist rows re-collapse, but `CHECKLIST_DATA` remains cached so re-expanding is fast (no second DB fetch).

---

## Previous Session — 2026-03-13 (Control Room run log persistence)

### Control Room v0.4 -- run log persisted

Every `addLogEntry()` call now writes to the database. Log history loads from Supabase on page init. The full operational history survives page reloads.

**DB change:** New table `public.control_room_log`. Schema: `id` (uuid PK), `run_id` (nullable FK to `ingestion_runs`, SET NULL on delete), `series_slug` (nullable text), `tag` (audit/ingest/repair/error, CHECK constraint), `message` (text, stores the HTML message string), `meta` (jsonb, reserved), `created_at`. Indexes on `created_at DESC`, `series_slug`, and `run_id` (partial, WHERE NOT NULL). RLS enabled -- SELECT and INSERT for anon and authenticated. No UPDATE or DELETE (log is append-only).

**UI changes in `app/control-room.html`:**

- `LOG_DATA` changed from a const array (mock entries) to `let LOG_DATA = []`. Mock log history removed.
- `currentRunId` -- new module-level variable (nullable uuid). Set to the run UUID at the start of `handleStartIngestion`, cleared in the finally block. Allows log entries written during an ingestion flow to carry `run_id`.
- `persistLogEntry(msg, tag)` -- async, fire-and-forget. POSTs to `/control_room_log` with `run_id` (from `currentRunId`), `series_slug` (from `currentAuditSlug`), `tag`, and `message`. Wrapped in try/catch; failure is silent to avoid blocking UI.
- `addLogEntry(msg, tag)` -- updated: adds entry to `LOG_DATA`, calls `renderLog()`, then calls `persistLogEntry()` (non-blocking). Existing visual output is unchanged.
- `loadLog()` -- fetches the 200 most recent entries from `control_room_log` ordered by `created_at DESC`, maps them to `{ ts, msg, tag }`, replaces `LOG_DATA`, and calls `renderLog()`.
- `LOG_LIMIT = 200` -- named constant for the fetch cap.
- `init()` now calls `loadLog()` after `loadIngestionRuns()`. Both are async and non-blocking relative to the initial render.
- `handleRunAudit()` -- `currentAuditSlug = slug` moved above the first `addLogEntry` call so the "Audit started" entry carries the correct slug.
- `handleStartIngestion()` -- `currentAuditSlug = slug` similarly moved early. `currentRunId` set after `createIngestionRun`, cleared in finally. Redundant `currentAuditSlug = slug` inside try block removed.

**Behaviour:** The log now shows the last 200 entries across all sessions on load. New entries appear immediately in the UI (in-memory unshift + render), and are written to the DB asynchronously. If the write fails, the entry still shows for the current session but won't persist to the next load.

**What remains in-memory only:** Nothing. All three data surfaces -- ingestion runs, issue states, run log -- now persist in Supabase.

---

## Previous session — 2026-03-13 (Control Room ingestion run wiring)

### Control Room v0.3 -- Start ingestion wired

The "Start ingestion" button is now live: it writes a run record to the DB, shows Pending status in the table, runs the live audit, updates the run record with results, and merges persisted issue states. This makes the Control Room the entry point for the ingestion lifecycle.

**DB change:** New table `public.ingestion_runs`. Schema: `id` (uuid PK), `series_slug`, `series_name`, `season`, `sport`, `gov_body_slug`, `notes`, `include_teams`, `include_athletes`, `include_events`, `include_venues`, `synthetic_signals`, `status` (pending/running/needs-review/complete), `entity_count`, `issue_count`, `started_at`, `completed_at`, `created_at`, `updated_at`. RLS enabled (permissive for anon/authenticated). Trigger auto-maintains `updated_at`. Indexes on `series_slug` and `created_at DESC`. Reuses the `set_updated_at()` trigger function created by the issue states migration.

**UI changes in `app/control-room.html`:**

- `formatTimestamp(d)` -- helper factored out; used in `updateStatusFromAudit()` and `handleStartIngestion()`.
- `loadIngestionRuns()` -- on page load, fetches the 100 most recent runs from Supabase, deduplicates to one row per series (most recent), and merges into `SERIES_STATUS`. Called from `init()` after initial render.
- `createIngestionRun(data)` -- POSTs to `/ingestion_runs` with `Prefer: return=representation`, returns the inserted row.
- `updateIngestionRun(id, fields)` -- PATCHes a specific run row with status, entity_count, issue_count, completed_at.
- `runAuditForSeries(slug)` -- fills the form slug field and calls `handleRunAudit()`. Called from the new "Run audit" button in the status table Actions column.
- `handleStartIngestion()` -- fully rewritten. Reads all form fields (slug, series name, season, sport, gov body, notes, include flags, synthetic). Creates DB run record (pending). Shows the run in SERIES_STATUS immediately. Runs the live audit (same path as handleRunAudit). Updates the run record with results. Merges persisted issue states. Logs "ingest" entry on both create and complete.
- `updateStatusFromAudit()` -- now uses `formatTimestamp`, and uses `Object.assign` to preserve existing status fields (name, sport, run_id) when updating a row.
- Status table HTML: added `<th></th>` (empty header for Actions column). `renderStatus()` now appends a "Run audit" `<button>` cell to each row.
- `init()` now calls `loadIngestionRuns()` after initial render.

**What is still stubbed:**
- The actual entity creation SQL (teams, athletes, events, venues). Start ingestion creates the run record and runs the audit; it does not insert properties into the database. That step is still manual via Supabase SQL editor.
- Run log persistence. Log entries remain in-memory.
- `synthetic_signals` flag. Captured in the run record but no pipeline wired.

---

## Previous session — 2026-03-13 (Control Room persistence)

### Control Room — issue state persistence delivered

The Control Room triage layer now persists resolved and intentional issue states to Supabase so they survive page reloads and future audit runs.

**DB change:** New table `public.control_room_issue_states` created via migration `create_control_room_issue_states`. Schema: `id` (uuid PK), `series_slug`, `property_id` (FK to properties, cascade delete), `issue_type`, `issue_key` (flag column name), `state` (open/resolved/intentional), `note`, `created_at`, `updated_at`. UNIQUE constraint on `(series_slug, property_id, issue_key)`. RLS enabled with permissive policies for anon and authenticated. Trigger `trg_cris_updated_at` maintains `updated_at` automatically. Index on `series_slug` for the primary query pattern.

**UI changes in `app/control-room.html`:**

- `currentAuditSlug` variable tracks the active slug so all persistence calls are correctly scoped.
- `loadPersistedStates(slug)` -- fetches all rows for a series from the REST API, returns a `property_id|issue_key` lookup map.
- `persistIssueState(issue, state, note)` -- upserts to `control_room_issue_states` via POST with `Prefer: resolution=merge-duplicates`.
- `deletePersistedState(issue)` -- DELETEs the matching row for a Reopen action.
- `setIssueState()` now calls `persistIssueState()` after updating `issueStates` in memory.
- `reopenIssue(id)` -- removes from `issueStates`, re-renders, calls `deletePersistedState()`.
- `handleRunAudit()` now: sets `currentAuditSlug`, calls `loadPersistedStates()` after mapping rows, merges persisted states into `issueStates` before rendering (matching by `property_id|flag`). Flags that are no longer TRUE simply don't appear -- no stale state problem.
- `renderIssues()` refactored: splits filtered issues into `openIssues` and `suppressed`. Open issues render first; suppressed issues render below at 45% opacity with a state badge (resolved/intentional) and a Reopen button instead of the normal action buttons. Type filter applies to both groups.
- `renderIssueRow(i, state)` helper extracted from the old inline `tbody.innerHTML` map -- builds a single `<tr>` with appropriate styling and actions for open vs suppressed state.
- Log entry added when a Reopen action fires.

**Merge logic:** On audit run, persisted states are matched to live issues by `property_id + '|' + flag`. If a flag is still TRUE and the DB state is resolved or intentional, the issue is pre-suppressed from the open list. If the underlying flag is now FALSE, the issue doesn't appear at all (naturally resolved at DB level). A `N with saved states` note is added to the audit completion log entry.

---

## Previous session — 2026-03-13 (repair sweep + Phase 1 complete)

### Phase 1 features — all three implemented and active

Feature 1 — Momentum Signals + Trending. `computeMomentumScore()` added to `data.js`. Signal badges injected into card rendering in `card.js` (suppressed cards show none). Momentum Signals section 4b added to `panel.js` (conditionally rendered only when signals present). `trending` sort case and label added to `ui.js`. Trending first button added to sort menu in `explore.html`. `.signal-badge` styles added to `styles.css` using token variables only.

Feature 2 — Panel relationship sections. DB-backed Related Properties section active. All 10 relationship types supported. 20 label mappings covering all property type combinations. Replaces previous client-side heuristics in `dpRelated()`.

Feature 3 — Key Facts enrichment. `v_property_summary_current` view updated to expose `sport`, `region`, `city`. Panel Key Facts section now populated from live data. All GTWCE and British GT entities verified as showing correct values.

### GTWCE repair sweep — completed

Full audit of 33 GTWCE entities (1 series, 1 governing body, 6 teams, 8 athletes, 8 events, 6 venues, 3 additional relationships).

Image fixes applied:
- Circuit de Barcelona-Catalunya: replaced official circuit URL (hotlink-blocked) with Wikimedia Commons URL
- Circuit de Nevers Magny-Cours: replaced official circuit URL with Wikimedia Commons URL
- Autodromo Nazionale Monza: replaced official circuit URL with Wikimedia Commons URL
- Circuit Paul Ricard: replaced official circuit URL with Wikimedia Commons SkySat aerial URL
- Misano World Circuit: replaced official circuit URL with Wikimedia Commons URL
- Nurburgring: official URL retained -- no reliable Wikimedia aerial confirmed; documented as known hotlink risk

Country and region data fixes applied via direct UPDATE:
- team-wrt: country corrected to 'Belgium', region corrected to 'Europe'
- maxime-martin: country corrected to 'Belgium', region corrected to 'Europe'
- valentino-rossi: country corrected to 'Italy', region corrected to 'Europe'

SRO FanScore repair. SRO Motorsports Group had accounts (Instagram ~57k, X ~34k) but zero posts -- violating Rule 2.5, causing silent FanScore suppression. Migration `sro_synthetic_posts_and_metrics` applied: 30 HASHTEXT-seeded synthetic posts per platform covering 90 days. Full pipeline rerun. Result: SRO FanScore = 70.646, Low confidence. Expected outcome -- Low confidence is correct for a governing body with limited organic social reach.

Event fallback coverage verified. All 9 GTWCE event slugs present in `EVENT_VENUE_MAP` in `app/images.js`.

### Series Ingestion Process installed

New file `docs/SERIES_INGESTION_PROCESS.md` created (9 sections). Defines the standard workflow for all future series expansions: entity mapping, entity creation requirements, image pipeline validation, FanScore expectations, relationship verification, UI verification checklist, documentation updates, and ingestion QA checklist.

Image completion Rule 4.7 added to `docs/SPONSORAI_SYSTEM_CONTRACT.md`: 4-step image validation requirement (registry entry + URL reachable + renders correctly + no broken icon). Wikimedia Commons preference documented.

Definition of Done updated in `docs/SPONSORAI_SYSTEM_CONTRACT.md` (Section 8 Stage 2), `project-docs/AI_ENGINEERING_PLAYBOOK.md` (Section 9 Stage 2) to reflect image URL verification requirement.

### Documentation sync

All four documentation targets updated:
- `project-docs/DEVELOPMENT_LEDGER.md` -- updated with all 2026-03-13 repair sweep activity
- `docs/SYSTEM_STATE.md` -- updated with Phase 1 feature state and GTWCE scoring status
- `docs/PRODUCT_ROADMAP.md` -- updated Data Layer section; series ingestion process referenced
- `docs/WORKING_CONTEXT.md` -- this file

---

## Last Session — 2026-03-13 (card hierarchy + documentation)

### Card simplification and hierarchy

Bio removed from card body. The card no longer renders a `.card-bio` element. Reduces visual noise and tightens the card footprint for grid scanning.

Hover hero action overlay added. Bookmark, compare, and portfolio action buttons now appear as a centred overlay on the card hero image on hover. Actions are visually isolated from the card body layout and have no impact on card height.

Header restructured into two distinct zones. The `card-header` now clearly separates identity signals (name, flag, team affiliation) from classification signals (type badge, momentum signal badges). This removes ambiguity about what the badge row communicates.

### Event naming standard

Event entity names standardised to the format: `[Series] [Year] [Round Number] [Location]`. Example: `GT World Challenge Europe 2024 Round 1 Brands Hatch`. Ensures consistent rendering in panels, relationship displays, and future discovery rows.

### Momentum signals and trending sort

`computeMomentumScore()` derives up to two signal badges per card from `t30`, `engRate30d`, and `followersDelta`. Signal badges rendered on cards (suppressed cards show none). Momentum Signals panel section added. Trending sort option added to Explore sort menu.

### FanScore card hierarchy adjustment

FanScore promoted as visual anchor across the Explore grid:

- `.score-val` updated from `30px / weight 600` to `24px / weight 700`
- Trend moved inline with score value: renders as `72 ↑1.4` using existing `arr()` and `arrC()` helpers
- New CSS classes `.score-val-row` and `.score-trend-inline` added to support inline layout
- Follower chip de-emphasised: `12px / text-2 / weight 500` reduced to `11px / text-3 / weight 400`
- Signal badges confirmed visually lighter than type badge (no change required -- already differentiated)
- Card height, spacing tokens, image size, and grid layout unchanged

### GTWCE ingestion repair sweep

Full audit of 33 GTWCE entities. Five circuit venue images replaced with Wikimedia Commons URLs (hotlink-blocked official URLs removed). Country and region corrections applied to team-wrt, maxime-martin, and valentino-rossi. SRO Motorsports Group FanScore unblocked via synthetic posts migration -- result: FanScore 70.6, Low confidence, correct outcome.

### Series Ingestion Process installed

`docs/SERIES_INGESTION_PROCESS.md` created (9 sections). Standardises the workflow for all future series expansions. Image completion Rule 4.7 added to `docs/SPONSORAI_SYSTEM_CONTRACT.md`.

### Feature backlog created

`docs/PRODUCT_FEATURE_BACKLOG.md` created. Captures seven product concepts that emerged during development: Explore Discovery Rows, Series Ecosystem Influence, Ecosystem Size Panel Section, Explore Card Hierarchy, Image Reliability Policy, Synthetic Data Policy, and Relationship-Driven Discovery.

Future ideas were captured in the backlog rather than implemented. None of the backlog items are committed to the current build scope.

---

## Last Session — 2026-03-13 (Control Room v0.1 + audit duplicate detection)

### Duplicate detection added to series_ingestion_audit.sql

Three new CTE blocks added to `scripts/series_ingestion_audit.sql`:

`dup_slugs` — identifies any slug shared by more than one distinct property ID within the ecosystem. Groups on DISTINCT id+slug to prevent tier inflation from the UNION-based ecosystem traversal.

`dup_names` — identifies any display name shared by two or more distinct properties of the same type within the ecosystem. Scoped to property_type so team names and event names do not cross-contaminate.

`event_venues` + `dup_events` — joins events to their venue via the `event_at_venue` relationship, extracts the calendar year using `substring(slug from '\d{4}')`, and groups by venue_id+year. Fires when two or more events share the same venue and year. The flag is explicitly documented as "needs review" rather than "is wrong" since sprint+endurance rounds at the same circuit in the same season are structurally valid.

Three new flag columns in the entity detail output: `flag_duplicate_slug`, `flag_duplicate_name`, `flag_duplicate_event`.

Three new count columns in the summary statistics block (Part 2): `entities_duplicate_slug`, `entities_duplicate_name`, `entities_duplicate_event`.

Confirmed detectable: GTWCE Misano 2024 (gtwce-sprint-misano-2024 and gtwce-misano-2024 both map to misano-world-circuit + 2024) and GTWCE Nurburgring 2024 (gtwce-sprint-nurburgring-2024 and gtwce-nurburgring-2024 both map to nurburgring + 2024).

### Control Room page created

File: `app/control-room.html` — internal-only, not added to public navigation.

Five sections: ingestion form, ingestion status table, issues table, action modal, run log.

All seven audit flags surface in the issues table with severity coding, suggested fix text, and action buttons. Four action types implemented: Add Image URL, Retry Validation, Review Duplicate, Mark Suppressed. All actions are stubs with modal dialogs that explain the manual equivalent step in the Supabase SQL editor or images.js.

The issues table supports client-side filtering by issue type (Image / FanScore / Duplicate / Relationship). Suppressed issues are removed from the visible table and a repair entry is added to the run log.

Data source at v0.1 is mock rows derived from the known GTWCE audit state (8 issues: 4 duplicate events, 2 missing images, 2 hotlink risks). Mock data is defined in the JS DATA block at the top of the script section.

Design tokens used throughout: semantic tokens only (`--text-1`, `--text-2`, `--text-3`, `--accent`, `--surface`, `--border`, `--spacing-*`). No hard-coded hex values outside the token file. Dark mode support inherited from `styles.css` `[data-theme="dark"]` overrides.

Documentation updated: `docs/PRODUCT_ROADMAP.md` (new Section 5 for Control Room), `docs/WORKING_CONTEXT.md` (this entry), `project-docs/DEVELOPMENT_LEDGER.md` (Control Room added to active surfaces and stub status table).

### Pending: team card driver removal

The change from the previous session (removing driver names from team cards in `app/components/card.js`) was completed at the start of this session. The affiliation ternary was simplified to remove the `c.type==='team'` branch.

---

## Queued — next session

Phase 1 is complete. Phase 2 begins next.

### 1. Keyword search (Phase 2)

A visible search input field that filters `allCards` by name or type client-side without requiring the AI chat panel. No schema change required -- filter is client-side only against the existing `allCards` dataset.

### 2. Emerging drivers / breakout discovery surface (Phase 2)

Surface athletes showing strongest follower growth relative to their tier. Derive from existing `followersDelta` and `t30` signals in the loaded card data. No schema change required.

### 3. Sparkline rendering

Data is already fetched into `c.sparks`. Implement SVG sparkline rendering using the existing `renderSpark()` function in `data.js`. Add to card body or panel.

### Remaining known image gaps (intentional placeholders)

- `timur-boguslavskiy`: portrait photo ID not confirmable from GTWCE portal -- falls through to placeholder icon
- `marco-varrone`: no driver page found under this name on GTWCE portal; entity may need name reconciliation with Nico/Nicolas Varrone -- falls through to placeholder icon
- `nurburgring`: official circuit URL retained but subject to hotlink blocking; replace with confirmed Wikimedia aerial when identified

---

## Entity Expansion Definition of Done

No entity expansion is complete until all five stages are done: (1) structural creation with slug and relationships, (2) presentation data -- bio, country, country_code, sport, region, city, and image entry in images.js verified as reachable and rendering correctly (registry presence alone is not sufficient), (3) score data -- accounts, follower history, posts, metrics, rollups, FanScore windows for scoreable entities, (4) UI verification -- cards and panels render cleanly with no unintended placeholders, (5) exceptions reported in DEVELOPMENT_LEDGER.md.

Authoritative rule: docs/SPONSORAI_SYSTEM_CONTRACT.md Section 8. Full process: docs/SERIES_INGESTION_PROCESS.md.

---

## Key invariants

- Never hardcode hex values. Use CSS custom properties only.
- Never merge FanScore and FitScore into a composite signal.
- FanScore is descriptive, not predictive. No forward-looking language in the UI.
- Confidence is always secondary and clearly labelled.
- Calm, analytical tone. No gamification language.
- All new database migrations must include posts for every platform account created, or completeness will fall below 60% and suppress FanScore.
- Image entries in `images.js` must use the typed format `{ src, kind, fit, pos, pad?, bg? }`. Plain string entries are legacy and should not be added.
- Image URL must be verified reachable and rendering in the UI -- registry presence alone is not completion.
- For venue images: use Wikimedia Commons (upload.wikimedia.org). Official circuit sites block external embedding. Compute thumbnail URL with MD5 formula documented in `docs/SERIES_INGESTION_PROCESS.md` Section 4.

---

## Known fragile points

The second Supabase fetch passes all property UUIDs as a URL parameter (~7,500 characters at 200 properties). This is fragile at scale and should be moved to a POST or filtered differently.

Nurburgring image uses official circuit URL (nuerburgring.de) which is subject to hotlink blocking. Should be replaced with a confirmed Wikimedia Commons aerial when one is identified.

Investor portal auth is trivially bypassable. Do not share the portal URL publicly.
