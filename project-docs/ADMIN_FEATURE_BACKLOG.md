# ADMIN_FEATURE_BACKLOG.md

SponsorAI — Internal Admin and Control Layer Feature Backlog

Last updated: 2026-03-18 (extended with Tier 1.5, 2.5, 3.5, Tier 4 additions, and Global layer)

---

## Purpose

This file is the canonical reference for planned admin and internal tooling features in SponsorAI.

It exists so that admin capabilities are built deliberately and consistently, not reactively in one-off sessions. Each tier represents a coherent stage of maturity. Tier 1 is the immediate working surface. Tier 4 is the long-term operational intelligence layer. Half-tiers (1.5, 2.5, 3.5) address legibility and debugging concerns that sit between the main tiers and should be built in parallel with the tier above them.

This backlog is a planning reference, not a sprint board. It does not track dates or assignees. Update it when scope changes, features ship, or priorities shift.

For the active development state, see `DEVELOPMENT_LEDGER.md`.
For engineering working modes and prompt patterns, see `AI_ENGINEERING_PLAYBOOK.md`.

---

## Admin layer principles

Before building any feature in this backlog:

- Human-in-the-loop by default. No blind automation.
- Wrong data is worse than missing data. Confidence must be surfaced, not hidden.
- Provenance must be preserved. Never silently overwrite source or history.
- Changes must be reversible. Soft state changes preferred over hard deletes.
- Admin tools serve the data, not the other way round. Calm, structured, no gamification.
- Visibility over opacity. The system must be able to explain where data comes from, why a score exists or does not, what is broken, and what needs fixing.
- Explanation over assumption. Suppression, fallbacks, and gaps must be labelled, not silently applied.
- Control over automation. Manual triggers are preferred over background processes that are hard to observe or stop.
- Provenance over convenience. Source, timestamp, and confidence must travel with every data write.

---

## Tier 1 — Working surface (build now)

These features form the MVP admin layer. They address immediate operational needs and replace ad-hoc scripts.

---

### 1.1 Entity Source Manager

**Status:** MVP built (2026-03-18) — `app/admin-source-manager.html`

**Purpose:**
Visual management of entity images and source matching per team. Replaces one-off SQL and Python scripts used to source player headshots.

**MVP scope (shipped):**
- Team selector (loads from `properties` table)
- Roster table: name, slug, current image thumbnail, image status, source type, confidence
- Summary strip: total entities / confirmed / placeholders / needs review
- Candidate source panel with three modes: Official API, Site CSV, URL list
- Red Bull CMS API integration: auto-fills endpoint for known teams; CORS-aware with paste-JSON fallback
- Approval queue: side-by-side current vs candidate images, per-item approve/reject, bulk high/low-confidence actions
- DB write: INSERT to `entity_images` with provenance fields; ON CONFLICT DO NOTHING; no overwrites; no deletes
- Roster fallback: infers players from `entity_images.note` when `property_relationships` is not populated

**Known gaps (post-MVP):**
- No sport filter on team selector (all teams listed, not filtered by sport)
- Roster fallback relies on note-prefix pattern; fragile for teams with inconsistent note formats
- No image rotation support (portrait only)
- No batch import from spreadsheet file (paste-only in MVP)
- No audit log of what was written in this session

**Next iteration priorities:**
- Sport/league filter on team selector
- Show all entity types (team, series, venue) not just athletes
- Session write log: list of what was committed with timestamp
- Direct link to entity profile from roster row
- Surface entity debug panel (Tier 1.5.1) per roster row on expand

---

### 1.2 Coverage Monitor upgrade

**Status:** Active at `app/coverage-monitor.html` — needs scope extension

**Purpose:**
The existing Coverage Monitor tracks FanScore coverage and ingestion health. It should be extended to cover image coverage and social account coverage as first-class dimensions alongside FanScore.

**Current state:**
- Shows FanScore coverage per entity
- Flags suppressed and low-confidence properties
- No image coverage column
- No social account coverage column

**Planned upgrades:**
- Add image coverage column to entity table: confirmed / placeholder / source type
- Add social account coverage column: platform count, active/inactive flag
- Summary strip: image coverage % alongside FanScore coverage %
- Filter: show only entities with placeholder images (actionable shortlist)
- Filter: show only entities with no social accounts linked
- Cross-link to Entity Source Manager for one-click remediation
- Surface ingestion health indicator (Tier 1.5.3) inline per entity row

**Design note:** keep compact density; do not expand to full-page modal; extend the existing table.

---

### 1.3 Image provenance visibility

**Status:** Not started

**Purpose:**
Provide a read-only view of the full `entity_images` history for any entity. Currently, provenance is only visible via direct Supabase query. This should be surfaced in the UI without requiring SQL access.

**Scope:**
- Accessible from: Coverage Monitor entity row (expand action), Entity Source Manager roster row
- Shows: all `entity_images` rows for the entity, ordered by `created_at desc`
- Columns: image thumbnail, source type, status, confidence, note, inserted date
- Current winning image is marked (the most recent verified row)
- No write actions in this view (read-only)
- Useful for auditing identity risks (wrong image, stale kit, cross-team duplicate)

**Design note:** implement as an inline expand row or a lightweight slide-over panel; do not build a separate page.

---

## Tier 1.5 — Entity debug and explanation layer (build alongside Tier 1)

These features address legibility. They do not add new data operations but make the existing system explainable without requiring direct database access. They should be woven into existing admin surfaces rather than built as standalone pages.

---

### 1.5.1 Entity debug panel

**Status:** Not started

**Purpose:**
Provide a complete, fast explanation of any entity's current state. The goal is to answer the question "what is going on with this entity?" in under 10 seconds, without leaving the admin UI.

**Display (per entity):**
- FanScore value + confidence band + computation status (live / suppressed / fallback)
- Suppression reason (using standardised buckets from 1.5.2)
- Platform accounts linked: X, Instagram, YouTube, TikTok -- active/inactive per platform
- Snapshot counts per platform (last 30 days)
- Rollup counts (last 30 days)
- Last ingestion timestamp
- Image: current winning image, source type, resolver path (DB / images.js / placeholder)
- Flags and known errors

**Access:** expand row in Coverage Monitor; expand row in Entity Source Manager; future entity profile page (admin view).

**Design note:** read-only in MVP. Write actions (re-run ingestion, update image) should link out to the relevant tool, not be embedded in the debug panel.

---

### 1.5.2 Standardised suppression and gap reasons

**Status:** Not started

**Purpose:**
Define a fixed set of human-readable reason labels for why a FanScore does not exist or why an entity has a data gap. These labels must be used consistently across Coverage Monitor, Entity Source Manager, the entity debug panel, and any future admin surfaces.

**Reason buckets:**

| Code | Label | Meaning |
|---|---|---|
| `no_social_data` | No social data found | No platform accounts linked to this entity |
| `social_not_ingesting` | Social linked, not ingesting | Account exists but no recent snapshot data |
| `below_threshold` | Below scoring threshold | Ingestion present but data volume too low |
| `platform_unsupported` | Platform not yet supported | Only platforms not in the current pipeline |
| `pipeline_error` | Data pipeline issue | Ingestion error logged; data may be incomplete |
| `intentional` | Suppressed intentionally | Marked as known gap; not an error |

**Implementation:** these labels should be stored as constants in a shared JS module or documented in this file and enforced by code review. Do not allow free-text suppression reasons in the UI.

---

### 1.5.3 Ingestion health indicator

**Status:** Not started

**Purpose:**
A compact visual signal (badge or dot) per entity showing whether ingestion is healthy, stale, or broken. Surfaced inline in Coverage Monitor and Entity Source Manager roster rows.

**States:**

| State | Definition | Display |
|---|---|---|
| Healthy | Ingestion data within the last 7 days | Green dot / "Healthy" |
| Stale | No ingestion data in 8--30 days | Amber dot / "Stale" |
| Inactive | No ingestion data in 30+ days | Grey dot / "Inactive" |
| Broken | Ingestion error logged; or data present but rollups missing | Red dot / "Broken" |
| No data | No ingestion ever recorded | Grey dash / "No data" |

**Data source:** `property_platform_daily_metrics` (most recent `snapshot_date` per entity) and `control_room_log` (error entries).

**Design note:** the indicator is diagnostic only. It does not affect FanScore computation or suppression. Hovering should show the last ingestion date and the specific platform(s) affected.

---

## Tier 2 — Operational health (next build phase)

These features address gaps in operational visibility. They require Tier 1 to be stable first.

---

### 2.1 FanScore and ingestion visibility

**Purpose:**
A unified view of ingestion run health, FanScore computation status, and data freshness per entity. Currently scattered across Control Room and Coverage Monitor.

**Scope:**
- Per-entity: last ingestion date, data points in window, FanScore computed / suppressed / fallback
- Suppression reason display using standardised buckets (1.5.2)
- Ingestion run linkback: which run produced the current score
- Freshness indicator: last post date, days since last data point
- Alert: entities with stale data (no posts in 30+ days) highlighted

**Relationship to existing pages:** this may replace the entity section of Coverage Monitor or become a tab within it.

---

### 2.2 Platform state standardisation

**Purpose:**
Social platform account records are inconsistent across entities. Some have account IDs but no handles; some have handles but incorrect platform slugs; some have duplicate accounts. This feature provides tooling to detect and resolve these inconsistencies.

**Scope:**
- Per-entity: list all linked platform accounts with account_id, handle, platform, active flag
- Flag: accounts with missing handle or missing account_id
- Flag: duplicate accounts for the same platform
- Flag: accounts marked active but no recent data in `property_platform_daily_metrics`
- Bulk edit: set active/inactive, correct handle, merge duplicates (with confirmation)
- Write: UPDATE `property_social_accounts` only; preserve history via `updated_at`

**Risk:** platform account changes affect ingestion downstream. Require confirmation step before any write.

---

### 2.3 Broken state detection

**Purpose:**
A scheduled or on-demand scan that identifies entities in a broken or inconsistent state and surfaces them as a prioritised list for human review.

**Broken state indicators:**
- Verified image URL returns non-200 (broken CDN link)
- FanScore computed but no social account linked
- Social account linked but no ingestion data in 60+ days
- Property marked visible but suppressed (logic conflict)
- `entity_images` row with `verified=true` but `status != 'confirmed'` (flag inconsistency)
- Duplicate slug across `properties` table

**Scope:**
- Run on demand from admin surface
- Output: table of broken entities with indicator type and suggested fix
- No auto-fix; each item must be manually actioned or marked as known/intentional

---

## Tier 2.5 — Pipeline visibility (build alongside Tier 2)

These features make the data pipeline observable without requiring access to logs or the database. They complement the operational health features in Tier 2 by showing system activity in a human-readable form.

---

### 2.5.1 Pipeline activity feed

**Status:** Not started

**Purpose:**
A lightweight, chronological stream of recent system events that makes it clear what the data pipeline has been doing. Currently this information exists only in `control_room_log` and is not surfaced in any admin UI.

**Example entries:**
- "47 snapshots updated for Newcastle Red Bulls — X, Instagram"
- "FanScore recomputed for 12 entities — Premiership Rugby"
- "Instagram ingestion skipped: no active accounts (5 entities)"
- "Image source updated: george-mcguigan — redbull_api"
- "Broken image detected: example-player — CDN returned 404"

**Scope:**
- Last 50 events, reverse chronological
- Filterable by: event type (ingestion / score / image / error), entity, series/team
- Each entry links to the affected entity or ingestion run
- Read-only; no actions from the feed itself

**Data source:** `control_room_log` extended with image write events (when change log, Tier 4.2, is built). Until then, surface ingestion and score events only.

**Design note:** this is a diagnostic feed, not a notification system. It should feel like a quiet audit trail, not an alert centre.

---

### 2.5.2 Manual re-run controls

**Status:** Not started

**Purpose:**
Allow internal users to trigger data pipeline operations for a specific entity or group without requiring direct database access or a script.

**Planned controls:**
- Re-run ingestion: fetch fresh social data for a given entity or team
- Recompute FanScore: recalculate score windows for a given entity or series
- Refresh image resolution: re-evaluate the resolver for a given entity (picks up new entity_images rows without a full page reload)

**Rules:**
- Manual trigger only; no scheduling from this UI
- Each action requires a confirmation step
- Result (success / error / no-op) is displayed inline; written to control_room_log
- No chaining: one operation at a time per entity

**Risk:** re-running ingestion for large groups can be expensive. Scope controls to single entity or small group (max 25) in MVP. Full-team re-run requires a separate confirmation with entity count displayed.

---

### 2.5.3 Data freshness layer

**Status:** Not started

**Purpose:**
Surface the age of the underlying data for any entity -- snapshot recency, rollup recency, and score recency -- so that admin users can assess whether what they are looking at is current or stale before making decisions.

**Display (per entity):**
- Last snapshot date (most recent row in `property_platform_daily_metrics`)
- Last rollup date (most recent aggregation in `property_scores_rollup` or equivalent)
- Last score update (most recent `fanscore_windows` recalculation)
- Freshness indicator: colour-coded by age (see Tier 1.5.3 health states)

**Scope:**
- Surfaced as additional columns in Coverage Monitor (collapsed by default, expandable)
- Surfaced in entity debug panel (Tier 1.5.1) as a dedicated section
- Not a standalone page

**Design note:** dates should be displayed as both absolute (2026-03-10) and relative (8 days ago) to reduce cognitive load. Relative display is the default; absolute on hover.

---

## Tier 3 — Efficiency and scale (future build)

These features reduce the time cost of repetitive data work. They are not needed until Tier 1 and 2 are stable.

---

### 3.1 Bulk fix tools

**Purpose:**
Admin operations that currently require one-off SQL or Python scripts should be expressible through a structured UI workflow.

**Planned operations:**
- Bulk image status update: mark a set of entity_images rows as rejected (for cleanup)
- Bulk source type reclassification: update source_type on a filtered set of rows
- Bulk note update: standardise note prefix format across a team's image rows
- Bulk social account deactivation: mark inactive for a list of account IDs
- All operations: preview affected rows before commit; no auto-apply; write log on confirm

**Design constraint:** these are power-user tools. Expose under a separate "Bulk operations" section, not inline with other admin surfaces.

---

### 3.2 Candidate matching engine

**Purpose:**
Automate the candidate discovery step of the image sourcing workflow currently handled manually in the Entity Source Manager.

**Scope:**
- Given a team, run a configured source pipeline (API fetch, site scrape, spreadsheet parse)
- Apply slug-matching and fuzzy name-matching to find candidates
- Score each match with a confidence value
- Surface results in the existing Entity Source Manager approval queue
- No changes to the approval and write workflow (human-in-the-loop is preserved)

**Dependencies:** requires stable source type taxonomy (source_type check constraint), consistent slug conventions, and at least one confirmed pipeline per team (Red Bull CMS API is the reference implementation).

**Confidence model (reference):**

| Match type | Base confidence |
|---|---|
| Exact slug match + official API | 0.95 |
| Exact slug match + site scrape | 0.80 |
| Name match + slug partial | 0.65 |
| Name-only fuzzy match | 0.45 |

Matches below 0.50 are not surfaced without explicit opt-in.

---

### 3.3 Admin notes and flags

**Purpose:**
Allow internal users to attach free-text notes and structured flags to any entity, without writing to the entity's core data fields.

**Scope:**
- Note: free text, timestamped, author (if auth is present)
- Flags: `needs_review`, `data_gap`, `identity_risk`, `suppress_until_resolved`
- Flags are advisory only; they do not affect suppression logic unless explicitly coded
- Visible in Coverage Monitor entity row and Entity Source Manager roster row
- Notes stored in a new `admin_notes` table (or extended `control_room_log` with note_type)

**Design note:** this feature is lower priority than Tier 1 and 2 but high value for teams doing data QA across many entities over multiple sessions.

---

## Tier 3.5 — Data quality and linking (build alongside Tier 3)

These features improve the structural integrity of the dataset. They address problems that compound over time if left unresolved: incorrect social account mappings, duplicate entities, and no clear queue for what needs fixing.

---

### 3.5.1 Entity linking manager

**Status:** Not started

**Purpose:**
Allow internal users to manually link, unlink, and correct social account associations for any entity. Currently, account linking is done via the ingestion pipeline and cannot be easily corrected from the UI.

**Scope:**
- Per-entity: view all linked social accounts (handle, platform, account_id, active flag, source)
- Actions: link a new account (enter handle + platform), unlink an existing account, mark an account as official primary
- Prevent duplicate links: warn if handle is already linked to a different entity
- All writes go to `property_social_accounts`; soft-delink preferred over hard delete
- Confirmation required before any write

**Risk:** incorrect account links cause wrong data to feed into FanScore. This is a high-impact tool. Require explicit confirmation with entity name and account handle displayed before writing.

---

### 3.5.2 Duplicate detection

**Status:** Not started

**Purpose:**
Identify entities or social accounts that may be duplicated in the system, creating silent data quality issues downstream.

**Detection cases:**
- Duplicate social handles: the same handle linked to two different properties
- Duplicate property slugs: two properties with the same slug (should be caught by DB constraint but surface any violations)
- Similar entity names: properties with near-identical names that may be the same entity
- Conflicting image mappings: two entity_images rows for the same property_id with the same URL but different source_type or status

**Scope:**
- Run on demand; not a live background process
- Output: categorised list of potential duplicates with confidence that they are actual duplicates
- Actions: mark as confirmed duplicate (flag one for review), mark as distinct (suppress future detection)
- No automatic merges; all resolution is manual

---

### 3.5.3 Needs attention queue

**Status:** Not started

**Purpose:**
A single, auto-generated list of entities that require human attention, prioritised by impact. This replaces ad-hoc filtering across Coverage Monitor, Control Room, and manual SQL queries.

**Queue entry triggers:**
- Missing confirmed image (placeholder showing in UI)
- No FanScore (suppressed or no data)
- Stale ingestion (no data in 30+ days)
- Low confidence score (below medium band)
- Active broken state flag (from Tier 2.3)
- Admin flag set to `needs_review`

**Scope:**
- Displayed as a prioritised table with one row per entity, one or more trigger badges per row
- Priority order: broken state > missing image > no score > stale > low confidence > admin flag
- Actions: link directly to the relevant tool for each trigger type (Source Manager for image, platform manager for social, etc.)
- Dismissable per item: mark as known/intentional to remove from queue

**Design note:** this queue is the daily operational view. It should be the first thing an admin user opens when checking system health. Consider making it the default view on an admin home page if one is built.

---

## Tier 4 — Intelligence layer (long-term)

These features represent the mature operational intelligence layer. They depend on stable Tier 1--3 infrastructure.

---

### 4.1 Source health dashboard

**Purpose:**
A system-level view of all image and data sources used across SponsorAI, with health indicators for each.

**Scope:**
- Per source: total entities using it, last successful fetch, failure rate, CDN response time sample
- Source types covered: official API feeds, Wikimedia, manual CDN links, local assets
- Alert: sources with >5% broken URLs in the last 7 days
- Drill-down: list of entities affected by a given broken source
- No auto-remediation; links to Entity Source Manager for fix workflow

**Data dependency:** requires broken state detection (Tier 2.3) to be running as a scheduled job.

---

### 4.2 Change log

**Purpose:**
A unified, queryable audit trail of all admin writes across SponsorAI internal tooling.

**Current state:** `control_room_log` captures ingestion run events. There is no equivalent for entity_images writes, social account changes, or admin note additions.

**Scope:**
- Log every admin write: table, row affected, field changed, old value, new value, source (UI page + user if available), timestamp
- Queryable by: entity slug, table, action type, date range
- Read-only; log entries are immutable
- Retained indefinitely (no TTL in MVP)
- Surfaced as a tab within the admin shell, not a standalone page

**Implementation note:** implement as an `admin_change_log` table with a trigger or explicit log write on each admin operation. Do not rely on Postgres-level CDC in the short term.

---

### 4.3 Suggestion system (human-in-the-loop)

**Purpose:**
A lightweight pipeline that generates data improvement suggestions (missing images, stale sources, unlinked social accounts) and queues them for human review.

**Scope:**
- Suggestions generated by: broken state detector, coverage gap analysis, source freshness check
- Each suggestion: entity, suggestion type, proposed action, confidence, evidence
- Human actions: approve (executes the suggested write), reject (marks as known/intentional), defer
- Approved suggestions are executed and written to the change log
- Rejected suggestions are hidden but preserved (for pattern analysis)
- No suggestion executes without human approval

**Design constraint:** this is not a recommendation engine and should not feel like one. Suggestions are operational prompts, not scored rankings. Avoid gamified language (e.g. "score", "level", "achievement").

**Relationship to other features:** this system is the synthesis of Tier 1--3. It assumes the candidate matching engine, broken state detection, and change log are all operational.

---

### 4.4 Source comparison view

**Status:** Not started

**Purpose:**
Allow side-by-side comparison of the current data state for an entity against alternative candidates or historical versions, before making a change. Extends the approval queue pattern from Entity Source Manager to other data types.

**Scope (images):**
- Current winning image vs all historical entity_images rows for that entity
- Current winning image vs new candidate from any source
- Side-by-side display with source type, confidence, and date

**Scope (social accounts):**
- Current linked account vs alternative candidate (different handle, different platform)
- Useful when ingestion finds a more active account than the currently linked one

**Design note:** this view should be embedded in the entity debug panel (Tier 1.5.1) as an optional expand, not a separate page. The goal is to reduce the effort of pre-change verification, not add a new workflow.

---

### 4.5 Internal confidence layer

**Status:** Not started

**Purpose:**
A structured, visible confidence level for every major data attribute of an entity -- not just FanScore confidence -- so that internal users understand which parts of the dataset are reliable and which are weak.

**Confidence dimensions:**

| Dimension | High | Medium | Low |
|---|---|---|---|
| Image | redbull_api, source verified | manual site scrape | Excel import, no slug match |
| Social account | official + active ingestion | linked but stale | linked but never ingested |
| FanScore | high confidence band | medium | low or suppressed |
| Bio | populated, recent | populated, old | missing |
| Relationships | fully mapped | partial | none |

**Display:** a compact confidence summary per entity in the debug panel (1.5.1) and optionally in the Coverage Monitor as filterable columns.

**Design note:** this is an internal diagnostic lens, not a public-facing signal. It must never be labelled or presented as a quality score. It is a data completeness indicator for operational use only.

---

### 4.6 Bulk import and mapping tool

**Status:** Not started

**Purpose:**
Support structured ingestion of large batches of entity data (images, social accounts, property metadata) from CSV uploads and known API feeds, with a consistent preview-and-approve workflow.

**Scope:**
- Input formats: CSV upload, pasted CSV/TSV, known API endpoint (auto-fetch)
- Auto-mapping: attempt to match imported rows to existing properties by slug, then by name
- Preview: show matched / unmatched / ambiguous rows before any write
- Column mapping UI: if CSV columns do not match expected schema, allow user to assign them
- Approve and write: same pattern as Entity Source Manager (INSERT, no overwrite, no delete)
- Unmatch handling: rows with no property match are flagged, not silently dropped

**Relationship to existing tools:** this generalises the Entity Source Manager's source panel from images to any structured data type. The approval queue and DB write patterns are shared.

---

## Global admin feature

---

### System state strip

**Status:** Not started

**Purpose:**
A persistent, compact banner at the top of all admin pages that communicates the current operational scope and known limitations of SponsorAI. This is the first thing an admin user should see when opening any admin surface, and it should make the system's current state immediately clear without requiring investigation.

**Display:**
- FanScore model version in use (e.g. "Model v1.0")
- Data snapshot recency (e.g. "Last ingestion: 2 hours ago")
- Active platforms (e.g. "X active / Instagram partial / YouTube inactive / TikTok not supported")
- Known limitations as a dismissable list (e.g. "Instagram not ingesting — account linking issue", "TikTok: partial coverage only")

**Scope:**
- Injected into the admin shell (ui-helpers.js) so it appears on all admin pages without per-page implementation
- Limitations list is manually maintained (not auto-generated in MVP); stored as a config object in ui-helpers.js or a separate admin-config.js
- Individual limitations can be dismissed per session (localStorage); they re-appear on next session unless cleared

**Design note:** this strip should feel like a status bar, not an alert. Use muted, neutral styling. It is informational, not urgent. Do not use red or strong accent colour unless a genuine system-breaking issue is present.

---

## Current admin page and feature inventory

| Feature | File / Location | Status | Tier |
|---|---|---|---|
| Control Room | `app/control-room.html` | Active | -- |
| Coverage Monitor | `app/coverage-monitor.html` | Active | -- |
| Entity Source Manager | `app/admin-source-manager.html` | MVP shipped 2026-03-18 | 1.1 |
| Coverage Monitor (image + social upgrade) | `app/coverage-monitor.html` | Not started | 1.2 |
| Image provenance view | Inline panel | Not started | 1.3 |
| Entity debug panel | Inline expand / panel | Not started | 1.5.1 |
| Standardised suppression reasons | Shared constants | Not started | 1.5.2 |
| Ingestion health indicator | Inline badge | Not started | 1.5.3 |
| FanScore / ingestion visibility | TBD | Not started | 2.1 |
| Platform state manager | TBD | Not started | 2.2 |
| Broken state detector | TBD | Not started | 2.3 |
| Pipeline activity feed | TBD | Not started | 2.5.1 |
| Manual re-run controls | TBD | Not started | 2.5.2 |
| Data freshness layer | Inline columns | Not started | 2.5.3 |
| Bulk fix tools | TBD | Not started | 3.1 |
| Candidate matching engine | TBD | Not started | 3.2 |
| Admin notes and flags | TBD | Not started | 3.3 |
| Entity linking manager | TBD | Not started | 3.5.1 |
| Duplicate detection | TBD | Not started | 3.5.2 |
| Needs attention queue | TBD | Not started | 3.5.3 |
| Source health dashboard | TBD | Not started | 4.1 |
| Change log | TBD | Not started | 4.2 |
| Suggestion system | TBD | Not started | 4.3 |
| Source comparison view | Inline panel | Not started | 4.4 |
| Internal confidence layer | Inline columns / panel | Not started | 4.5 |
| Bulk import and mapping tool | TBD | Not started | 4.6 |
| System state strip | `app/ui-helpers.js` | Not started | Global |

---

## Dev menu entries (as of 2026-03-18)

All admin pages must be registered in the Dev menu in `app/ui-helpers.js` immediately when built.

| Label | Target |
|---|---|
| Account | `account.html` |
| Properties | `explore.html` |
| Property (example) | `property.html` |
| Introductions test | `property.html?slug=test` |
| Admin (future) | `admin.html` |
| Entity Source Manager | `admin-source-manager.html` |

See CLAUDE.md for Dev menu rules.
