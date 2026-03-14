# WORKING_CONTEXT.md

SponsorAI — Working Context

Last updated: 2026-03-14 (Property page — ecosystem relationship explanation layer)

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

## Last Session — 2026-03-14 (Property page — ecosystem relationship explanation layer)

### Task — Ecosystem relationship explanation (Parts 1-7)

**Mode: Build + Architecture**

Replaced the flat Ecosystem card grid on the property page with a grouped, contextually annotated layout. The section now explains what each relationship means and adds a lightweight influence summary bar.

**Files changed:**
- `app/property.html` — all changes inline

**What changed:**

| Area | Before | After |
|---|---|---|
| HTML | Single `#ecosystem-grid` flat grid | `#ecosystem-summary` bar + `#ecosystem-body` grouped layout |
| Relationship grouping | None — all cards in one grid | Grouped by relationship type using `REL_LABELS_PROP` |
| Contextual explanation | None | `.eco-group-desc` sentence per group (e.g. "Teams that participate in this series.") |
| Influence summary bar | None | Count + combined reach + strongest entity by FanScore + rising count |
| Card trend indicator | None | Subtle `arr()` arrow if `\|t30\| > 0.1` (colored, tiny) |
| API fetch fields | `property_id, property_name, property_type, avg_score_30d, slug, suppression_reason_30d` | Added: `total_followers_latest, trend_value_30d` |

**New constants:**
- `REL_LABELS_PROP` — maps `rel_type:dir` to a human label (20 entries, mirrors `panel.js` `REL_LABELS`)
- `REL_CONTEXT_PROP` — maps group label to a one-sentence contextual description (16 entries)
- `ECO_MAX_PER_GROUP = 12` — max cards shown per group before overflow notice

**Influence summary bar logic:**
- Always shows: total connected entity count
- Shows combined reach (sum of `total_followers_latest`) if any entity has follower data
- Shows "Strongest: [Name] (score)" using the highest non-suppressed `avg_score_30d`
- Shows rising count (entities where `trend_value_30d > 0.1`)
- All computed client-side from already-fetched data

**Sparse/empty handling:**
- If API returns no rows: renderEcosystem returns silently, section stays hidden
- If groupOrder is empty after matching: returns silently, section stays hidden
- If combined followers = 0 and no follower data: reach line omitted from summary
- If all entities suppressed: no "Strongest" shown in summary
- If no rising entities: rising count line omitted
- Overflow beyond ECO_MAX_PER_GROUP shows "N more not shown" note in grid

**What was NOT changed:**
- Individual card design (`.prop-eco-card`) preserved
- Navigation on click (navigateTo) unchanged
- `loadRelationships()` in data.js unchanged
- No new network calls introduced (just additional fields in existing apiFetch)
- FitScore, brand-match, and scoring not touched

**Limitations remaining:**
- `REL_LABELS_PROP` duplicates `REL_LABELS` in panel.js; both should eventually be moved to data.js
- Combined reach is a raw sum; does not de-duplicate shared audiences
- Trend indicator uses `t30` slope which can be noisy for short-window entities

---

## Previous Session — 2026-03-14 (Control Room — archive/delete run feature)

### Task — Control Room series removal (Parts 1-7)

**Mode: Build**

Added safe archive and permanent delete to the Control Room ingestion run row menu. Operators can now remove a run from the active list without losing data (archive), or permanently destroy the run and its history (delete).

**Schema migration applied:**
```sql
ALTER TABLE ingestion_runs ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE ingestion_runs ADD COLUMN archived_at timestamptz;
```
Migration name: `add_archived_flag_to_ingestion_runs` on project `kyjpxxyaebxvpprugmof`.

**Files changed:**
- `app/control-room.html` — all changes inline

**What was added:**

| Change | Detail |
|---|---|
| `.cr-menu-danger` CSS | Red text/hover for destructive row menu items. Light + dark theme variants. |
| `.cr-btn-danger` CSS | Solid red confirm button. Used by both archive and delete modals. |
| Row menu: Archive run | Opens confirmation modal. Soft-delete only. Data preserved. |
| Row menu: Delete permanently | Opens confirmation modal with entity count warning if `entities > 0`. |
| `confirmArchiveRun(slug)` | Builds archive confirmation modal using `#action-modal`. Hides stub notice. Sets `.cr-btn-danger` on confirm. |
| `archiveRun(slug)` | PATCH `ingestion_runs` (`archived=true, archived_at=now()`). PATCH `properties` (`visible_in_ui=false`). Removes from `SERIES_STATUS`, re-renders. |
| `confirmDeleteRun(slug)` | Builds delete confirmation modal. Shows entity-count warning block if `entities > 0`. Suggests archive alternative. |
| `deleteRun(slug)` | Cascade: DELETE `ingestion_run_checklist`, DELETE `control_room_log`, DELETE `ingestion_runs`. Removes from `SERIES_STATUS`, re-renders. |
| `loadIngestionRuns()` | Added `&archived=eq.false` filter so archived runs do not reappear on page load. |
| `closeModal()` | Resets `.cr-btn-danger` back to `.cr-btn-primary` and restores stub notice visibility after modal closes. |

**What is NOT deleted by `deleteRun`:**
- `control_room_issue_states` — slug-keyed; preserves intentional/resolved decisions
- `series_visibility` — slug-keyed; preserves operator readiness decisions
- `properties` and all entity data — never touched by delete

**Behaviour summary:**
- Archive: reversible. Run hidden from UI. Series hidden from public app. Data intact in DB.
- Delete: permanent. Only allowed after explicit confirmation. Entity-count warning shown if `entities > 0`. Cascade removes run + checklist + logs only.
- Neither action is available if `run_id` is null (series has no persisted run record). Archive run button still renders (for user guidance); Delete button is suppressed when `run_id` is null.

**Next steps:**
- Consider adding an "Archived" tab or "Show archived" toggle to the Control Room to allow recovery of archived runs
- Athletes remain hidden until portrait images are sourced
- Venues remain hidden (no images, no explicit scope)

---

## Previous Session — 2026-03-14 (Premiership Rugby go-live + ingestion run cleanup)

### Task 1 — Premiership Rugby controlled go-live

**Mode: Audit + Build**

Full image health audit confirmed. Entity-level visibility enabled for the safe subset of the rugby ecosystem. Athletes intentionally kept hidden pending portrait sourcing.

**Image health at go-live:**

| Type | Count | Image status |
|---|---|---|
| Teams | 10 | All confirmed (9 scan, 1 manual — Newcastle Falcons) |
| Series | 1 | Confirmed (manual — cortextech CDN logo) |
| Governing body | 1 | Confirmed (manual — same logo as series) |
| Event | 1 | No entity_image; EVENT_VENUE_MAP fallback via allianz-stadium-twickenham |
| Athletes | 11 | None — intentionally hidden, portraits not yet sourced |
| Venues | 11 | None — not in go-live scope |

**FanScore status at go-live:**
- 10 teams: live scores, confidence High (9) or Medium (1 — Bath). Range 80.97–85.76. Note: scores are synthetic signals generated 2025-12-14 to 2026-03-13.
- Series: live score 82.5, High confidence. Synthetic.
- Governing body: suppressed ("Insufficient data") — renders `--` in UI. Acceptable.
- Event: no score data — renders `--` in UI. Acceptable.

**DB change — visible_in_ui enabled:**
```sql
UPDATE properties SET visible_in_ui = true
WHERE sport = 'rugby'
  AND property_type IN ('series','governing_body','team','event')
  AND visible_in_ui = false;
-- 13 rows updated
```

**Final visibility state:**
- visible: series (1), governing_body (1), team (10), event (1) = **13 entities live**
- hidden: athlete (11), venue (11) = 22 entities intentionally suppressed

### Task 2 — Ingestion run cleanup

**Mode: Audit + Build**

9 ingestion runs existed for `premiership-rugby`. 8 were bad or duplicate and have been removed.

**Removed runs (8 total):**

| Run ID | Reason |
|---|---|
| 3927e509 | Pre-v0.7 stale starter, entity_count=0, build_series_structure never called |
| 784ffb21 | Wrong slug `series-premiership-rugby`, entity_count=0 |
| fb55fa86 | Statement timeout (pre-fix), entity_count=0, notes marked "safe to ignore" |
| b82b59bf | Statement timeout (pre-fix), entity_count=0, notes marked "safe to ignore" |
| a0c05742 | Test run ("test 2"), entity_count=0 |
| 7879ca79 | Duplicate proper run (entity_count=14) — superseded by 3b21c9b5 |
| 2be6ae26 | Duplicate proper run (entity_count=14) — superseded by 3b21c9b5 |
| c42d3b7b | Duplicate proper run (entity_count=14) — superseded by 3b21c9b5 |

**Linked records also removed:**
- `control_room_log`: all entries for the 8 removed runs
- `ingestion_run_checklist`: 9 rows (3 per duplicate proper run × 3 runs)
- `control_room_issue_states`: not touched — those rows are keyed by `series_slug`, not `run_id`, and the 2 existing rows are marked `intentional`

**Keeper run:**
- `3b21c9b5` — series_slug: `premiership-rugby`, status: `needs-review`, entity_count: 14, created 2026-03-13 22:26:59

**Next steps:**
- Synthetic FanScore data is in place. If real social data is ingested, scores will update naturally.
- Athletes remain hidden until portrait images are sourced.
- Venues remain hidden (no images, no explicit scope for go-live).
- The Control Room series removal / archive feature is a pending build task (archive flag on ingestion_runs, archive/delete UI, safe-delete conditions).

---

## Previous Session — 2026-03-14 (Explore UX simplification pass)

### Task — Explore UX simplification (7-part spec)

**Mode: Build**

Clean-up and UX improvement pass on `app/explore.html` and related components.

**Part 1 — Grid-only layout**

Removed masonry and list view modes entirely.

- `app/components/layout.js`: stripped to `var activeLayout = 'grid';` only. All masonry engine code (`layoutMasonry`, `clearMasonryPositions`, `setLayout`) removed.
- `app/ui.js`: removed `_masonryReflow()`, masonry branches from `setGridContent()`, masonry calls from `openChat()`/`closeChat()`. Updated header comment.
- `app/components/panel.js`: removed `_masonryReflow()` calls from `openDetail()` and `closeDetail()`.
- `app/explore.html`: removed layout toggle group from right bar (grid/masonry/list buttons), removed `bar-divider-v` after toggle, removed `(function initLayout(){...})()` IIFE, removed masonry resize listener.
- `app/styles.css`: masonry/list CSS rules remain (non-breaking dead code — left for potential future reuse, will not trigger without class names being applied).

**Part 2 — Full-page property overlay**

Property detail panel converted from a right-side slide-in to a full-page overlay that keeps the grid visible behind.

- `app/explore.html`: detail panel HTML restructured — added `.dp-backdrop` (click-to-close), wrapped content in `.dp-overlay-inner`.
- `app/styles.css`: `.detail-panel` rewritten as `position:fixed; inset:0; z-index:200; flex-center`. Added `.dp-backdrop` (semi-transparent, backdrop-filter blur). Added `.dp-overlay-inner` (max-width:680px, max-height:calc(100vh - 96px), rounded card). Added `body.detail-open { overflow:hidden }`. Removed old `body.detail-open .content { padding-right }` rule. Mobile: overlay slides up from bottom (border-radius top only).
- `app/components/panel.js`: added `_savedScrollY` variable. `openDetail()` now saves `window.scrollY` before opening. `closeDetail()` restores scroll position via `window.scrollTo({top: _savedScrollY, behavior:'instant'})`.

**Part 3 — Load More pagination**

Initial 24 cards rendered; +24 per Load More click. Full 200-card fetch retained.

- `app/ui.js`: added `PAGE_SIZE = 24`, `_displayedCount`, `_currentVis` variables. `renderGrid()` resets `_displayedCount` to `PAGE_SIZE` on every filter/sort change, renders first page only. Added `loadMore()` — appends next 24 cards by mutating the DOM (no full re-render). Added `updateFooter(shown, total)` — renders count + Load More button into `#explore-footer`.
- `app/explore.html`: added `<div class="explore-footer" id="explore-footer">` after card grid.
- `app/styles.css`: added `.explore-footer`, `.ef-count`, `.ef-load-more` styles.

**Part 4 — Scroll-to-top button**

Understated fixed button, appears after 320px scroll, smooth scroll back to top.

- `app/explore.html`: added `<button class="scroll-top-btn" id="scroll-top-btn">` with upward chevron. Scroll listener in `init()` toggles `.visible` class at 320px threshold. `scrollToTop()` global function added.
- `app/styles.css`: added `.scroll-top-btn` — fixed bottom-right, 36px circle, opacity transition, shifts up when compare tray open.

**Interaction flow preserved:** user lands on grid → scrolls → loads more → clicks card → overlay opens (scroll locked) → browses detail → closes (grid still at exact scroll position). Filter/sort resets to page 1. Escape key closes overlay (pre-existing handler unchanged).

**Files changed:**
- `app/explore.html`
- `app/components/layout.js`
- `app/components/panel.js`
- `app/ui.js`
- `app/styles.css`

---

## Previous Session — 2026-03-14 (Control Room image audit table + Premiership Rugby go-live cleanup)

### Task 1 — Control Room image audit table

**Mode: Build**

Enhanced Section 2.5 (Images) in `app/control-room.html` to be a proper image audit surface.

**Changes:**
- `<script src="images.js"></script>` added before the inline script block, making `PROPERTY_IMAGES` and `EVENT_VENUE_MAP` available in the Control Room
- CSS: added `.cr-img-status` variants for `missing`, `broken`, `manual`, `js-fallback` (all semantic tokens, with dark-mode overrides for all six statuses)
- `buildImgEntityRow()` fully replaced: now resolves effective status from both entity_images and images.js fallback; surfaces `js-fallback` when no entity_images row but a static entry exists; surfaces `broken` via per-image onerror → `imgLoadError()` helper; shows `manual` label when source_type is manual; adds per-row Scan button for entities without a confirmed image; stable badge IDs for runtime broken detection
- `renderImagesTable()` summary stats: hardcoded hex removed (now uses `--color-success-700`, `--color-warning-700`, `--color-error-600`); adds `images.js fallback` and `missing` counts
- `imgLoadError(img, badgeId)` helper added adjacent to `buildImgEntityRow`

**Status values now covered:** confirmed, suggested, placeholder, rejected, manual, js-fallback, missing, broken

**Actions now covered:** confirm, reject, mark placeholder, edit URL (inline), add URL (per-row shortcut), scan (per-row scan series trigger)

### Task 2 — Premiership Rugby go-live cleanup

**Mode: Audit + Build**

Full ecosystem audit of `premiership-rugby` using the new image audit surface and direct SQL queries.

**Entities audited:** 24 total — 10 teams, 11 athletes, 1 series, 1 event, 1 governing body

**Findings pre-fix:**
- 1 confirmed image (bath-rugby), 9 suggested (unverified team badges from incrowdsports CDN)
- newcastle-falcons, premiership-rugby (series), premiership-rugby-ltd had images.js entries but no entity_images rows
- premiership-rugby-final-2026: EVENT_VENUE_MAP → allianz-stadium-twickenham — fallback works correctly
- 11 athletes: no images anywhere — intentional, no source identified

**Fixes applied (Supabase):**
- Confirmed all 9 suggested team images (verified=true) — source is official incrowdsports/cortextech CDN
- Inserted confirmed entity_images rows for newcastle-falcons, premiership-rugby, premiership-rugby-ltd (promoted from images.js)

**Post-fix coverage:**
- Teams: 10/10 confirmed (100%)
- Series: 1/1 confirmed
- Governing body: 1/1 confirmed
- Event: images.js fallback via EVENT_VENUE_MAP working correctly
- Athletes: 0/11 — intentional gap, no portrait source identified

**ready_for_ui: NOT auto-enabled** — all entities remain `visible_in_ui = false`. Series is structurally ready for operator review. Athlete images are the remaining gap before full coverage.

### Files changed
- `app/control-room.html` — `<script src="images.js">` added; CSS expanded; `buildImgEntityRow` replaced; `renderImagesTable` summary updated; `imgLoadError` helper added
- `entity_images` (Supabase) — 8 rows confirmed; 3 rows inserted (newcastle-falcons, premiership-rugby, premiership-rugby-ltd)
- `docs/WORKING_CONTEXT.md` — this update
- `project-docs/DEVELOPMENT_LEDGER.md` — updated

### What comes next
- Operator to review premiership-rugby ecosystem in Control Room and manually enable `visible_in_ui` when satisfied
- Athlete portrait sourcing for premiership-rugby (premiershiprugby.com or press image library)
- Ecosystem relationship explanation layer (property profile UX)

---

## Previous Session — 2026-03-14 (shared UI helpers layer)

### What was done

Created `app/ui-helpers.js` — a shared reusable helper module for all public-facing pages. Exposes `window.SAI_UIH` namespace with 12 helpers.

Helpers centralised:
- `initTheme()` — replaced 6 identical `(function initTheme(){...})()` IIFEs across all pages
- `navigateTo(page)` — removed local definition from compare.html, watchlist.html, property.html; now a global via `window.navigateTo` alias
- `initMenuListeners()` — replaced 15-line click-outside + escape key blocks in 5 pages (compare, watchlist, portfolio, opportunities, property); explore.html retains its own richer version with sort/chat/detail panel handling

New helpers available for future UI work (not retroactively applied to existing rendering code):
- `typeBadgeHtml(type)` — themed type badge `<span>`
- `fanScoreText(prop, dp?)` — score with suppression handling
- `trendText(val)` / `trendColor(val)` — arrow + `/d` string + CSS var
- `propertyCountText(count, noun?)` — "1 property" / "4 properties"
- `isOnWatchlist(slug)` / `isInPortfolio(slug)` / `isInCompare(slug)` — saved-state guards
- `errorHtml(msg)` / `loadingHtml(msg?)` — standard state div HTML

### Files changed
- `app/ui-helpers.js` — created (new)
- `app/compare.html` — script tag added, 3 consolidations applied
- `app/watchlist.html` — script tag added, 3 consolidations applied
- `app/portfolio.html` — script tag added, 2 consolidations applied
- `app/opportunities.html` — script tag added, 2 consolidations applied
- `app/property.html` — script tag added, 3 consolidations applied
- `app/explore.html` — script tag added, 1 consolidation (initTheme only)
- `CLAUDE.md` — new "Shared UI Helpers" section added before Enforcement Rules
- `project-docs/DEVELOPMENT_LEDGER.md` — ui-helpers.js row added
- `docs/WORKING_CONTEXT.md` — this update

### What comes next
- Ecosystem relationship explanation layer (property profile UX — shows how entity relates to its series/team/event ecosystem)
- No outstanding blockers

---

## Previous Session — 2026-03-14 (QA pass, rugby images, Control Room image workflow)

### Task 1 — Full public product QA pass

**Mode: Build + Review**

Scanned explore.html, panel.js, compare.html, watchlist.html, portfolio.html, property.html, card.js, storage.js, data.js.

**Findings:**

No critical bugs found. Two low-severity observations:

1. **Dead code — `.card-btn` legacy click handler in `explore.html` `init()`** (lines 635-644): The else branch toggles `.active` class on `.card-btn` without persisting to storage. Not a functional bug because all current cards render `.hero-btn`, not `.card-btn`. The `.card-btn` handler for compare correctly calls `compareToggle`. No code change applied — flagging only.

2. **Score label on cards** (`card.js` line 79): `'<div class="score-lbl">FanScore &middot; 30d avg</div>'` still includes "30d avg". Intentionally different from the cleaned property profile label (compact card format). Type A difference — acceptable.

All action wiring confirmed correct: `SAI_STORAGE.watchlist`, `.portfolio`, `.compare` — all toggle correctly from card overlay, panel, and property page. `compareList` seeding on init is correct. `syncCompareButtons`, `syncWatchlistButtons`, `syncPortfolioButtons` all operate on current button states at toggle time.

**No code changes applied from this task.**

---

### Task 2 — Momentum chart validation

**Mode: Review**

Confirmed momentum chart implementation against spec. All field wiring correct:

| Metric | Source | Status |
|---|---|---|
| 30d change | `s30 - s60` | Correct |
| 90d change | `s30 - s90` | Correct |
| Daily trend | `t30` | Correct |
| Chart line | `currentProperty.sparks` | Correct |
| FanScore label | `"FanScore"` with `.prop-score-context` subtext | Correct — fixed previous session |

**Difference classification:**

- Type A (acceptable): Cards still show "FanScore · 30d avg" in compact label — different from property page, intentional
- Type B (spec vs impl): None remaining after label fix
- Type C (planned, not built): Sponsorship Context section in property profile
- Type D (intentional deviation): Confidence tier field not shown inline on property profile — shown as band label only (correct, not a bug)

**No code changes applied from this task.**

---

### Task 3 — Premiership Rugby image pass

**Mode: Build**

Added 13 new entries to `PROPERTY_IMAGES` in `app/images.js` and 1 new entry to `EVENT_VENUE_MAP`.

**Added entries:**

| Slug | Kind | Source |
|---|---|---|
| `premiership-rugby` | series | premiershiprugby.com CDN (cortextech.io) |
| `premiership-rugby-ltd` | series | Same as series logo |
| `allianz-stadium-twickenham` | venue | Wikimedia Commons aerial (MD5 path computed 2026-03-14) |
| `bath-rugby` | logo | premiershiprugby.com CDN (incrowdsports.com) |
| `bristol-bears` | logo | premiershiprugby.com CDN (incrowdsports.com) |
| `exeter-chiefs` | logo | premiershiprugby.com CDN (incrowdsports.com) |
| `gloucester-rugby` | logo | premiershiprugby.com CDN (incrowdsports.com) |
| `harlequins` | logo | premiershiprugby.com CDN (incrowdsports.com) |
| `leicester-tigers` | logo | premiershiprugby.com CDN (cortextech.io) |
| `newcastle-falcons` | logo | premiershiprugby.com CDN (cortextech.io) — club rebranded as Newcastle Red Bulls 2024-25 |
| `northampton-saints` | logo | premiershiprugby.com CDN (incrowdsports.com) |
| `sale-sharks` | logo | premiershiprugby.com CDN (incrowdsports.com) |
| `saracens` | logo | premiershiprugby.com CDN (cortextech.io) |

EVENT_VENUE_MAP: `'premiership-rugby-final-2026': 'allianz-stadium-twickenham'`

**Gaps remaining:**

11 athletes (alex-mitchell, ben-spencer, ellis-genge, finn-russell, freddie-steward, henry-slade, jack-nowell, kyle-sinckler, marcus-smith-rugby, maro-itoje, tom-curry) have no portrait entry. Comment added to images.js noting these require club portrait photography or premiershiprugby.com player portal sourcing. All fall through to placeholder hero icon.

**Image count after this session:** PROPERTY_IMAGES: 91 entries. EVENT_VENUE_MAP: 19 entries.

**ready_for_ui decision:** Teams, series, venue, governing body all have images. All 25 entities visible when series is set to `visible_in_ui: true`. Athletes will render with placeholder icon. Recommend: set `visible_in_ui: true` after running a Control Room image audit to validate the CDN URLs load. Athletes can stay as placeholder for initial visible state.

**Files changed:** `app/images.js`

---

### Task 4 — Control Room image workflow

**Mode: Build**

The existing Images section (section 2.5) was already substantially complete — per-entity table with status, preview, source, confirm/reject/placeholder actions, and a bottom manual-add form. Two gaps were identified and fixed.

**Gap 1 — No per-entity Add button for entities with no image**

Previously: entities with `status: 'none'` (no image row yet) showed an empty actions cell. The only add path was scrolling to the bottom form and manually selecting the entity from a dropdown.

Fix: `buildImgEntityRow()` now renders an `Add URL` button for primary rows with no image. The button calls `openInlineAdd(entityId)`, which scrolls to the manual add form and pre-selects the correct entity. The URL field is focused automatically.

**Gap 2 — `openEditImgUrl()` used `prompt()` dialog**

The edit URL action used a blocking browser `prompt()` which is inconsistent with the rest of the CR UI.

Fix: Replaced `openEditImgUrl()` with `openEditImgUrlInline(id, currentUrl)`. Clicking "Edit URL" now replaces the actions cell content with an inline `<input>` (styled with `cr-img-url-input`) plus Save / Cancel buttons. Save calls `saveEditImgUrlInline(id)` which patches Supabase and reloads the section. Cancel calls `loadImagesSection(IMAGES_SERIES)` to restore the row.

Each actions cell now has `id="img-actions-{rowId}"` for stable targeting, and each entity row has `id="img-entity-row-{entityId}"` for future row-level operations.

**Files changed:** `app/control-room.html`

---

## Previous Session — 2026-03-14 (Momentum charts on property profile)

### Momentum charts — `app/property.html`

**Mode: Build**

Added a full momentum chart section to the property profile page. The existing page showed a small 90-day sparkline in the FanScore block but had no trend metric tiles and no chart in the Momentum section.

**What was added:**

Two new rendering functions in `property.html`:

- `renderMomentumMetrics()` -- synchronous; called at end of `renderProperty()`. Reads `s30`, `s60`, `s90`, and `t30` from `currentProperty`. Renders up to three stat tiles (30d change, 90d change, Daily trend) with semantic colour from `arrC()`. Handles null values with clean `--` fallback tiles. Hidden when `sup30` is set.

- `renderMomentumChart()` -- async; called from the sparks `.then()` path alongside `renderSparkline()`. Renders a full-width 72px-tall SVG chart using the existing `renderSpark()` helper from `data.js`. Adds date labels (first / last date in sparks array) below the chart. Shows a clean "Insufficient data for chart" notice when fewer than 2 valid data points exist. Hidden when `sup30` is set.

The Momentum section HTML was extended to include:
- `#momentum-metrics` (hidden until populated)
- `#momentum-chart-wrap` > `#momentum-chart` + `#momentum-chart-unavail` (hidden until populated)

New CSS classes added to the embedded `<style>` block:
`.momentum-metrics-row`, `.momentum-metric`, `.momentum-metric-lbl`, `.momentum-metric-val`, `.momentum-metric-na`, `.momentum-metric-sub`, `.momentum-chart-svg-wrap`, `.momentum-chart-dates`, `.momentum-chart-unavail`

The existing FanScore `#prop-spark` small sparkline was preserved unchanged.

**Data used (no schema change required):**

| Metric | Source | Notes |
|---|---|---|
| 30d change | `s30 - s60` | "Current 30d avg vs prior 30d avg" |
| 90d change | `s30 - s90` | "Current 30d avg vs 90d window avg" |
| Daily trend | `t30` | 30-day slope, units per day |
| Chart line | `currentProperty.sparks` | `{d, v}` array; null gaps preserved as visual breaks |

**Missing-data handling:**

| Condition | Behaviour |
|---|---|
| `sup30` set | Metrics hidden; chart hidden |
| `s60 == null` | 30d change tile shows `--` |
| `s90 == null` | 90d change tile shows `--` |
| `t30 == null` | Daily trend tile omitted |
| `validPts.length < 2` | Chart replaced by "Insufficient data for chart" notice |
| All tiles produce `--` only | Metrics section still shown (data gap is itself informative) |

---

## Previous Session — 2026-03-14 (Watchlist/Portfolio button sync pass)

### Watchlist and Portfolio UI sync — correctness pass

**Mode: Build + Review**

A small UI sync pass to close the known minor gap from the previous session. Watchlist and Portfolio button states now stay visually current everywhere Compare already did.

**Root causes of stale state:**

Two paths where a toggle updated storage and one button but not the other:

1. **Card overlay → Panel**: clicking a watchlist/portfolio hero-btn updated that card's overlay button but not the panel button if the panel was open for that card.
2. **Panel → Card overlay**: `dpAction('watch'/'portfolio')` updated the panel button but left the corresponding card hero-btn at its render-time state.

**Fix — two new helpers added to `app/explore.html`:**

```js
function syncWatchlistButtons(slug, nowIn) { ... }
function syncPortfolioButtons(slug, nowIn) { ... }
```

Each queries `document.querySelectorAll('.hero-btn[data-action="..."]')`, filters by `data-slug`, and sets `.active` and `.title` in place. No card re-render required.

**Fix — delegation handler updated (`app/explore.html`):**

After any watchlist or portfolio toggle from a card overlay, the sync helper is called (updates all matching hero-btns). If the panel is open for that same card (`detailCardId === id`), `_dpRefreshBtn` is also called to update the panel button immediately.

**Fix — `dpAction` updated (`app/components/panel.js`):**

After any watch or portfolio toggle from the panel, the sync helper is called (updates card overlay hero-btns). The `typeof` guard keeps panel.js portable on pages without the helpers.

**Remaining limitation (unchanged, acceptable):**

Watchlist and Portfolio removes on their respective destination pages involve full page navigation back to Explore. Cards render with correct state from SAI_STORAGE on load. There is no cross-tab live sync (consistent with how Compare and watchlist page removal already worked).

---

## Previous Session — 2026-03-14 (Explore card action fixes)

### Explore card action flow — end-to-end fix

**Mode: Build + Review**

Three root-cause bugs were identified and fixed. All three card overlay actions (Watch, Compare, Portfolio) now work correctly from the card surface, the slide-out panel, and the property page. Destination pages (Watchlist, Portfolio, Compare) confirm correct state on load.

**Root cause 1 — `onclick="event.stopPropagation()"` on `.card-hero-actions` (card.js)**

The overlay container had an inline `stopPropagation` that killed all hero-btn click events before they could reach the document-level delegation handler in explore.html. Removed. The `.fanscore-card` onclick was simultaneously updated to guard against accidental card-open when the user clicks inside the overlay background:

```js
// Before:
heroHtml += '<div class="card-hero-actions" onclick="event.stopPropagation()">'
// After:
heroHtml += '<div class="card-hero-actions">'
// fanscore-card onclick:
onclick="if(!event.target.closest('.card-hero-actions'))selectCard('...')"
```

**Root cause 2 -- compareList desync on page load (explore.html)**

`compareList` started as `[]` even when `SAI_STORAGE.compare` had saved slugs. On first click, an item in storage that should remove instead added again. Fixed by seeding `compareList` from `SAI_STORAGE.compare` after `allCards` loads in the `init()` IIFE.

**Root cause 3 -- double-toggle in panel compare action (panel.js)**

`dpAction('compare')` previously called `SAI_STORAGE.compare.toggle(slug)` directly, then also called `compareToggle(id)` -- which toggles storage again. Net: two toggles = no change. Fixed by removing the direct storage call. `dpAction('compare')` now delegates exclusively to `compareToggle(id)` when available, with a fallback to direct storage toggle on pages without compareToggle.

**compareToggle rewritten (explore.html)**

Rewritten to check both `compareList` and `SAI_STORAGE` when determining whether an item is currently selected. Returns a boolean (true = now in selection). Handles the "add" and "remove" paths cleanly without storage/list desync.

**`syncCompareButtons()` (explore.html)**

Extended to update `.hero-btn[data-action="compare"]` elements: sets `.active`, `.disabled`, `aria-disabled`, and `title` correctly based on the current `compareList` and `SAI_STORAGE.compare`. Called at the end of every `compareToggle()` call.

**Parts 4-6 audit findings**

- `panel.js`: Watch and Portfolio actions use `SAI_STORAGE.[list].toggle(slug)` and refresh the panel button with `_dpRefreshBtn`. Initial state at panel open reads from `SAI_STORAGE`. All correct.
- `property.html`: Watchlist toggle uses `SAI_STORAGE.watchlist.toggle/has`. Initial state set in `renderProperty()`. Compare button navigates to `compare.html?a=slug` (by design -- not a toggle). No portfolio action on the property page (intentional -- read-only view).
- `watchlist.html`: Reads from `SAI_STORAGE.watchlist.get()` on load. `removeFromWatchlist()` calls `SAI_STORAGE.watchlist.remove()`. ✓
- `portfolio.html`: Reads from `SAI_STORAGE.portfolio.get()` on load. `removeFromPortfolio()` calls `SAI_STORAGE.portfolio.remove()`. ✓
- `compare.html`: Reads from SAI_STORAGE and URL params as fallback. Confirmed working for 1, 2, and 3-way comparisons. ✓

**Known minor gap (logged, not blocking)**

When a user adds to watchlist or portfolio via the panel, the corresponding card overlay `.hero-btn` on the grid won't update its `.active` state until the card re-renders. Storage is always correct; only the hover-visible DOM button state can be stale within the same page session. This is consistent with how compare buttons worked before `syncCompareButtons()` was introduced. A future `syncWatchlistButtons()` / `syncPortfolioButtons()` pass would close this gap.

**Next UX item logged (not built)**

Property profile momentum charts: replace the static 30d FanScore spark with a chart showing 30d and 90d change clearly. This is the most analytically valuable missing visual on the property page. Logged in product backlog and roadmap. No code changes made.

---

## Previous Session — 2026-03-14 (Navigation tidy + 3-way Compare)

### Opportunities removed from primary navigation

**Mode: Build**

The Opportunities page has been removed from the navigation menu across all 6 pages (explore.html, compare.html, watchlist.html, portfolio.html, property.html, opportunities.html). The page itself is unchanged and remains accessible via direct URL. No routing or links within page content were affected -- only the floating nav menu items were removed.

Nav now shows: Col 1 (Explore, Portfolio, Compare), Col 2 with divider (Watchlist). Opportunities is no longer present in any nav.

### Compare extended to 3-way side-by-side

**Mode: Build**

Compare now supports up to 3 properties side by side. All changes are backward-compatible: existing 2-way compare behaviour is preserved.

**`app/storage.js`**

`SAI_STORAGE.compare` max bumped from 2 to 3. Key: `sai-compare`, now stores up to 3 slugs.

**`app/compare.html`**

- Third selector added: "Property C" (labelled optional)
- `selectedC` global state variable added
- URL param `?c=slug` supported in addition to `?a=` and `?b=`
- `loadProperties()` reads `?c=` from URL params and `saved[2]` from localStorage fallback
- `populateSelectors()` now populates all three `<select>` elements
- `updateComparison()` reads selectedC, persists up to 3 slugs to SAI_STORAGE, fetches 2 or 3 properties in parallel, passes array to `renderComparisonTable()`
- `renderComparisonTable(props)` now accepts an array of 2 or 3 property objects; table header and body columns scale accordingly
- `saveComparisonLink()` includes `?c=` when a third property is selected
- `clearCompareSelection()` also clears selectedC and select-c
- Selection status line added below selectors: "Select up to 3 properties to compare" / "1 of 3 selected" / "2 of 3 -- add a third for a 3-way view" / "3 of 3 selected"
- Partial state (1 selected): inline message "Select 1 more property to start comparing. Add a third for a 3-way view."
- Selector grid updated to `repeat(auto-fit, minmax(180px, 1fr))` -- handles 2 or 3 columns automatically

**`app/components/card.js`**

Hero compare button now shows count feedback:
- Title: "Add to compare (N/3 selected)" when queue is partial, "Compare queue full (3/3)" when full and this card is not in it, "Remove from compare" when active
- `.disabled` class and `aria-disabled="true"` when queue is full and card is not already in the selection
- `.hero-btn.disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }` added to styles.css

**`app/components/panel.js`**

Panel compare button label reflects count:
- "Comparing" when active, "Compare (N/3)" when queue has items but this property is not selected, "Compare (full)" when all 3 slots taken
- After dpAction toggle: label updates to "Compare (N/3)" with current count or "Comparing"

**`app/explore.html`**

- `syncCompareButtons()` extended to update `.hero-btn[data-action="compare"]` elements: sets `.active`, `.disabled`, `aria-disabled`, and `title` correctly based on current in-page `compareList` and `SAI_STORAGE.compare`
- In-page tray compare cap remains at 3 (was already correct)
- `clearCompare()` already clears SAI_STORAGE (confirmed no change needed)

**localStorage keys (current):**

- `sai-theme` -- light/dark mode preference
- `sai-watchlist` -- JSON array of property slugs (unbounded)
- `sai-portfolio` -- JSON array of property slugs (unbounded)
- `sai-compare` -- JSON array of up to 3 property slugs (cross-page compare selection)
- `sai-layout` -- grid/masonry/list (explore.html only)

---

## Previous Session — 2026-03-14 (Cross-page QA + saved state wiring)

### Cross-page QA pass + Watchlist/Portfolio/Compare fully wired

**Mode: Build + Review**

All public-facing pages have been QA-checked and all saved-state actions (Watch, Portfolio, Compare) are now fully wired, persisted, and visually consistent across Explore, panel, Watchlist, Portfolio, and Compare.

**New file: `app/storage.js`**

Shared localStorage helper module. Provides a consistent API for all three saved lists:

- `SAI_STORAGE.watchlist` -- `sai-watchlist` key, array of slugs
- `SAI_STORAGE.portfolio` -- `sai-portfolio` key, array of slugs
- `SAI_STORAGE.compare` -- `sai-compare` key, max 3 slugs (cross-page compare selection)

Methods on each list: `.get()`, `.set(arr)`, `.has(slug)`, `.add(slug)`, `.remove(slug)`, `.toggle(slug)`. All pages now load `storage.js` before `data.js`.

**`app/components/panel.js` -- dpAction wired**

`dpAction('watch', id)`, `dpAction('portfolio', id)`, and `dpAction('compare', id)` are now real implementations (previously a no-op placeholder). Each:
- Resolves the slug from `allCards` using the property UUID
- Calls `SAI_STORAGE.[list].toggle(slug)` and updates button label and `.active` class in-place
- Compare action also syncs with Explore's in-page compare tray via `compareToggle(id)` if available

Action buttons in the panel now show active state on open: "Watching" / "In portfolio" / "Comparing" with `.active` class if already saved.

Panel "Compare" button is no longer permanently disabled.

**`app/components/card.js` -- hero buttons wired + bug fix**

Coverage percentage display bug fixed: `(c.cov30*100)` was incorrect (value is already 0-100); corrected to `Math.round(c.cov30)`.

Hero overlay buttons (`data-action="watchlist"`, `data-action="compare"`, `data-action="portfolio"`) now:
- Include `data-slug` attribute for direct slug lookup
- Reflect saved state as `.active` class on render (check SAI_STORAGE)
- Show correct tooltip ("Add to" vs "Remove from") on render

**`app/explore.html` -- hero-btn event handler + compare sync**

Event delegation handler added for `.hero-btn[data-action]` clicks. Watchlist and portfolio buttons write to `SAI_STORAGE` and toggle `.active` in-place. Compare button calls `compareToggle(id)` (existing in-page tray).

`compareToggle()` now also syncs the compare slug to `SAI_STORAGE.compare` so compare.html can pick it up. `clearCompare()` also clears `SAI_STORAGE.compare`.

**`app/compare.html` -- pre-populated from localStorage**

Compare page now reads `SAI_STORAGE.compare` as a fallback when no URL params are present. Priority: URL params (`?a=slug&b=slug`) first, then `sai-compare` localStorage.

`updateComparison()` writes back to `SAI_STORAGE.compare` when selectors change, keeping state in sync.

`saveComparisonLink()` replaced `alert()` with an inline opacity-fade notice element (`#compare-notice`).

New `clearCompareSelection()` function clears both selectors, `SAI_STORAGE.compare`, the comparison table, and the URL params.

**`app/watchlist.html` -- SAI_STORAGE**

`removeFromWatchlist(slug)` now calls `SAI_STORAGE.watchlist.remove(slug)` instead of raw localStorage. Removes the item from the rendered list without a full reload when items remain. `loadWatchlist()` uses `SAI_STORAGE.watchlist.get()`.

**`app/portfolio.html` -- SAI_STORAGE + confirm removed**

`loadPortfolio()` uses `SAI_STORAGE.portfolio.get()`. `removeFromPortfolio(idx)` now calls `SAI_STORAGE.portfolio.remove(slug)` and removes the `confirm()` dialog (inline remove, consistent with the tool's analytical tone).

**`app/property.html` -- SAI_STORAGE**

`toggleWatchlist()` and `updateWatchlistButton()` now use `SAI_STORAGE.watchlist.toggle/has`. Watchlist button also updates `aria-label` and `title` to reflect state.

**`app/styles.css` -- dp-action-btn active state**

`.dp-action-btn.active` added: accent background, white text, no border. `.dp-action-btn.active:hover` at 88% opacity.

**localStorage keys in use (updated):**

- `sai-theme` -- light/dark mode preference
- `sai-watchlist` -- JSON array of property slugs
- `sai-portfolio` -- JSON array of property slugs
- `sai-compare` -- JSON array of up to 3 property slugs (cross-page compare selection)
- `sai-layout` -- grid/masonry/list (explore.html only)

---

## Previous Session — 2026-03-13 (Page structure v1 — full app navigation, property profiles, real data)

### Page structure v1 — all pages rebuilt on design system

All six app pages are now consistent: floating bar navigation, design system tokens (styles.css), real Supabase data, FitScore fully removed everywhere.

**Pages rebuilt or rewritten:**

- `app/property.html` — complete rewrite. Loads real data from `v_property_summary_current?slug=eq.{slug}`. Sections: property header with image (resolveImageMeta), FanScore signal card (avg_score_30d, trend, confidence, sparkline), audience signals (followers, engagement rate, posts, platforms), momentum badges (computeMomentumScore), ecosystem section (loadRelationships + related entity cards), recent posts (loadPosts). Watchlist toggle uses `localStorage['sai-watchlist']`. Compare links to `compare.html?a={slug}`. Navigation: same floating bar shell as explore.html.

- `app/compare.html` — complete rewrite. URL-driven (?a=slug&b=slug). Loads all properties from DB for dropdowns. Side-by-side comparison table: FanScore, trend, confidence, followers, engagement, posts, sport, region. "Save as link" button copies URL to clipboard. No FitScore.

- `app/watchlist.html` — complete rewrite. Reads slugs from `localStorage['sai-watchlist']`. Fetches live property data from Supabase for those slugs. Shows: name, type badge, country flag, FanScore with trend, confidence. Actions: View, Compare, Remove. Empty state links to explore.html.

- `app/portfolio.html` — complete rewrite. Same pattern as watchlist but uses `localStorage['sai-portfolio']`. Structured table layout with summary stats bar (count, avg FanScore, rising count). Actions: View, Compare, Remove.

- `app/opportunities.html` — rewritten as honest placeholder with "coming soon" messaging in brand tone + bridge content (top 5 FanScore properties from live DB data, each linking to property.html).

- `app/explore.html` — nav updated only. Added Watchlist and Opportunities to nav menu, replaced SPA-only `setNavActive` calls with proper `window.location.href` navigation.

**Navigation consistency:**

All pages now use the same 2-column floating bar nav:
- Col 1: Explore, Portfolio, Compare
- Col 2 (with divider): Watchlist, Opportunities

Active page is highlighted. All links navigate correctly with `window.location.href`.

**panel.js change:**

Added "Full profile" link to the detail panel action row in `app/components/panel.js`. When a property card is opened in the detail panel, "Full profile" links to `property.html?slug={slug}`. This completes the Explore → Property navigation path.

**Design system compliance:**

All pages use CSS custom properties from styles.css only. No hardcoded hex values in any CSS. FitScore: zero mentions across all pages. Property type colours use `--{type}-bg` / `--{type}-fg` token pairs. Spacing uses `--spacing-*` tokens.

**localStorage keys in use:**

- `sai-theme` — light/dark mode preference
- `sai-watchlist` — JSON array of slugs (property.html watchlist button + watchlist.html)
- `sai-portfolio` — JSON array of slugs (portfolio.html)
- `sai-layout` — grid/masonry/list (explore.html only)

---

## Previous Session — 2026-03-13 (Control Room v0.7 — Ingestion pipeline automation)

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
