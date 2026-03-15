# WORKING_CONTEXT.md

SponsorAI — Working Context

Last updated: 2026-03-15 (Cross-page workflow: navigation continuity + origin-aware back button)

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

## Last Session — 2026-03-15 (Cross-page workflow: navigation continuity + origin-aware back button)

### Context

A focused audit-and-implement pass across the evaluation workflow (Explore → Watchlist → Board → Compare → Property). Each surface was audited for the single highest-value gap, fixed, then passed to the next surface. All changes are vanilla JS + CSS. No new dependencies. No build steps required.

---

### Task 1 — Board: clickable card names + dynamic header copy (Build)

**What changed:**

`app/board.html`:
- Card name now renders as an anchor: `<a class="board-card-name-link" href="property.html?slug=...&ref=board">`. Previously plain text; the name was the most obvious navigation target on the card and did nothing.
- `updateSubtitle(count)` now sets the explore-link text dynamically. When count is 0: "Browse Explore to add properties". When count >= 1: "Add more from Explore". Previously the "Browse Explore" copy was always visible as a static instruction, even with a full board.
- `board-explore-link` id added to the anchor in the header HTML so `updateSubtitle()` can reach it.
- CSS: `.board-card-name-link` (colour: inherit, no underline), hover underline with `text-underline-offset: 2px`, focus-visible outline using `var(--accent)`.

---

### Task 2 — Board: surface confidence_band_30d on cards (Build)

**What changed:**

`app/board.html`:
- `confidence_band_30d` already fetched in the board query but never rendered.
- New `.board-card-conf` column added to the signals row (third column, `margin-left: auto` to right-align). Shows value (capitalised, text-xs, text-3 colour) and "Confidence" label (10px, uppercase, letter-spacing).
- Null suppressed: block only renders when `confBand` is truthy.
- View button updated to include `&ref=board` for back-button origin tracking.
- CSS: `.board-card-conf`, `.board-card-conf-val`, `.board-card-conf-label`.

---

### Task 3 — Compare: fix single-property arrival state (Build)

**What changed:**

`app/compare.html`:
- Root cause: `updateComparison()` was gated entirely behind `slugA && slugB`. The `else` branch showed the content container but left the comparison body blank -- indistinguishable from a load failure.
- Fix: added `if (selCount > 0) updateComparison()` in the `else` branch.
- The partial-state message ("Select 1 more property to start comparing") already existed in `updateComparison()` for the 1-selection case -- it was just never triggered on initial load when arriving via `?a=slug` from Board.

---

### Task 4 — Watchlist: clickable item names (Build)

**What changed:**

`app/watchlist.html`:
- Item name now renders as an anchor: `<a class="watchlist-item-name-link" href="property.html?slug=...&ref=watchlist">`. Previously plain text.
- View button updated to include `&ref=watchlist`.
- CSS: `.watchlist-item-name-link` (same pattern as board-card-name-link).

---

### Task 5 — Property page: Board button navigates instead of removes (Build)

**What changed:**

`app/property.html`:
- `toggleBoard()` previously called `SAI_STORAGE.board.removeFromBoard(slug)` when property was already tracked. A user mid-evaluation clicking the button would silently remove it with no undo.
- Fix: when already on board, `toggleBoard()` now calls `navigateTo('board.html')` instead.
- `updateBoardButton()` updated: button title is "View on Board" when tracked, "Add to Board" when not.
- Removal is still available from the Board's own remove button.

---

### Task 6 — Property page: origin-aware back button via ?ref= parameter (Build)

**What changed:**

`app/property.html`:
- Added `setupBackButton()`. Reads `?ref=` from the URL. Maps known values (board, watchlist, opportunities, portfolio, explore) to a destination page and aria-label. Falls back to Explore for unknown or missing ref.
- `init()` calls `setupBackButton()` before `loadProperty()` so the button is correct immediately, independent of data loading.

**Entry-point files updated with &ref= parameters:**
- `app/board.html` -- card name link + View button: `&ref=board`
- `app/watchlist.html` -- item name link + View button: `&ref=watchlist`
- `app/opportunities.html` -- `navigateToProp()`: `&ref=opportunities`
- `app/portfolio.html` -- View link: `&ref=portfolio`
- `app/components/panel.js` -- "Full profile" button + "Open full property profile" CTA: `&ref=explore`

Note: property-to-property self-links (ecosystem cards, similar opportunities) deliberately omit `ref`. Default fallback of Explore is acceptable.

---

### Remaining gaps flagged (not addressed in this session)

- `.prop-action-btn.active` has no CSS differentiation -- board/compare active states rely only on label text change (flagged in previous session's audit, still open)
- Ecosystem eco-cards use `minmax(160px, 1fr)` which collapses to 1 column on mobile (2 cols would be better at ≤640px, matching the similar-grid fix)
- `portfolio.html` View link uses an inline `style=""` attribute for colour and font-size rather than a semantic CSS class
- Board has no empty-state CTA for stages other than the overall empty board (per-column empty states exist, but no "Add from Explore" shortcut per-column)

---

### Recommended next step

`.prop-action-btn.active` visual differentiation: add a subtle accent border or fill to confirm "On Board" / "In Compare" status. This is the highest-value cosmetic gap on the property page and a direct follow-on to the Board button behaviour fix.

---

## Last Session — 2026-03-15 (Property page: Smart Recommendations + completeness audit)

### Task -- Smart Recommendations: Similar Opportunities section (Build)

**What changed:**

`app/property.html`:
- Added `<section id="similar-section">` between Ecosystem and Recent Posts (hidden until populated)
- Added `scoreSimilarity(row, current)` -- scores a candidate on sport (+3), type (+2), region (+2), audience size (+1). Score is internal; only the highest-priority reason label is shown per card
- Added `loadSimilarProperties()` -- fetches up to 30 candidates from `v_property_summary_current` filtered by `sport=eq.{sport}` (fallback: `property_type=eq.{type}`), excludes current slug, scores client-side, takes top 4
- Added `renderSimilarOpportunities(scored)` -- renders 4 compact cards using the `prop-eco-card` pattern extended with a `.similar-reason` label badge
- Wired `loadSimilarProperties()` call immediately after `renderProperty()` in `loadProperty()`
- Added 11 CSS rules for `.similar-grid`, `.similar-card`, `.similar-card-top`, `.similar-name`, `.similar-card-meta`, `.similar-type`, `.similar-flag`, `.similar-followers`, `.similar-reason` (semantic tokens only)
- Fixed pre-existing regression: `document.getElementById('page-view-title')` null reference (element removed during header unification) -- added null guard

**Reason labels used:**
- "Same sport" (sport match, weight 3) -- highest priority
- "Also a [type]" e.g. "Also a team" (type match, weight 2)
- "Same region" (region match, weight 2)
- "Similar audience size" (followers within 0.3x--3x ratio, weight 1)

---

### Task -- Property page completeness and consistency audit (Review + Build)

**Audit findings:**

1. Section order: Property Header → FanScore → Audience Signals → Momentum → Ecosystem → Similar Opportunities → Recent Posts. Order is logical and no changes needed.
2. Spacing: all sections use `.prop-section` consistently with `margin-bottom: var(--spacing-4xl)`, `padding-bottom: var(--spacing-3xl)`, `border-bottom: 1px solid var(--border)`. Last-child rule removes separator correctly.
3. Hidden section reveal: Ecosystem, Similar, and Recent Posts all use the same `section.style.display = 'block'` pattern on data arrival. Consistent.
4. Card consistency between Ecosystem and Similar: both use the same compact card pattern (name, type badge, numeric value, divider line for secondary label). Ecosystem shows FanScore number; Similar shows followers + reason label. Different data emphasis appropriate to each section's purpose.
5. Recent Posts uses a list pattern (not cards), which is appropriate for content -- no inconsistency.
6. **Zero `@media` queries on property page** -- The only page in the app with no responsive breakpoints. The `.prop-header` flex row has `flex: 0 0 240px` on the hero; on a 375px screen this leaves ~111px for property name, bio, and actions. Structurally broken on mobile.
7. **`renderSignalCard` `isFollowers` parameter unused** -- Followers delta was displayed as a raw integer (e.g. "+50000") while the value above it showed a formatted compact number ("50k"). Bug: the parameter existed to handle this but the function never used it.
8. `.prop-action-btn.active` has no visual CSS differentiation. The board button gets class `active` but no styling for that state. Minor gap.

**Chosen improvement: property page mobile responsive layout**

The absence of any responsive CSS was the single highest-value gap -- structural layout break on mobile affecting every user who navigates to a property on a phone or tablet. Second fix included: follower delta formatting (one-line, pre-existing bug with an already-existing parameter stub).

**What changed:**

`app/property.html`:
- Fixed `renderSignalCard`: `isFollowers` parameter now used. Follower deltas formatted with `fmtFollowers(Math.abs(delta))`, falling back to `String(Math.abs(delta))`. Delta now reads "+50k" not "+50000"
- Added `@media (max-width: 640px)` block: `.prop-header` stacks vertically (`flex-direction: column`); `.prop-hero` goes full width at 200px height; `.prop-name` scales down to 22px; `.prop-flag` scaled to match; `.similar-grid` locks to 2-column on narrow phones
- Added `@media (min-width: 641px) and (max-width: 1024px)` block: `.prop-hero` reduced to 180x180px; `.prop-name` scales to 26px. Keeps horizontal layout but reduces visual bulk

**Files changed:**
- `app/property.html` -- 2 changes: `renderSignalCard` fix + 2 responsive media query blocks

---

**Remaining property-page gaps:**

- `.prop-action-btn.active` has no CSS differentiation -- board/compare active states rely only on label text change
- Ecosystem eco-cards use `minmax(160px, 1fr)` which collapses to 1 column on mobile (2 cols would be better at ≤640px, matching the similar-grid fix)
- No loading indicator while Similar Opportunities loads (section simply appears when ready; consistent with Ecosystem and Posts behaviour, so not urgent)
- FanScore section title always renders even when suppressed -- minor (suppression notice is shown in its place, section title remains)

**Recommended next step:**
- Address the `.prop-action-btn.active` state gap with a subtle accent border or fill change to confirm confirmed/watching board status visually

---

## Last Session — 2026-03-15 (App header unification)

### Task -- Unify header visual language across all inner app pages (Build)

**Problem:**

Six pages (portfolio, compare, watchlist, board, opportunities, property) used a two-bar floating pill system: `.float-bar.bar-left` (logo + hamburger + nav, positioned `left: 24px; right: 88px; top: 24px`) and `.float-bar.bar-right` (profile button, positioned `right: 24px; top: 24px`). These had heavy pill chrome: gradient white background, 8px border-radius, outer box-shadow, inner border. Explore used a calmer in-page `.eh-brand` header with no chrome. The two header systems felt like different products.

**What changed:**

`app/styles.css`:
- Added `.app-header`: `position: fixed; top: 0; left: 0; right: 0; height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 var(--spacing-xl); gap: var(--spacing-lg); z-index: 200` -- full-width, edge-to-edge, no border-radius, no gradient, no shadow pill
- Added `.app-header .brand-logo`: `height: 28px` -- matches Explore's editorial logo scale (was 18px in floating bar)
- Added `.app-header .btn-group`: strips pill box styling, fills full height of header
- Added `.app-header .bar-btn`: transparent, neutral `color: var(--text-3)`, no box-shadow -- lighter button feel
- Added `.app-header .bar-btn svg path`: `stroke: currentColor` -- overrides hardcoded purple `#9B8AFB` SVG attribute, icon inherits neutral button colour
- Added `.app-header-right`: `display: flex; align-items: center; gap: var(--spacing-sm); margin-left: auto` -- right-side control group
- Updated `.nav-menu { top: 73px }` to `top: 65px` (56px header + 9px gap)
- Updated `.profile-menu { top: 78px }` to `top: 65px` (consistent with nav-menu)
- Updated `.content { padding: 88px ... }` to `padding: 72px ...` (56px header + 16px breathing room)
- Updated `@media (max-width: 640px) .content` padding from 80px to 68px; added `.app-header { padding: 0 var(--spacing-md) }` mobile override
- Updated `@media (641px-1024px) .content` padding from 88px to 72px
- Updated mobile `.chat-panel { top: 88px }` to `top: 72px`

`app/portfolio.html`, `app/compare.html`, `app/watchlist.html`, `app/board.html`, `app/opportunities.html`:
- Replaced `<div class="float-bar bar-left" role="banner">` with `<header class="app-header" role="banner">`
- Removed closing `</div>` of bar-left and entire `<div class="float-bar bar-right">` block
- Wrapped profile button in `<div class="app-header-right">` inside the unified `</header>`

`app/property.html`:
- Same structural change as above
- Right section contains: back button + watchlist button + `.bar-divider-v` + profile button -- all within `.app-header-right`
- The `body.page-property .bar-left { right: 216px }` CSS override is now a no-op (no `.bar-left` on property page) -- retained for safety, harmless

**What was not changed:**
- `app/control-room.html`: internal tool, not in scope

**Files changed:**
- `app/styles.css` -- `.app-header` component, positioning updates, padding updates
- `app/portfolio.html` -- header structure replaced
- `app/compare.html` -- header structure replaced
- `app/watchlist.html` -- header structure replaced
- `app/board.html` -- header structure replaced
- `app/opportunities.html` -- header structure replaced
- `app/property.html` -- header structure replaced (with back + watchlist + profile in right section)

---

### Task -- Unify Explore header with the shared app-header system (Build)

**Problem:**

After the 6-page inner app header unification, Explore still used a dual-system: two hidden `.float-bar` divs (suppressed by `body.page-explore .bar-left/right { display: none }`) PLUS an active `.eh-brand` div living inside `.explore-header` in the page flow. `.eh-brand` contained the hamburger, wordmark SVG, divider, and nav chips. Explore had no fixed header -- nav was in-flow at the top of content. Sticky bar was positioned relative to the old 24px+40px float-bar position (`top: 64px`). Content needed only `padding-top: var(--spacing-6xl)` (48px) because no fixed bar was clearing it. Both systems needed reconciling to the shared `.app-header` component.

**What changed:**

`app/explore.html`:
- Replaced `<div class="float-bar bar-left" role="banner">` with `<header class="app-header" role="banner">`
- Replaced the old `<span class="bar-page-title">Explore</span>` label approach with a full nav chip set (Explore / Portfolio / Compare / Watchlist / Board / Opportunities) matching the other 6 pages. `Explore` chip has `class="chip active"` and `aria-current="page"`
- Added `<div class="app-header-right">` containing the profile button only (Explore has no back/watchlist controls)
- Removed the `<div class="float-bar bar-right">` block (had only the profile button)
- Removed the entire `.eh-brand` div from inside `.explore-header`. This was a 10,355-character block containing a 32px wordmark SVG, hamburger button, bar-divider, and nav chip set. Removed via depth-tracking Python script due to the large inline SVG on a single line. `.explore-header` now opens directly with `.eh-intro`
- Hamburger in the new app-header uses `id="menu-btn"` (consistent with all other pages), replacing the old `id="eh-menu-btn"` in `.eh-brand-menu`. `toggleNavMenu()` now targets `#menu-btn` correctly

`app/styles.css`:
- Removed `body.page-explore .bar-left, body.page-explore .bar-right { display: none }` -- those elements no longer exist on Explore
- Removed `@media (min-width: 641px) { body.page-explore .eh-brand-menu { display: none } }` -- `.eh-brand-menu` no longer in Explore's DOM
- Updated section comment block at the Explore overrides section to reflect the new architecture
- Updated `.eh-sticky-bar { top: 64px }` to `top: 56px` -- aligns to the bottom of `app-header` (height 56px)
- Updated `body.eh-sticky-visible .content { padding-top: 112px }` to `padding-top: 104px` -- recalculated: app-header 56px + sticky bar 44px = 100px + 4px gap
- Updated `body.page-explore .content` block: removed `padding-top: var(--spacing-6xl)` override (Explore now shares the global 72px clearance rule). Kept `padding-left: 64px; padding-right: 64px` (grid-appropriate horizontal padding). Updated comment
- Removed `body.page-explore.eh-sticky-visible .content` block entirely -- this suppressed the global sticky-visible padding-top adjustment on Explore. With fixed app-header, Explore needs the same clearance as all other pages
- Removed `body.has-active-filter .eh-brand { margin-bottom: var(--spacing-xl) }` -- `.eh-brand` no longer in DOM

**Explore-specific overrides removed (now aligned with global rules):**
- `body.page-explore .bar-left/right { display: none }` -- removed (no float-bars on Explore)
- `body.page-explore .eh-brand-menu { display: none }` (media query) -- removed
- `body.page-explore .content { padding-top }` override -- removed (global 72px rule now applies)
- `body.page-explore.eh-sticky-visible .content` block -- removed
- `body.has-active-filter .eh-brand { margin-bottom }` -- removed

**Explore-specific overrides retained (intentional differences from other pages):**
- `body.page-explore .content { padding-left: 64px; padding-right: 64px }` -- wider horizontal padding suits the card grid
- `body.page-explore .bar-bottom-meta { display: none }` -- Explore uses the bottom meta/sort bar differently
- `body.page-explore .sort-menu { bottom: 16px }` -- sort menu anchor
- `body.page-explore .eh-type-tabs { border-bottom: none }` and `.eh-tab { margin-bottom: 0 }` -- editorial tab treatment

**Edge cases:**
- `.eh-brand-menu` CSS component styles (the base button styles for the hamburger in `.eh-brand`) remain in `styles.css`. They are now dead code since `.eh-brand-menu` is no longer in the DOM. They are harmless -- no visual or behavioural side effects. Can be removed in a future CSS audit pass
- `body.page-property .bar-left { right: 216px }` is also now dead code (no `.bar-left` on property page after the previous task). Retained for safety. Same future-audit note applies

**Files changed:**
- `app/explore.html` -- header structure replaced, `.eh-brand` block removed from content
- `app/styles.css` -- 7 Explore-specific CSS changes (5 removals, 2 updates)

---

**Recommended next step:**

Header system is now unified across all 7 pages. Possible follow-on work:
- Audit the Portfolio feature for workflow gaps similar to the Watchlist/Board/Compare triangle
- Improve Explore discovery signals (surfacing more actionable property context earlier)
- Property page header: the back-btn currently hardcodes `navigateTo('explore.html')` -- consider returning to the actual referring page if referrer context is available
- CSS audit pass: remove dead `.eh-brand-menu` component styles and `body.page-property .bar-left` override

---

## Previous Session — 2026-03-15 (Compare → Board handoff — workflow loop closed)

### Task -- Add to Board action on Compare properties (Build)

**Audit findings:**

Compare rendered a `<table>` with a `<thead>` row per property (name + type badge) and 11 `<tbody>` data rows (FanScore, trend, confidence, followers, etc.). After the table, a page-level actions row: "Save as link" and "Clear selection". Zero per-property output affordances anywhere. No way to act on analysis conclusions.

**What changed:**

`app/compare.html`:
- Added `addToBoard(slug)` function: calls `SAI_STORAGE.board.addToStage(slug, 'watching')`, then updates the matching button(s) in-place via `document.querySelectorAll('.compare-board-btn[data-slug="..."]')` -- avoids a full API re-fetch
- In `renderComparisonTable(props)`: added a "Board" row at the bottom of `<tbody>`, after all data rows, before `</tbody></table>`
  - Label cell: `compare-td-label` with text "Board" -- aligns with the label column
  - Value cells: per-property, one of:
    - Not on board: `<button class="compare-board-btn" data-slug="..." onclick="addToBoard(slug)">Add to Board</button>`
    - Already on board: `<button class="compare-board-btn compare-board-btn-active" data-slug="..." onclick="navigateTo('board.html')" title="On Board: [Stage]">On Board</button>`
- Added `.compare-board-btn` and `.compare-board-btn-active` CSS classes (semantic tokens only, mirrors `.watchlist-action-onboard` pattern)

**Design decisions:**

Row placement (bottom of `<tbody>`) chosen over:
- Header placement: would clutter the `<th>` which already has name + type badge
- Below-table placement: would break the column alignment -- the action would no longer align per-property

In-place DOM update chosen over full `updateComparison()` re-call: avoids a network round-trip for what is purely a local state change.

**Workflow chain -- now complete:**

| From | To | How |
|---|---|---|
| Watchlist | Board | "Add to Board" button -- adds to "watching" stage |
| Board | Compare | "Compare" button -- opens Compare with slot A pre-filled |
| Compare | Board | "Add to Board" in Board row -- adds to "watching" stage |

The loop is now functionally closed. A user can:
1. Save a property to Watchlist
2. Move it to Board for active evaluation
3. Open it in Compare from Board
4. Add additional comparisons from Compare back to Board
5. Navigate directly to Board from Compare via "On Board"

**Remaining gaps:**

- Compare → Watchlist: no "Add to Watchlist" from Compare. Low priority -- the Watchlist is passive tracking; if you're already comparing, you're past that stage.
- Watchlist → Compare multi-slot: the Watchlist "Compare" button only pre-fills slot A. Slots B/C require manual selection.
- Board → Compare multi-slot: same limitation -- only slot A pre-filled from a single card action.
- These are acceptable v1 constraints. Multi-slot pre-fill from external navigation would require a more complex URL construction pattern.

**Files changed:**
- `app/compare.html` -- `addToBoard()`, Board row in `renderComparisonTable()`, `.compare-board-btn` / `.compare-board-btn-active` CSS

---

**Recommended next step:**

The Watchlist / Board / Compare workflow loop is complete. Next focus should be product-level: either (a) improve the property discovery flow on Explore (surfacing more actionable signals), or (b) audit the Portfolio feature for similar workflow gaps. See DEVELOPMENT_LEDGER for the wider backlog.

---

## Previous Session — 2026-03-15 (Board → Compare handoff)

### Task -- Add Compare action to Board cards (Build)

**Audit findings:**

Board card actions before this change: `View | Move | [×]`

No path from Board to Compare existed. A property in active evaluation on the Board had no route to side-by-side analysis without navigating away manually. This was the last missing link in the Watchlist / Board / Compare workflow chain.

Compare URL param pattern (confirmed from compare.html): `compare.html?a=[slug]` pre-fills slot A. The page reads `?a=`, `?b=`, `?c=` params on load, then falls back to `sai-compare` storage. Slots B and C are left for the user to fill from the Compare selector.

**What changed:**

`app/board.html` -- `renderBoardCard()` function:
- Added Compare button between the Move dropdown and the Remove button
- `<button class="board-card-btn" onclick="navigateTo('compare.html?a=[slug]')" title="Compare in side-by-side view">Compare</button>`
- Uses the same `.board-card-btn` class and `flex: 1` layout as the View button
- No new CSS required -- existing `.board-card-btn` styles apply
- Comment updated from "View + Move dropdown + Remove" to "View + Move dropdown + Compare + Remove"

**Layout impact:**

Three `flex: 1` items (View / Move / Compare) plus the 26px `flex: 0 0 auto` remove button. Cards are `minmax(230px, 1fr)` -- tight at 230px but workable; grows naturally with column width at wider viewports. Labels are short (4 / 4 / 7 chars).

**Workflow chain -- current state:**

- Watchlist → Board: Add to Board button (added previous session). Moves slug to Board "watching" stage.
- Board → Compare: Compare button (this session). Opens Compare with slot A pre-filled.
- Compare → Board/Watchlist: no output affordances. Compare remains a pure read surface.

**Files changed:**
- `app/board.html` -- Compare button in `renderBoardCard()` actions block

---

## Previous Session — 2026-03-15 (Navigation refactor complete + Watchlist/Board/Compare audit + Add to Board feature)

### Task 1 -- Navigation refactor: nav into header bar, all 7 pages (Build)

**What changed:**

`app/styles.css`:
- `.bar-left` extended to `right: 88px; overflow: hidden` -- spans the full header width minus the right bar
- `body.page-property .bar-left { right: 216px; }` -- compensates for property page's wider bar-right (back + watchlist + divider + profile = ~167px)
- `.bar-centre` redefined from `position: fixed; top: 24px; left: 50%; transform: translateX(-50%)` to `display: flex; align-items: center; height: 100%` -- plain flex child of its parent
- `.bar-left .btn-group` override: strips border, shadow, border-radius, background; sets height 100% -- pills become flush with the header bar
- `.eh-brand .btn-group` override: same strip + explicit `height: 32px` (`.eh-brand` has auto height, not resolvable as 100%)
- `.eh-brand-menu` hide rule scoped to `@media (min-width: 641px)` only -- mobile Explore retains hamburger access
- Explore content padding reverted from hardcoded values to `var(--spacing-6xl)`
- Mobile rule cleaned of now-redundant Explore overrides

All 7 pages (`board.html`, `compare.html`, `watchlist.html`, `portfolio.html`, `opportunities.html`, `property.html`, `explore.html`):
- Standalone `<!-- CENTRE NAV BAR -->` block removed from between nav-menu and bar-right
- `bar-page-title` removed from bar-left (active chip communicates current page)
- `<nav class="bar-centre btn-group">` with 6 chips moved inside bar-left (all pages except Explore)
- Opportunities added to all dropdown right columns
- Active chip (`class="chip active"` + `aria-current="page"`) set per page
- Explore: nav placed inside `.eh-brand` after the logo SVG (bar-left hidden on Explore page)

**Verified:** Desktop layout correct across all 7 pages. Explore nav integrates cleanly into editorial header. Mobile falls back to hamburger. Property page bar-left does not overlap wider bar-right.

**Files changed:**
- `app/styles.css`
- `app/board.html`, `app/compare.html`, `app/watchlist.html`, `app/portfolio.html`, `app/opportunities.html`, `app/property.html`, `app/explore.html`

---

### Task 2 -- Watchlist / Board / Compare audit + Add to Board feature (Build)

**Audit findings:**

Three distinct surfaces, but with one broken workflow and one conceptual overlap:

- **Watchlist** (`watchlist.html`): flat passive tracking list. Actions per card: View / Compare / Remove. No path to Board.
- **Board** (`board.html`): active 4-stage kanban (watching / shortlist / evaluation / confirmed), drag-drop between stages. Actions: View / Move / Remove. No Compare action anywhere.
- **Compare** (`compare.html`): side-by-side analysis up to 3 properties (slots A/B/C), populated from URL params or `sai-compare` storage. Pure read surface -- no output affordances (no "save to Watchlist", no "add to Board").

**Gaps identified:**
1. No Watchlist → Board path. A user tracking something cannot move it into active evaluation without navigating to Board separately and manually adding it.
2. No Board → Compare path. The most carefully evaluated properties have no one-click route to side-by-side comparison.
3. Conceptual overlap: Board "watching" stage and Watchlist both represent "I'm keeping an eye on this" -- the distinction between the two features is unclear without a deliberate handoff action.

**Chosen improvement:** "Add to Board" on Watchlist cards (highest value -- resolves both the workflow gap and the conceptual overlap in one action).

**What changed:**

`app/watchlist.html`:
- Added `addToBoard(slug)` function: calls `SAI_STORAGE.board.addToStage(slug, 'watching')`, then `renderWatchlist()` to reflect the new state immediately
- `renderWatchlist()`: computes `boardStage = SAI_STORAGE.board.getSlugStage(prop.slug)` per card
  - Not on board: renders `<button ... onclick="addToBoard(slug)">Add to Board</button>`
  - Already on board: renders `<button class="watchlist-action-onboard" onclick="navigateTo('board.html')" title="On Board: [Stage]">On Board</button>` -- accent-styled, navigates to Board
- Added `.watchlist-action-onboard` CSS class: `background: var(--accent-soft); color: var(--accent); border-color: transparent` -- signals confirmed active state; semantic tokens only

**Remaining gaps (deferred):**
- Board → Compare path still absent. Adding a Compare button to Board cards is the natural next step.
- Compare has no "save to Board/Watchlist" output affordances -- pure analysis only.
- Watchlist Compare button only pre-fills slot A (`compare.html?a=[slug]`); slots B/C require manual selection on the Compare page.

**Files changed:**
- `app/watchlist.html` -- `addToBoard()`, `renderWatchlist()` board state branch, `.watchlist-action-onboard` CSS

---

**Recommended next step:**

Done in the following session -- Compare button added to Board cards, and Add to Board added to Compare columns. The Watchlist / Board / Compare workflow loop is now fully closed.

---

## Previous Session — 2026-03-15 (Final sharing-readiness audit -- full anon write lockdown, CR sign-out, gitignore hygiene)

### Task -- Final sharing-readiness audit + remaining write hardening (Build + Security + Documentation)

**Audit findings (pre-implementation):**

Three writable surfaces remained after the CR auth guard session:

- `control_room_issue_states`: anon INSERT + UPDATE open. UI sets issue acknowledged/resolved states from the CR. With CR now authenticated, anon write was redundant and exploitable (external actor could flip acknowledged states on known issue IDs).
- `control_room_log`: anon INSERT open. Append-only audit log for CR actions. External actor could inject arbitrary log rows.
- `entity_images`: anon INSERT + UPDATE open. Image scan results written here by the CR scan workflow. With CR authenticated, anon write was only needed because the CR previously ran as anon. Now redundant.

Additionally: two gitignore issues were present. `app/explore.html` was listed in `.gitignore` due to a pre-refactor state when it contained inline API keys. After the 2026-03-13 config refactor, keys moved to `app/config.js` -- `explore.html` contained no secrets and was incorrectly untracked. `_internal/` contained prototype archives (tracked in git) with the anon key embedded; though the anon key is not a true secret in the Supabase security model, the files were hygiene noise.

CR had no sign-out flow. An authenticated user could not explicitly sign out; the session would expire naturally.

**What changed:**

Supabase migration `finalise_anon_write_lockdown` (applied 2026-03-15):
- `control_room_issue_states`: anon INSERT + UPDATE + DELETE policies dropped; anon SELECT retained; authenticated retains full access.
- `control_room_log`: anon INSERT policy dropped; anon SELECT retained; authenticated retains full access.
- `entity_images`: anon INSERT + UPDATE policies dropped; anon SELECT retained; authenticated retains full access.

Full DB scan post-migration: only `email_signups` anon INSERT remains. This is intentional -- the public website signup form requires it. All other writable tables are now authenticated-only for writes.

`app/control-room.html`:
- Added `.cr-signout-btn` CSS class to styles block (semantic tokens only; compact inline button style).
- Added sign-out `<button>` to page header alongside the existing title.
- Added `crSignOut()` function: creates a transient Supabase client, calls `signOut()`, redirects to `control-room-login.html` on completion or error.

`.gitignore`:
- Removed `app/explore.html` entry (no longer contains secrets; safe to track).
- Added `_internal/` entry with explanatory comment (prototype archives, may contain historical config values from before the refactor).
- Updated comment block to clarify the current state of the config section.

**Verified (post-migration full policy scan):**

Remaining anon write access across entire database:
```
email_signups | anon_insert_email_signups | {anon} | INSERT
```
That is the complete list. All other tables: anon SELECT only (or no anon policy at all).

**Sharing-readiness conclusion:**

Ready for controlled sharing (trusted preview audience with URL).

Remaining caveats (acceptable for controlled sharing, not production-public):
1. Anon key visible in DevTools Network tab (by design in Supabase security model; RLS is the security layer). Must be backend-proxied before any production-public launch.
2. `app/ai.js` contains a hardcoded Supabase project URL (used for Edge Function calls). Not a secret -- same project URL as in config.js. No Anthropic or other sensitive keys are present anywhere in the codebase.
3. No rate limiting on `email_signups` INSERT at the DB layer (Supabase has project-level rate limits).
4. CR login requires a valid Supabase Auth user to exist in the project. First-time access requires an admin to pre-create the user or enable self-signup for the project.

**Files changed:**
- `app/control-room.html` -- `.cr-signout-btn` CSS, sign-out button in header, `crSignOut()` function
- `.gitignore` -- `app/explore.html` removed; `_internal/` added with comment
- Supabase: migration `finalise_anon_write_lockdown`
- `project-docs/DEVELOPMENT_LEDGER.md` -- Issue 2 marked FULLY HARDENED; migration row added; last-updated updated
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-15 (Control Room auth guard -- session JWT, login page, write policy tightening)

### Task -- Control Room auth guard + write hardening (Build + Security)

**Audit findings (pre-implementation):**

`control-room.html` had no auth at all. Page loaded freely for any visitor with the URL. 43 individual fetch calls all used `'Bearer ' + API_KEY` (anon key), including all INSERTs and UPDATEs to `ingestion_runs` and `ingestion_run_checklist`. The `callRPC()` helper also used the anon key.

No session variable existed. `init()` IIFE loaded all data immediately with no gate. The Supabase JS SDK was not loaded on the page -- only the raw fetch REST pattern was used.

`ingestion_runs` and `ingestion_run_checklist` had permissive anon write policies (INSERT + UPDATE + ALL respectively) because the CR used the anon key and needed table-level write permission to function.

**Current auth/write path (before this change):**

Any visitor with the CR URL could: load the page, read all ingestion runs and audit data, write new run records, overwrite run status, modify checklist items, trigger image scans, archive/delete runs -- all as the anon role.

**What changed:**

`app/control-room.html`:
- Added Supabase JS CDN `<script>` to `<head>` (before config.js)
- Added `style="visibility:hidden"` to `<main id="cr-main" class="cr-shell">` -- page stays hidden until auth confirmed
- Added `var _crToken = API_KEY;` at top of script block (safe fallback; replaced after auth)
- Restructured `init()` IIFE: non-data UI setup (theme, season default, form preview wiring) runs immediately; data loads are deferred to new `_crLoadData()` function
- Auth guard added to `init()`: creates Supabase client from `API_URL.replace('/rest/v1', '')` + `API_KEY`; calls `getSession()`; if no session redirects to `control-room-login.html`; if session found sets `_crToken = session.access_token` and reveals the page; catch block redirects on error
- All 43 instances of `'Bearer ' + API_KEY` replaced with `'Bearer ' + _crToken` (global replace)

`app/control-room-login.html` (new file):
- Minimal magic link login page. Email field, submit sends OTP via `signInWithOtp()`, redirects to `control-room.html` after auth. Same pattern as `website/investor-login.html`. Already-authenticated visitors are forwarded straight to the CR. Inline Supabase JS SDK + config.js. Light/dark theme sync from localStorage.

Supabase migration `tighten_cr_table_write_policies` (applied 2026-03-15):
- `ingestion_runs`: all policies dropped; replaced with anon SELECT only + authenticated ALL.
- `ingestion_run_checklist`: all policies dropped; replaced with anon SELECT only + authenticated ALL.

**Verified (post-migration policy state):**
```
ingestion_run_checklist | anon_read_ingestion_run_checklist     | {anon}          | SELECT
ingestion_run_checklist | authenticated_all_ingestion_run_checklist | {authenticated} | ALL
ingestion_runs          | anon_read_ingestion_runs               | {anon}          | SELECT
ingestion_runs          | authenticated_all_ingestion_runs       | {authenticated} | ALL
```

**Files changed:**
- `app/control-room.html` -- Supabase CDN, `visibility:hidden`, `_crToken`, auth guard in `init()`, `_crLoadData()`, 43 token replacements
- `app/control-room-login.html` -- new file (magic link login page)
- Supabase: migration `tighten_cr_table_write_policies`
- `project-docs/DEVELOPMENT_LEDGER.md` -- Issue 2 updated (SUBSTANTIALLY HARDENED); migration row added; CR row updated to v1.2
- `docs/WORKING_CONTEXT.md` -- this entry

**Remaining gaps:**
- `control_room_issue_states`: anon INSERT + UPDATE still open. Low-risk (no grid-breaking data possible from this table). Could be tightened in a follow-up pass now that CR sends session JWT.
- `control_room_log`: anon INSERT still open. Append-only; no data corruption possible.
- `entity_images`: anon INSERT + UPDATE retained. With CR now authenticated, these could be tightened to authenticated-only in a follow-up pass.
- The CR sign-out flow is not yet wired -- an authenticated user cannot sign out from within the Control Room. The session will expire naturally. A sign-out button could be added to the CR header in a follow-up.
- `app/config.js` still exposes the anon key in DevTools (as before). Must be backend-proxied before wider sharing -- unchanged from prior state.

**Recommended next step:**
The major open security items are now closed. The prototype is in a credible state for controlled sharing. Consider a full pre-sharing checklist: rotate any externally-seen API keys, confirm gitignore covers config.js/website/config.js, do a final Supabase policy audit, and verify the investor portal magic link flow still works end-to-end.

---

## Previous Session — 2026-03-15 (Audience filter wired on Explore -- Explore v1 filter set complete)

### Task -- Wire Audience filter on Explore page (Build)

**Audit findings (pre-implementation):**

`c.followers` is the card-level field for `total_followers_latest`, mapped in `data.js` (`followers:n(r.total_followers_latest)`). Confirmed present on all fetched card objects; null for properties with no social accounts. The Explore header had a disabled stub `<button disabled title="Coming soon">Audience</button>`. All filter plumbing (state pattern, CSS classes, outside-click, Escape, reset, isActive) was already established by Sport / Geography / Confidence -- this was a straight application of the same pattern.

**Audience data distribution (from v_property_summary_current):**

Buckets applied to `total_followers_latest`:
- Under 100k (`small`): smaller team/venue/event properties
- 100k--1M (`mid`): mid-tier series and athletes
- 1M+ (`large`): top athletes (Valentino Rossi: 8.6M, etc.) and major series

Properties with null `total_followers_latest` (no social data): excluded from all buckets. No "No audience data" option added in v1 -- clean and consistent with v1 scope.

**Decision notes:**

Audience omitted from contextual title for the same reason as Confidence: adding a 5th dimension (e.g. "Motorsport · United Kingdom · Athletes · 1M+") would be too noisy. Audience participates in `isActive` (drives Clear button and `has-active-filter` body class) but not in `parts[]`.

**What changed:**

`app/ui.js`:
- Added `_audFilter`, `_audMenuOpen`, `_AUD_BTN_LABELS` block before the Confidence filter section
- Added `openAudMenu()`, `closeAudMenu()`, `toggleAudMenu()`, `applyAud(aud)` functions
- `renderGrid()`: added audience bucket filter after confidence filter, before search
- `resetExplore()`: added `_audFilter = null`; added aud button label/active reset block
- `updateExploreContext()`: added `hasAud = !!_audFilter`; included in `isActive`

`app/explore.html`:
- Replaced disabled stub with `.aud-filter-wrap > #aud-btn + #aud-menu` (All audience sizes / Under 100k / 100k--1M / 1M+)
- Outside-click handler: added `audMenu`/`audBtn` variables and null-safe guard
- Escape handler: added `if (_audMenuOpen) closeAudMenu();`

`app/styles.css`:
- Added `.aud-filter-wrap`, `.aud-menu` (min-width: 164px), `.aud-item`, `.aud-divider` -- identical pattern to `.conf-*` and `.geo-*` blocks. No hard-coded colours; semantic tokens only.

**Verified (code review):**
- `_audFilter` initialised to null, reset in `resetExplore()`, cleared on `applyAud(null)`
- Bucket logic: `small` = `f < 100000`, `mid` = `f >= 100000 && f < 1000000`, `large` = `f >= 1000000`
- Null followers handled: `if (f == null) return false` -- null properties excluded from all buckets
- Button active state set/cleared correctly in `applyAud()` and `resetExplore()`
- `isActive` updated -- Clear button and `has-active-filter` body class both respond to audience filter state

**Files changed:**
- `app/ui.js` -- `_audFilter` state, functions, renderGrid, resetExplore, updateExploreContext
- `app/explore.html` -- dropdown HTML, outside-click handler, Escape handler
- `app/styles.css` -- `.aud-*` block
- `project-docs/DEVELOPMENT_LEDGER.md` -- Audience filter row added; last-updated bumped
- `docs/WORKING_CONTEXT.md` -- this entry

**Remaining Explore filter gaps:**
None for v1. All five filter categories now live: Type (tabs) / Sport / Geography / Confidence / Audience.

**Recommended next step:**
Control Room auth guard -- the remaining open security item. Add Supabase Auth session check to `control-room.html`, switch all CR REST fetch calls from `'Bearer ' + API_KEY` to `'Bearer ' + session.access_token`, then tighten `ingestion_runs` and `ingestion_run_checklist` to `authenticated` writes only. This closes the last known write-access exposure before wider sharing.

---

## Previous Session — 2026-03-15 (Compare page -- two new rows added)

### Task -- Improve Compare page: Followers change (30d) + Total interactions (30d) (Build)

**Audit findings (pre-implementation):**

`compare.html` `updateComparison()` fetched the following `cols`: `property_id`, `property_name`, `property_type`, `country`, `slug`, `avg_score_30d`, `trend_value_30d`, `confidence_band_30d`, `suppression_reason_30d`, `total_followers_latest`, `engagement_rate_30d_pct`, `posts_30d`, `avg_score_90d`, `sport`, `region`.

Missing from the fetch: `followers_net_30d` and `total_interactions_30d`. Both fields exist on `v_property_summary_current` and were verified populated (Valentino Rossi: followers_net_30d=10,514; total_interactions_30d=4,039,909. Gallagher Premiership Rugby: followers_net_30d=4,237; total_interactions_30d=574,369).

The Compare table row ordering before this change: FanScore 30d, FanScore 60d, FanScore 90d, Trend 30d, Confidence, Followers, Posts (30d), Engagement rate, Sport, Region. Audience depth rows were absent despite data being available.

**What changed:**

`app/compare.html` -- `updateComparison()` function:

1. `cols` query string updated to include `followers_net_30d` and `total_interactions_30d`.

2. `rows` array extended with two new entries:
   - "Followers change (30d)": signed delta with k/M shorthand (`+10.5k`, `-2.3k`), minus sign is Unicode `\u2212`, coloured via `arrC()` (positive/negative tokens). Inserted immediately after the "Followers" row.
   - "Total interactions (30d)": k/M shorthand (unsigned). Inserted immediately after the "Posts (30d)" row.

Formatting follows the same inline pattern as existing rows; no new helper functions created. `fmtFollowers` and `arrC` patterns from `data.js` replicated inline to match the compare table's local `fn`/`color` structure.

**Verified (live data query against v_property_summary_current):**
- `followers_net_30d` and `total_interactions_30d` are non-null for motorsport and rugby properties sampled.
- Valentino Rossi: 8,645,180 followers; +10,514 net; 28 posts; 4,039,909 interactions.
- Gallagher Premiership Rugby: +4,237 followers net; 574,369 interactions.

**Files changed:**
- `app/compare.html` -- `cols` query and `rows` array in `updateComparison()`
- `project-docs/DEVELOPMENT_LEDGER.md` -- Compare view row updated; last-updated line updated
- `docs/WORKING_CONTEXT.md` -- this entry

**Remaining Compare gaps:**
- No FitScore row (FitScore not yet implemented).
- No "audience overlap" or "combined reach" cross-property metric.
- No export / shareable snapshot (save-as-link covers URL state only).
- Audience filter on Explore remains the last stub filter; needs follower-count bucket threshold decisions before implementation.

**Recommended next step:**
Audience filter on Explore -- the final remaining stub. Requires one threshold decision (e.g. Under 100k / 100k--1M / 1M+) before a clean client-side implementation. All filter plumbing (pattern, CSS, reset, title logic) is now established from Sport / Geography / Confidence.

---

## Previous Session — 2026-03-14 (Control Room write-access hardening -- partial)

### Task -- Security audit + Control Room write-access hardening (Audit + Build)

**Four-area audit findings:**

Compare feature: Functional. Comparison table has FanScore 30d/90d, trend, confidence, followers, engagement, posts, sport, region. Missing `followers_net_30d` (growth delta) and `total_interactions_30d` from the fetched columns. Usable but not complete.

Property page completeness: Sections for FanScore, Audience Signals, Momentum, Ecosystem, Recent Posts all active. Key Facts has sport/region/city. No obvious critical gaps identified in audit pass.

Audience filter: Needs threshold decisions for follower-count buckets. Clean implementation once thresholds are set. Not urgent.

Control Room write-access: Most critical. `series_visibility` had `anon_all` -- any anon visitor with DevTools could corrupt the Explore grid by setting `visible = false` on all properties. `entity_images` had anon DELETE. Key discovery: `set_series_ui_visibility()` and `build_series_structure()` are both SECURITY DEFINER RPCs -- they run as the function owner and bypass RLS entirely, so the `anon_all` policy on `series_visibility` was never needed for the CR visibility toggle. Safe to remove.

**Why chosen:** `series_visibility` `anon_all` was the highest-risk gap -- directly exploitable by any visitor with DevTools, no skill required. The SECURITY DEFINER discovery made this safely implementable without breaking the CR.

**What changed:**

Migration `harden_control_room_anon_write_policies` applied:
- `series_visibility`: `anon_all` dropped. `anon_read` (SELECT only) added. CR reads the table for display (SELECT needed); all writes go through SECURITY DEFINER RPCs (no table-level write policy needed). Closes the most critical exposure.
- `entity_images`: `anon can delete entity_images` dropped. INSERT + UPDATE retained (ingestion workflow writes image mappings as anon). The CR "Dismiss suggestion" feature (deletes entity_images rows) is now broken for the admin. Acceptable trade-off; re-running image scans restores suggestions.

**Verified post-migration:**
- `series_visibility`: anon has SELECT only (anon_read policy)
- `entity_images`: anon has SELECT + INSERT + UPDATE (no DELETE)
- `ingestion_runs`: unchanged (SELECT + INSERT + UPDATE for anon)
- `ingestion_run_checklist`: unchanged (anon_all -- needed by CR checklist management)

**Remaining exposure:**
- `ingestion_runs` anon INSERT/UPDATE -- CR writes run status directly via REST using anon key
- `ingestion_run_checklist` anon ALL -- CR manages checklist items directly via REST
- Full closure requires adding Supabase Auth to `control-room.html`: load Supabase JS client, check session on load (redirect to admin login if none), pass `session.access_token` as Bearer token in all CR fetch calls, then change these two tables to `authenticated` writes only.

**Files changed:**
- Supabase: migration `harden_control_room_anon_write_policies`
- `project-docs/DEVELOPMENT_LEDGER.md` -- Issue 2 updated with exact remaining exposure; migration row added
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (Confidence filter wired on Explore -- all four filter stubs now live)

### Task -- Wire Confidence filter on Explore page (Build)

**Audit findings (pre-implementation):**

`confidence_band_30d` is a clean categorical field. Live values on visible properties:
- High: 69 (not suppressed, conf30 = 'High')
- Low: 20 (not suppressed, conf30 = 'Low')
- null: 15 (suppressed -- suppression_reason_30d = 'Insufficient data', conf30 = null)
- Medium: 5 (not suppressed, conf30 = 'Medium')

No normalisation required. Direct equality match on `c.conf30`. Suppressed/no-score properties handled as a separate 'none' bucket (`!c.conf30`).

**What changed:**

`app/ui.js`:
- Added `_confFilter = null`, `_confMenuOpen = false`, `_CONF_LABELS`, `_CONF_BTN_LABELS` (shorter labels for the button when active).
- Added `openConfMenu()`, `closeConfMenu()`, `toggleConfMenu()`, `applyConf(conf)` -- same pattern as sport and geo.
- `applyConf()`: sets `_confFilter`, updates button label and `.active` class, calls `updateExploreContext()` then `renderGrid()`.
- `renderGrid()`: confidence filter applied after geo filter, before search. 'none' bucket matches `!c.conf30`; other buckets match `c.conf30.toLowerCase() === _confFilter`.
- `resetExplore()`: added `_confFilter = null`, conf button DOM reset, `closeConfMenu()` guard.
- `updateExploreContext()`: added `hasConf = !!_confFilter` to `isActive`. Confidence intentionally omitted from the title `parts[]` array -- four-dimension titles (Sport · Geography · Confidence · Type) would be too noisy. The Clear button and `has-active-filter` body class reflect its active state correctly.

`app/explore.html`:
- Stub `<button disabled>Confidence</button>` replaced with `.conf-filter-wrap > #conf-btn + #conf-menu`. Menu items: "All confidence levels" / divider / "High confidence" / "Medium confidence" / "Low confidence" / divider / "No score".
- "No score" item uses `.conf-item--muted` modifier (dimmer text, signals secondary/edge status).
- Outside-click handler and Escape handler updated.

`app/styles.css`:
- `.conf-filter-wrap`, `.conf-menu`, `.conf-item`, `.conf-item--muted`, `.conf-divider` added. Same structural pattern as sport and geo menus. `.conf-item--muted` colours "No score" with `var(--text-3)` to signal it as a secondary option.

**Remaining filter gaps:** Audience is the only remaining stub. It requires defining follower-count buckets (thresholds not present in any existing constant). No schema changes needed.

**Files changed:**
- `app/ui.js` -- _confFilter state, menu helpers, applyConf(), renderGrid(), resetExplore(), updateExploreContext()
- `app/explore.html` -- stub Confidence button replaced; outside-click and Escape handlers updated
- `app/styles.css` -- .conf-filter-wrap, .conf-menu, .conf-item, .conf-item--muted, .conf-divider
- `project-docs/DEVELOPMENT_LEDGER.md` -- Confidence filter row added, last-updated bumped
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (Geography filter wired on Explore)

### Task -- Wire Geography filter on Explore page (Build)

**Audit findings (pre-implementation):**

Both `country` and `region` fields in the dataset are inconsistent. `country` mixes ISO codes ('GB', 'BE', 'IT', 'HK') with full country names ('Italy', 'France', 'Germany', 'Belgium', 'Spain', 'Switzerland', 'Russia', 'United Kingdom'). `region` mixes high-level labels ('Europe', 'United Kingdom', 'Asia') with sub-national values ('Cheshire', 'Kent', 'Norfolk', 'Northamptonshire', 'Leicestershire', 'Liege'). Raw equality matching on either field would produce incomplete buckets.

Decision: normalise client-side via `_getGeoBucket(c)` using `country` as primary signal, `region` as fallback. Three buckets: `'uk'` (~68 props), `'europe'` (~39 props), `'asia'` (1 prop). No schema changes required.

**What changed:**

`app/ui.js`:
- Added `_geoFilter = null`, `_geoMenuOpen = false`, `_GEO_LABELS` map.
- Added `_getGeoBucket(c)` -- normalises raw country/region into 'uk' | 'europe' | 'asia' | null. Handles ISO codes, full country names, and region-label fallbacks.
- Added `openGeoMenu()`, `closeGeoMenu()`, `toggleGeoMenu()`, `applyGeo(geo)` functions.
- `applyGeo()`: sets `_geoFilter`, updates button label and `.active` class, calls `updateExploreContext()` then `renderGrid()`.
- `renderGrid()`: geo filter applied after sport filter, before search.
- `resetExplore()`: added `_geoFilter = null`, geo button DOM reset (label + `.active`), `closeGeoMenu()` guard.
- `updateExploreContext()`: added `hasGeo = !!_geoFilter` to `isActive`; refactored title logic from paired conditionals to a `parts[]` array joined by ' · '. Order: Sport · Geography · Type (broadest to narrowest). Handles all single and combined states cleanly.

`app/explore.html`:
- Replaced stub `<button disabled>Geography</button>` with `.geo-filter-wrap > #geo-btn + #geo-menu`. Menu items: "All geographies" / divider / "United Kingdom" / "Continental Europe" / "Asia".
- Outside-click handler: added `_geoMenuOpen` + `geoMenu`/`geoBtn` guard.
- Escape handler: added `if (_geoMenuOpen) closeGeoMenu()`.

`app/styles.css`:
- Added `.geo-filter-wrap { position: relative }`, `.geo-menu` (absolute, opens downward, opacity+transform animation), `.geo-item`, `.geo-divider` -- exact structural mirror of sport menu CSS.

**Verification examples:**
- "United Kingdom" filter returns ~68 properties; contextual title shows "United Kingdom".
- "Continental Europe" + "Motorsport" sport filter: title "Motorsport · Continental Europe", ~35 properties.
- "Athletes" type + "United Kingdom" geography: title "United Kingdom · Athletes".
- Triple: Motorsport + United Kingdom + Athletes: "Motorsport · United Kingdom · Athletes".
- Reset clears both sport and geo state and restores all button labels.

**Remaining filter gaps:** Audience and Confidence remain as disabled stubs. Audience (follower count buckets) and Confidence (band buckets) both require defining cut-points on computed fields. Dataset values exist; no schema changes needed. Pure client-side filter work following the same pattern.

**Files changed:**
- `app/ui.js` -- _geoFilter state, _getGeoBucket(), menu helpers, applyGeo(), renderGrid(), resetExplore(), updateExploreContext() refactored
- `app/explore.html` -- stub Geography button replaced with real dropdown; outside-click and Escape handlers updated
- `app/styles.css` -- .geo-filter-wrap, .geo-menu, .geo-item, .geo-divider
- `project-docs/DEVELOPMENT_LEDGER.md` -- Geography filter row added to active features, last-updated bumped
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (Sport filter wired on Explore)

### Task -- Wire Sport filter on Explore page (Build)

**Audit findings (pre-implementation):**

Live sport values: `motorsport` (99 visible properties), `rugby` (13 visible properties). All 112 visible properties have a non-null sport value. The `sport` field is already fetched in `loadGrid()` and mapped onto each card object.

Existing UI: stub `<button disabled>Sport</button>` in `.eh-filter-row`. No `_sportFilter` state, no menu, no active styles.

**What changed:**

`app/ui.js`:
- Added `_sportFilter = null` state var and `_sportMenuOpen = false` flag.
- Added `_toTitleCase()` helper (capitalises each word).
- Added `openSportMenu()`, `closeSportMenu()`, `toggleSportMenu()`, `applySport(sport)` functions.
- `applySport()`: sets `_sportFilter`, updates button label and `.active` class, calls `updateExploreContext()` then `renderGrid()`.
- `renderGrid()`: sport filter applied between type filter and search filter.
- `resetExplore()`: added `_sportFilter = null`, sport button DOM reset (label + `.active` class), `closeSportMenu()` guard.
- `updateExploreContext()`: added `hasSport = !!_sportFilter` to `isActive`; updated `else if (hasFilter || hasSport)` branch to build composite title (e.g. "Motorsport · Athletes" when both active, or just "Motorsport" when type is All).

`app/explore.html`:
- Replaced stub `<button disabled>Sport</button>` with `.sport-filter-wrap` div containing real `#sport-btn` + `#sport-menu` dropdown. Menu items: "All sports", divider, "Motorsport", "Rugby".
- Outside-click handler: added `_sportMenuOpen` + `sportMenu`/`sportBtn` guard.
- Escape handler: added `if (_sportMenuOpen) closeSportMenu()`.

`app/styles.css`:
- Added `.eh-filter-btn.active` rule (accent border + accent-soft background + accent text/icon).
- Added `.sport-filter-wrap { position: relative }`, `.sport-menu` (absolute, opens downward, opacity+transform animation), `.sport-item` (matches sort-item pattern), `.sport-divider`.
- Mobile: sport button is enabled so it is NOT hidden by `.eh-filter-btn:disabled { display:none }` -- it remains visible on mobile.

**Verification:** Three overlapping filter modes all correctly compose:
- Sport alone: "Motorsport" title, 99 cards.
- Type alone: "Athletes" title, N athletes.
- Sport + type: "Motorsport · Athletes" title, intersection.
- Any combination + search: further narrows.
- Clear/Escape/outside-click all close the menu.
- Reset clears sport state and restores button label.

**Remaining filter gaps:** Geography, Audience, Confidence remain as disabled stubs. Geography would require `region`/`country` multi-select. Audience and Confidence require computed bucketing. All dataset values exist; no schema changes needed.

**Files changed:**
- `app/ui.js` -- sport filter state, menu helpers, applySport(), renderGrid(), resetExplore(), updateExploreContext()
- `app/explore.html` -- stub Sport button replaced with real dropdown; outside-click and Escape handlers updated
- `app/styles.css` -- .eh-filter-btn.active, .sport-filter-wrap, .sport-menu, .sport-item, .sport-divider
- `project-docs/DEVELOPMENT_LEDGER.md` -- Sport filter row added to active features table, last-updated bumped
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (social metrics unblocked -- anon_read on raw social tables)

### Task -- Security/product audit: highest-value next task identification and implementation (Audit + Build)

**Audit findings:**

Security track: All tables have RLS enabled. Anthropic API key properly proxied through Edge Function. Core data tables (properties, fanscore_*, property_relationships) have correct anon_read policies. One residual gap: control room tables (ingestion_runs, entity_images, series_visibility, control_room_*, ingestion_run_checklist) have overly permissive anon policies (INSERT/UPDATE/DELETE). Acceptable for trusted-investor prototype; must tighten before broader sharing.

Product track: `v_property_summary_current` and `v_property_posts` are SECURITY INVOKER views. Supabase uses this as default. When `anon` queries these views, all JOINs to the underlying raw tables execute as the `anon` role. Five tables -- `accounts`, `raw_account_followers`, `raw_posts`, `raw_post_daily_metrics`, `property_platform_daily_metrics` -- had RLS enabled but NO SELECT policies for anon. Result: every social field in the view (total_followers_latest, followers_net_30d, posts_30d, total_interactions_30d, engagement_rate_30d_pct, platforms_active) silently returned null for all properties. Downstream effects: `computeMomentumScore()` returned [] everywhere (no momentum badges), AI system prompt showed 0 for all social context, no audience numbers on cards.

This was the highest-value issue on both tracks -- a silent data loss affecting the entire social signal layer, not a feature gap.

**What changed:**

Migration `anon_read_social_tables` applied. Added `FOR SELECT TO anon USING (true)` policies on: `accounts`, `raw_account_followers`, `raw_posts`, `raw_post_daily_metrics`, `property_platform_daily_metrics`. No view or app code changes required.

**Verification:** v_property_summary_current now returns real data for all sampled properties. Valentino Rossi: 8.6M followers, 30.5k net 30d, 13.4% engagement, platforms [instagram, x, youtube]. Premiership Rugby: 804k followers, 56.6% engagement. British GT: 544k followers. Platform arrays and follower deltas all populated correctly.

**Remaining gaps:** Control room table write access (anon can INSERT/UPDATE on operational tables -- acceptable for prototype, tighten before public sharing). Issues 7 (MODEL_VERSION hardcoded in ui_data_layer.ts) and 8 (isSupressed typo) remain; TypeScript layer inactive.

**Next recommendation:** With social data now live, the most visible remaining product gap is the stub Sport/Geography/Audience filter buttons in Explore. The dataset has real sport and region values on every property. Wiring at least the Sport filter would make multi-sport positioning immediately demonstrable.

**Files changed:**
- Supabase: migration `anon_read_social_tables` -- 5 anon SELECT policies applied
- `project-docs/DEVELOPMENT_LEDGER.md` -- issue 2 scope narrowed, issue 9a added (RESOLVED), security next-steps updated
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (master schema full consolidation -- issue 20 closed)

### Task -- Rebuild correctness: fold all remaining table shape drift into 001_master_schema.sql (Audit + Build)

The master schema still had significant drift from the live DB across the base tables. Six tables had missing columns, the enum had 3 missing values, and 8 indexes were absent. Running the schema from scratch would produce a database with incorrect shapes for all core tables.

**Audit findings:**

Drift identified across 6 tables and the `property_type_enum`. All drift confirmed by direct column-count query against live DB.

`property_type_enum`: master had 4 values (`driver, team, series, event`). Live DB has 7. Missing: `athlete`, `venue`, `governing_body`.

`properties`: master had 8 columns. Live DB has 19. Missing 11: `sport`, `slug`, `country_code`, `city`, `region`, `latitude`, `longitude`, `event_end_date`, `metadata` (jsonb DEFAULT '{}'), `visible_in_ui` (boolean NOT NULL DEFAULT false), `hidden_reason`.

`fanscore_windows`: missing `suppression_reason text` (added by migration 008; function body was fixed in previous task but CREATE TABLE definition had not been updated).

`accounts`: missing `platform_user_id text`.

`raw_posts`: missing `platform_post_id text`.

`raw_account_followers`: missing `is_estimated boolean NOT NULL DEFAULT false` and `data_source text NOT NULL DEFAULT 'api'`.

`fanscore_daily`: already correct (had `suppression_reason`; no changes needed).

Indexes missing from Section 3: `properties_slug_unique` (unique), `idx_properties_property_type`, `idx_properties_slug`, `idx_properties_sport`, `idx_properties_visible_in_ui`, `idx_accounts_platform_user_id`, `uq_raw_posts_account_platform_post`, `idx_raf_is_estimated`.

**What changed:**

`database/001_master_schema.sql`:
- `property_type_enum` DO block: expanded to 7 values. Comment added explaining that on existing DB the IF NOT EXISTS makes it a no-op; on clean rebuild all 7 values created in one pass.
- `properties` CREATE TABLE: 11 columns added in a labelled "Extended property fields" block with per-column migration attribution.
- `accounts` CREATE TABLE: `platform_user_id text` added.
- `raw_posts` CREATE TABLE: `platform_post_id text` added.
- `raw_account_followers` CREATE TABLE: `is_estimated boolean NOT NULL DEFAULT false` and `data_source text NOT NULL DEFAULT 'api'` added.
- `fanscore_windows` CREATE TABLE: `suppression_reason text` added.
- Section 3 indexes: reorganised by table group; 8 new indexes added.

**Verification:** Column counts queried against live DB and matched exactly -- properties: 19, accounts: 10, raw_posts: 10, raw_account_followers: 8, fanscore_daily: 12, fanscore_windows: 15.

**Remaining gaps:** Tables added entirely by architectural migrations after the base schema (property_relationships, series_visibility, entity_images, ingestion_runs, control_room_log, control_room_issue_states, ingestion_run_checklist, email_signups, investor_allowlist, v_property_posts) are not in 001_master_schema.sql. This is intentional -- they are architectural additions, not base table corrections. A full rebuild still requires those migrations after the base schema.

Open issues: 7 (`MODEL_VERSION` hardcoded in `ui_data_layer.ts`) and 8 (`isSupressed` typo) remain; TypeScript layer is inactive.

**Files changed:**
- `database/001_master_schema.sql` -- enum, 6 table definitions, indexes section
- `project-docs/DEVELOPMENT_LEDGER.md` -- issue 20 RESOLVED; next-steps updated
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (compute_fanscore_windows suppression_reason gap -- master schema sync)

### Task -- Rebuild correctness: compute_fanscore_windows missing suppression logic (Audit + Build)

The master schema (`001_master_schema.sql`) held the pre-migration-008 definition of `compute_fanscore_windows`. The live DB was already correct (migration `008_fix_fanscore_windows_suppression` had been applied). A schema rebuild from repo would produce a function that never writes `suppression_reason` to `fanscore_windows`, breaking the UI suppression signal for the window layer.

**Audit findings:**

Six differences between the repo and live function definitions:

1. `suppression_reason` missing from INSERT column list.
2. `suppression_reason` CASE expression (`< 60% days scored → 'Low data coverage...'`) absent from SELECT.
3. `suppression_reason = EXCLUDED.suppression_reason` absent from ON CONFLICT DO UPDATE.
4. WHERE clause included `AND fd.fanscore_value IS NOT NULL` -- incorrect because suppressed rows (where `fanscore_value IS NULL`) must be included so `anomaly_days_count` counts them.
5. `REGR_SLOPE` used `EXTRACT(EPOCH FROM fd.metric_date - ...)` instead of `::float8` casts on both args.
6. `confidence_band` CASE lacked a leading `WHEN completeness < 0.6 THEN 'Low'` guard (without this, a 50%-coverage property could fall through to `Medium`).

**What changed:**

`database/001_master_schema.sql` -- `compute_fanscore_windows` function body replaced with the live migration 008 version. All six differences corrected. A comment block above the function lists the four key changes for future readers.

No new Supabase migration was needed. The live DB is already correct.

**Verification:** Live function body from `pg_get_functiondef` matches the repo function body after edit. `suppression_reason` present in INSERT, SELECT, and ON CONFLICT UPDATE in both. WHERE clause no longer filters `fanscore_value IS NOT NULL`. `REGR_SLOPE` uses `::float8` casts. Confidence band CASE has leading `< 0.6` guard.

**Remaining gaps:** None new. Previously known open items: issue 7 (`MODEL_VERSION` hardcoded in `ui_data_layer.ts`), issue 8 (`isSupressed` typo), issue 20 (migrations 006-007 not consolidated into master schema -- enum + column additions).

**Files changed:**
- `database/001_master_schema.sql` -- `compute_fanscore_windows` function body replaced
- `project-docs/DEVELOPMENT_LEDGER.md` -- issue 6 marked RESOLVED; issue 20 scope narrowed; next-steps bullets updated
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (v_property_summary_current schema aligned; PropertyType corrected)

### Task — Schema/interface correctness: v_property_summary_current divergence (Audit + Build)

The master schema (`001_master_schema.sql`) contained the pre-migration definition of `v_property_summary_current` using old column aliases. The TypeScript layer (`ui_data_layer.ts`) was correctly written against the live view. This created a documentation and rebuild correctness gap: anyone building from the master schema would get a view with different column names from what the TypeScript expects.

**Audit findings:**

Master schema view used: `p.name` (unaliased), `latest_fanscore`, `latest_confidence_band`, `latest_confidence_value`, `latest_score_date`, `components_json`, `reasons`, `suppression_reason`, `avg_30d`, `trend_30d`, `volatility_30d`, `avg_60d`, `avg_90d`, `trend_90d`. Also referenced removed helper views `v_fanscore_daily_current` / `v_fanscore_windows_current` that no longer exist.

Live view uses: `property_name`, `as_of_day`, `model_version`, `avg_score_30d`, `median_score_30d`, `trend_value_30d`, `volatility_value_30d`, `completeness_pct_30d`, `confidence_band_30d`, `confidence_value_30d`, `suppression_reason_30d`, `avg_score_60d`, `avg_score_90d`, `trend_value_90d` -- plus social aggregations, relationship arrays, bio, slug, sport/region/city, visible_in_ui, and a WHERE clause filtering event occurrences.

TypeScript `PropertyType` was `'driver' | 'team' | 'series' | 'event'` -- missing `'athlete' | 'venue' | 'governing_body'` which exist in the live `property_type_enum`.

**What changed:**

`database/001_master_schema.sql` -- view definition replaced with the live state. Old helper view references removed. All column aliases now match the live DB and the TypeScript layer exactly. Two example queries in the comment block updated (`name` → `property_name`, `latest_fanscore` → `avg_score_30d + suppression_reason_30d IS NULL`, `trend_30d` → `trend_value_30d`).

`database/ui_data_layer.ts` -- `PropertyType` union expanded with `'athlete' | 'venue' | 'governing_body'` and a comment noting the live enum extension.

**Remaining gaps:** `toWin(v, '60d')` and `toWin(v, '90d')` in `getPropertyDetail` reference 13 columns the view intentionally doesn't expose for those windows (the view provides only `avg_score_60d` and `avg_score_90d` + `trend_value_90d`). At runtime this silently produces null for those fields -- no crash, but `PropertyDetail.win60d` and `.win90d` are partially-populated. This is a design gap in the view, not a naming error. Resolving it would require either expanding the view or narrowing the `PropertyDetail` types. Neither is urgent while the TypeScript layer is inactive.

Also still open: `MODEL_VERSION = 'v1.0'` hardcoded in `ui_data_layer.ts` (issue 7), and `isSupressed` typo in both interfaces (issue 8).

**Files changed:**
- `database/001_master_schema.sql` -- view definition + example queries updated
- `database/ui_data_layer.ts` -- `PropertyType` expanded

---

## Previous Session — 2026-03-14 (FanScore fully model-driven -- active model version selection in recompute flow)

### Task — FanScore model version hardcoding in recompute flow (Audit + Build)

After the previous session fixed weight hardcoding inside `compute_fanscore_daily`, the remaining gap was that `build_series_structure` still passed the literal `'v1.0'` to both `compute_fanscore_daily` and `compute_fanscore_windows`. The scoring pipeline was therefore dynamic on weights but still static on version selection.

**Audit findings:**

`build_series_structure` has one scoring block, in the premiership-rugby template path under `IF p_synthetic_signals THEN`. Two hardcoded literals found: `PERFORM compute_fanscore_daily(v_data_start, v_data_end, 'v1.0')` and `PERFORM compute_fanscore_windows(v_data_end, 'v1.0')`. The GTWCE template path has no scoring pipeline calls. No other hardcoded version literals found in any other function.

**What changed:**

Migration `fanscore_active_model_version_in_recompute` applied. Two objects created/modified:

`get_active_fanscore_model_version() RETURNS text STABLE` -- new helper function. Reads `model_version FROM fanscore_models WHERE is_active = true LIMIT 1`. RAISE EXCEPTION with clear message if no active model found. Granted to anon and authenticated. This function is the single point of truth for active model selection and can be reused by any future functions.

`build_series_structure` -- patched via DO block using `pg_get_functiondef` + string replacement + `EXECUTE`. Target strings verified present before replacement (guard: RAISE EXCEPTION if not found). Changes: `v_model_version text` added to DECLARE section. Scoring block now reads: `v_model_version := get_active_fanscore_model_version();` then passes `v_model_version` to both PERFORM calls. No other logic touched. GRANTs preserved (CREATE OR REPLACE does not revoke existing grants).

**Verification:** `get_active_fanscore_model_version()` returns `v1.0`. Structural checks: `still_has_daily_hardcode: false`, `still_has_windows_hardcode: false`, `has_model_version_var: true`, `calls_helper: true`. Score check: re-ran `compute_fanscore_daily` and `compute_fanscore_windows` for 2026-03-13. All 5 sampled properties (bath-rugby, gt-world-challenge-europe, harlequins, manthey-ema, premiership-rugby) showed identical `fanscore_value` and `inputs_hash` to pre-run snapshot.

**Remaining gaps:** `MODEL_VERSION = 'v1.0'` in `database/ui_data_layer.ts` (issue 7 in ledger) is still hardcoded, but the TypeScript data layer is not in active use. No other hardcoded model version references remain in the active scoring pipeline.

**Files changed:**
- Supabase: migration `fanscore_active_model_version_in_recompute` -- `get_active_fanscore_model_version()` created; `build_series_structure` patched
- `project-docs/DEVELOPMENT_LEDGER.md` -- issue 4 marked FULLY RESOLVED; migration table updated
- `docs/WORKING_CONTEXT.md` -- this entry

---

## Previous Session — 2026-03-14 (FanScore model-driven weights)

### Task — FanScore model correctness (Audit + Build)

`compute_fanscore_daily` was computing scores using literals `0.65`, `0.15`, `0.20` hardcoded directly into the SQL. The `fanscore_models` table existed with a `weights_json` column and a correctly populated v1.0 record, but the function never read from it. Changing the stored weights had no effect on computed scores.

**Audit findings:**

`compute_fanscore_daily(p_start_date, p_end_date, p_model_version)` -- the `p_model_version` parameter was used only to tag output rows. The weight literals appeared in two places: the score formula (`0.65*norm + 0.15*growth + 0.20*consistency`) and the `components_json` explainability output (`'weight', 0.65` etc). `fanscore_models` table: one active record, version `v1.0`, `weights_json: { norm_weight: 0.65, growth_weight: 0.15, consistency_weight: 0.20 }` -- exact match to the hardcoded literals, meaning no historical score divergence.

`build_series_structure` RPC: calls `compute_fanscore_daily(..., 'v1.0')` and `compute_fanscore_windows(..., 'v1.0')` with the version as a string literal. Separate gap; not addressed in this task (see remaining gaps).

`MODEL_VERSION = 'v1.0'` in `database/ui_data_layer.ts`: TypeScript data layer not yet in active use; logged as issue 7 in the ledger.

**What changed:**

Migration `fanscore_model_driven_weights` applied. `compute_fanscore_daily` rewritten via `CREATE OR REPLACE FUNCTION`. Three declared variables `v_norm_w`, `v_growth_w`, `v_consistency_w` (numeric). At start of BEGIN: `SELECT weights_json INTO v_weights FROM fanscore_models WHERE model_version = p_model_version`. Two guards: RAISE EXCEPTION if model not found (NULL weights_json), RAISE EXCEPTION if any weight key is missing. Variables used in score formula and in `components_json` weight fields. All other logic (daily_agg, windowed CTEs, confidence band/value, reasons, suppression, inputs_hash, ON CONFLICT) preserved identically.

**Verification:** Re-ran `compute_fanscore_daily('2026-03-13', '2026-03-13', 'v1.0')`. Spot-checked 4 properties (gt-world-challenge-europe, manthey-ema, team-wrt, valentino-rossi). All `fanscore_value` and `inputs_hash` values identical to pre-run snapshot. `components_json` weight fields confirmed populated from model. Error guard confirmed: calling with `'v99.0'` wrote zero rows.

**Remaining gaps:** `build_series_structure` still passes the literal `'v1.0'` to both compute functions. When a second model version is activated, the Control Room recompute flow will still use v1.0 weights unless that RPC is updated. Recommended fix when needed: replace `'v1.0'` literals in `build_series_structure` with `(SELECT model_version FROM fanscore_models WHERE is_active = true LIMIT 1)`.

**Files changed:**
- Supabase: migration `fanscore_model_driven_weights` -- `compute_fanscore_daily` function replaced
- `project-docs/DEVELOPMENT_LEDGER.md` -- issue 4 marked RESOLVED; migration table updated

---

## Previous Session — 2026-03-14 (GTWCE data resilience -- full creation seed added)

### Task — GTWCE data resilience (Audit + Build)

Seven GTWCE migrations were applied directly to the live database during 2026-03-13 without corresponding SQL files tracked in the repo. The existing `database/seeds/gtwce_2024.sql` was a repair-only script (corrects country/region fields) and contained no INSERT statements. If the database were dropped and rebuilt, the entire GTWCE dataset would be lost.

**Audit findings:**

- 7 migrations tracked in Supabase migration log with no SQL bodies in repo: `gtwce_core_properties`, `gtwce_relationships`, `gtwce_social_accounts_and_followers`, `gtwce_posts_and_metrics`, `gtwce_x_posts_for_completeness`, `gtwce_missing_athlete_posts`, `gtwce_presentation_data_repair`
- `database/seeds/gtwce_2024.sql` confirmed as repair-only (UPDATE statements only; will EXCEPTION if run on an empty DB)
- Live DB verified as complete and healthy: 1 series + 1 governing body + 7 teams + 10 events + 8 venues + all athlete relationships + 43 social accounts + 91-day follower history on all accounts + posts and metrics

**What changed:**

`database/seeds/gtwce_2024_full.sql` -- New file. Complete, idempotent creation seed. Three PL/pgSQL DO blocks:

Block 1 (`$gtwce_core$`): All property INSERTs (series, governing body, 7 teams, 10 GTWCE-only athletes, 10 events, 8 venues). All relationship INSERTs (governing_body_oversees_series, series_has_team, team_competes_in_series, team_has_athlete, athlete_belongs_to_team, athlete_competes_in_series, series_contains_event, event_at_venue). All 43 social account INSERTs. series_visibility INSERT. All use ON CONFLICT DO NOTHING.

Block 2 (`$gtwce_followers$`): PL/pgSQL loop over all GTWCE-linked accounts. Generates 91-day synthetic follower history (2025-12-13 to 2026-03-13). Deterministic daily deltas via `hashtext()`. Accounts with 0-baseline started at 12,000-30,000 to ensure FanScore pipeline can score them. ON CONFLICT (account_id, metric_date) DO NOTHING.

Block 3 (`$gtwce_posts$`): PL/pgSQL generating synthetic posts with deterministic `platform_post_id` pattern. Posts spread evenly across 91-day window. Engagement metrics scaled by property type. Per-post `raw_post_daily_metrics` row. CONTINUE WHEN EXISTS guard for idempotency.

**Verified against live DB:** All entities, relationships, accounts, follower rows, and posts confirmed present. Schema mismatches (enum names, column names) resolved during build. series_visibility table is currently empty on live DB -- the seed will populate it on next run. This is a pre-existing gap from the original migrations, not introduced by this work.

**Remaining gaps:** Real post content is synthetic (captions are template strings). Exact engagement figures from the original migrations are not recoverable -- the seed regenerates them deterministically. This is acceptable for rebuild purposes; the FanScore pipeline will re-derive scores from the regenerated signals.

**Follow-up applied (same session):** `series_visibility` row for `gt-world-challenge-europe` (`ready_for_ui: true, visible_in_ui: true`) inserted directly to live DB 2026-03-14. Verified present. No remaining GTWCE data gaps.

**Files changed:**
- `database/seeds/gtwce_2024_full.sql` (new)
- `project-docs/DEVELOPMENT_LEDGER.md` (issue 21 marked RESOLVED, migration table updated)

---

## Previous Session — 2026-03-14 (Investor portal auth -- magic link flow replaces hardcoded credentials)

### Task — Investor portal authentication (Build)

The investor portal login was protected only by hardcoded credentials (`investor / SponsorAI2026`) checked entirely in client-side JS. The session was set via `localStorage.setItem('sponsorai_investor', '1')`, trivially bypassed from DevTools. The portal email signup form was also a `simulateSuccess()` stub.

**Root cause:** Placeholder auth shim used for early prototype sharing, never replaced.

**What changed:**

Supabase — Applied migration `create_investor_allowlist`. New table `public.investor_allowlist` with columns: `id` (uuid PK), `email` (text, unique on `lower(email)`), `created_at` (timestamptz). RLS enabled. Policy `auth_select_own_row`: authenticated users can SELECT only the row matching their own email (`lower(email) = lower((auth.jwt() ->> 'email'))`). Anon role explicitly revoked.

`website/config.js` (gitignored) -- Added `WEBSITE_SUPABASE_URL` (base URL without `/rest/v1`). Required by the Supabase JS Auth client.

`website/config.example.js` (tracked) -- Added `WEBSITE_SUPABASE_URL` placeholder with documentation comment. Updated `WEBSITE_API_KEY` comment to reflect investor portal usage.

`website/investor-auth.js` -- Completely rewritten. Hardcoded credentials and localStorage session flag removed entirely. New flow: initialises `window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)`. Portal guard: calls `getSession()` -- if no session, redirects to login. If session exists, queries `investor_allowlist` (RLS-enforced, returns own row or nothing) -- if no row, signs out and redirects to login with `?reason=not_authorised`. If row found, sets `body.style.visibility = 'visible'` and wires portal signup form. Login page: email-only form, validates email, calls `signInWithOtp({ email, options: { emailRedirectTo: investor-portal.html } })`, shows "Check your inbox" state on success. Sign-out: `supabase.auth.signOut()` then redirect. Portal signup form: real Supabase REST POST to `email_signups` with `source: 'investor-portal'`, matching behaviour of `website/script.js`.

`website/investor-login.html` -- Username + password form replaced with single email field. Button label: "Send sign-in link". New `#loginSent` div (hidden by default) shows "Check your inbox" and expiry note after magic link is dispatched. Supabase CDN + config.js loaded before `investor-auth.js`.

`website/investor-portal.html` -- Added `style="visibility:hidden"` to `<body>`. Supabase CDN + config.js loaded before `investor-auth.js`.

**To add an investor:** Insert a row manually via Supabase dashboard → Table Editor → `investor_allowlist`. The email must exactly match the address the investor will use to request the magic link (case-insensitive via the unique index).

**To view portal signups:** `SELECT * FROM email_signups WHERE source = 'investor-portal' ORDER BY created_at DESC;`

**Files changed:**
- `website/investor-auth.js`
- `website/investor-login.html`
- `website/investor-portal.html`
- `website/config.js` (updated, gitignored)
- `website/config.example.js` (updated, tracked)
- Supabase: `investor_allowlist` table + RLS policy

---

## Previous Session — 2026-03-14 (Email capture fix -- website signups now stored in Supabase)

### Task — Email capture (Build)

Every website signup was being silently discarded. `simulateSuccess()` showed a success message and logged to the console but sent no data anywhere.

**Root cause:** `website/script.js` had a `TODO` comment where the backend call should go, with a `simulateSuccess()` shim in its place. No table existed in the database to receive signups.

**What changed:**

Supabase — Applied migration `create_email_signups`. New table `public.email_signups` with columns: `id` (uuid PK), `email` (text, unique on `lower(email)`), `source` (text, default `'website'`), `created_at` (timestamptz). RLS enabled. Two policies: `anon_insert_only` (anon role, INSERT, no restrictions) and `auth_select_all` (authenticated role, SELECT). Anon users can add rows but cannot read them. Admin can view all signups via Supabase dashboard or authenticated queries.

`website/config.example.js` (new, tracked) -- Template for website credentials. Exposes `WEBSITE_API_URL` and `WEBSITE_API_KEY`. Documents where to find values in Supabase dashboard.

`website/config.js` (new, gitignored) -- Live credentials. Loaded before `script.js`.

`website/index.html` -- Added `<script src="config.js"></script>` before `script.js`.

`website/script.js` -- Replaced `simulateSuccess()` shim with a real `submitSignup(email)` function that POSTs `{ email, source: 'website' }` to Supabase REST `/email_signups`. Handles: 200 success, 409/23505 duplicate (treated as silent success -- user is already on the list), network offline, missing config (dev fallback with console warning). No silent failures.

`.gitignore` -- Added `website/config.js`.

**Verified:** Test insert confirmed rows write correctly. RLS policies confirmed via `pg_policies` query. Test row deleted after verification.

**To view signups:** Supabase dashboard → Table Editor → email_signups. Or via SQL: `SELECT * FROM email_signups ORDER BY created_at DESC;` (requires authenticated session).

**Files changed:**
- `website/script.js`
- `website/index.html`
- `website/config.js` (new, gitignored)
- `website/config.example.js` (new, tracked)
- `.gitignore`
- Supabase: `email_signups` table + RLS policies

---

## Previous Session — 2026-03-14 (Market Board -- Kanban opportunity tracking workspace)

### Task — Market Board (Build)

Built the Market Board: a Kanban-style workspace where users can collect, organise, and evaluate sponsorship opportunities across four stages.

**What changed:**

`app/storage.js` — Added `makeBoard('sai-board')` factory inside the SAI_STORAGE IIFE. Returns a `board` module with: `getBoard()`, `getAllSlugs()`, `getStage(stage)`, `getSlugStage(slug)`, `isOnBoard(slug)`, `addToStage(slug, stage)` (auto-removes from previous stage), `moveToStage()` (alias), `removeFromBoard(slug)`. Stages: `watching | shortlist | evaluation | confirmed`. SAI_STORAGE.board now exported alongside watchlist/portfolio/compare.

`app/board.html` — New page. Four-column Kanban layout. Fetches all board slugs across stages in a single API call. Cards show: drag handle, name, flag, type badge, sport, FanScore (type-coloured), trend arrow, audience. Drag-and-drop via HTML5 native drag events (dragstart/dragover/drop/dragend). Move dropdown on each card for non-drag stage changes. Remove button. Empty column state: "Drop a card here". Board state persisted in localStorage. Follows standard SponsorAI chrome (float bars, nav, profile dropdown).

`app/components/panel.js` — Added `dp-btn-board` button to the dpActions section. Reads `SAI_STORAGE.board.isOnBoard(slug)` + `getSlugStage()` to set initial state and label. `dpAction('board', id)` handler: adds to 'watching' stage if not on board; removes if already on board.

`app/property.html` — Added "Add to Board" button to `prop-actions` row with board/column icon. `toggleBoard()` / `updateBoardButton()` functions wired. `updateBoardButton()` called at page load alongside `updateWatchlistButton()`. Shows stage label when on board (e.g. "Watching", "Shortlist").

Nav updated on: `explore.html`, `watchlist.html`, `portfolio.html`, `compare.html`, `property.html` -- Board button added to menu col 2 below Watchlist.

**Files changed:**
- `app/storage.js`
- `app/board.html` (new)
- `app/components/panel.js`
- `app/property.html`
- `app/explore.html` (nav)
- `app/watchlist.html` (nav)
- `app/portfolio.html` (nav)
- `app/compare.html` (nav)

---

## Previous Session — 2026-03-14 (Build audit + sparklines on Explore cards)

### Build audit (Audit mode)

Full audit of data completeness, FanScore pipeline, Watchlist/Compare/Portfolio, property page, and search/filter quality. Key findings:

- Data completeness: In good shape for the ingested series. Suppressed properties are intentional. GTWCE dataset is live-DB-only (no seed file -- rebuild risk). Athlete portraits pending (11 properties). No urgent user-facing data completeness fix required.
- FanScore recompute: Works via Control Room "Run again". Critical issue: weights hardcoded in SQL, not read from `fanscore_models.weights_json`. Not user-visible yet. Backend fix deferred.
- Watchlist/Compare/Portfolio: All three pages functional and wired to SAI_STORAGE. No broken behaviour. Enhancement opportunities (sparkline on watchlist items, image on watchlist rows) deferred -- not the highest-value next step.
- Property page: Active with FanScore card, sparkline, audience signals, momentum chart, ecosystem, recent posts. No critical gaps identified.
- Search/filter: Debounced keyword search, type filters, sort options all active. No urgent improvements needed.

Chosen build target: sparklines on Explore cards. Highest ROI -- data already in memory, renderer already exists, zero API calls, directly adds momentum signal to the primary discovery surface.

### Task — Sparklines on Explore cards (Build)

Added 30-day FanScore history sparkline to the bottom of each non-suppressed card in the Explore grid.

**What changed:**

`app/components/card.js` — In `renderCard()`, after the `sup-notice`, an IIFE checks `sup`, `c.sparks`, and `c.sparks.length`. If at least 2 data points exist and the card is not suppressed, calls `renderSpark(c.sparks, cfg.scoreVar, 120, 28)` and wraps the result in `<div class="card-spark">`. The sparkline is coloured using the card type's `scoreVar` token (matches the score number above it), making each type visually consistent.

`app/styles.css` — Added `.card-spark { margin-top: auto; padding-top: var(--spacing-lg); opacity: 0.7; }` and `.card-spark .spark-svg { width: 100%; height: 28px; display: block; overflow: visible; }`. `margin-top: auto` in the flex column pushes the sparkline to the bottom of every card regardless of content height above it. Added `.card-grid.list .card-spark { display: none; }` to suppress it in list view where cards are horizontal strips.

**Files changed:**
- `app/components/card.js`
- `app/styles.css`

---

## Previous Session — 2026-03-14 (Control Room UX: readiness panel + entity viewer + view changes + Explore in-page header)

### Task 1 — Explore: in-page header (Build)

Moved search bar and filter chips from fixed floating positions into an in-page `.explore-header` block inside `.page-header`. Reduces content padding-top from 232px to 88px. Added title "Explore sports properties" above the search bar.

**Files changed:**
- `app/explore.html` — removed fixed bar, added `<div class="explore-header">` with title, search, and chips
- `app/styles.css` — `.page-header` changed from `display:none` to `display:block`; `.content` padding-top reduced; `.search-bar` changed from fixed to in-page; new `.explore-header`, `.eh-title`, `.eh-filters` styles; responsive rules updated

### Task 2 — Explore: `/` keyboard shortcut (Build)

Pressing `/` outside an input field focuses the search bar.

**Files changed:**
- `app/explore.html` — keydown listener added after existing Escape listener

### Task 3 — Overlay: "Open full property profile" CTA (Build)

Added a prominent `<a>` link at the very bottom of the property detail overlay panel navigating to `property.html?slug={slug}`.

**Files changed:**
- `app/components/panel.js` — section 11 added after posts section
- `app/styles.css` — `.dp-profile-cta`, `.dp-profile-cta-link` styles added

### Task 4 — Watchlist + Portfolio empty states (Build)

Replaced minimal/blank empty states with explanatory copy.

Watchlist: "Your watchlist is empty" / "Add properties from Explore to track their momentum."
Portfolio: "Your portfolio is empty" / "Add properties to start tracking potential sponsorship opportunities."

**Files changed:**
- `app/watchlist.html`
- `app/portfolio.html`

### Task 5 — Control Room: Series Readiness panel (Build)

Added a readiness sub-row behind each series run row. Toggled via "Readiness" in the row action menu. Shows four metrics: Entities with bios, FanScore coverage, Images, Visibility. Each metric is colour-coded: green (ok), amber (gap), neutral.

Readiness data added to `SERIES_STATUS` entries as `readiness: { entities_total, entities_bios, fanscore_count, images_count, visible }`.

**Files changed:**
- `app/control-room.html` — `SERIES_STATUS` data; `renderStatus()` readiness row; `crReadinessMetric()`, `toggleReadiness()` helpers; CSS for `.cr-readiness-*`

### Task 6 — Control Room: Entity Viewer modal (Build)

"View entities" in the row action menu opens a modal listing all properties in that series. Queries Supabase via the same `property_relationships` pattern used by `loadImagesSection`. Shows entity name, slug, type, FanScore (most recent 30d window), image status (confirmed entity_images or images.js fallback), and visibility badge.

**Files changed:**
- `app/control-room.html` — entity-modal HTML; `viewEntities()`, `closeEntityModal()` functions; `.cr-modal-wide` CSS

### Task 7 — Control Room: View Changes modal (Build)

"View changes" in the row action menu (present when a run_id exists) opens a summary of what the run actually changed. Data source: `control_room_log` rows for the run_id + `ingestion_runs` row for counts.

Classification is best-effort (log messages are human-readable text, not structured records). Structure builder summary line is parsed for created/updated/relationship counts. Other entries are classified by message pattern: Checklist/visibility changes go to "Updated", error-tagged rows go to "Errors". Entries that do not match any pattern are omitted. Older runs with no classifiable entries show an explicit "Structured change data is incomplete" message rather than a blank or fabricated list.

**Files changed:**
- `app/control-room.html` — changes-modal HTML; `viewChanges()`, `closeChangesModal()`, `stat()`, `changeGroup()` functions; CSS for `.cr-change-*`

---

## Last Session — 2026-03-14 (Explore — keyword search + Load More footer refinement)

### Task 1 — Load More footer refinement (Build)

Aligned the Explore page with a calm Dribbble/Bloomberg-style browsing pattern. Footer is now always reachable.

**Files changed:**
- `app/ui.js` — renamed "Load more" button to "Load More Properties"
- `app/explore.html` — added `<footer class="site-footer">` element (always visible, structural HTML); updated scroll handler to fade out the grid-bottom gradient when user is within 160px of page bottom
- `app/styles.css` — added `.site-footer`, `.sf-inner`, `.sf-brand`, `.sf-dot` styles; updated `.content` top padding from 184px to 232px

**Behaviour:**
- Footer is always visible below the Load More button
- Grid bottom fade hides when near footer so it doesn't obscure it
- New cards append on Load More; footer descends naturally

---

### Task 2 — Explore keyword search field (Build)

Added a client-side keyword search field to Explore, positioned as a fixed bar directly below the filter chips.

**Files changed:**
- `app/explore.html` — added `.search-bar` HTML (fixed, above main content); wired `input` event listener with 140ms debounce in the init IIFE
- `app/ui.js` — added `_searchTerm`, `_searchDebounce`, `matchesSearch()`, `applySearch()`, `clearSearch()`; updated `renderGrid()` to apply search filter after type filter; updated empty state message to include search term when relevant
- `app/styles.css` — added `.search-bar`, `.search-bar-icon`, `.search-bar-input`, `.search-bar-clear` with dark mode overrides; updated `.content` top padding

**How search works:**
- `_searchTerm` is module-level state in `ui.js`
- `renderGrid()` applies type filter first, then `matchesSearch()` against the result
- `matchesSearch()` checks: `name`, `slug`, type label (from `TYPE[c.type].label`), `sport`, `region`, `city`
- Case-insensitive, partial match (`indexOf`)
- Debounced 140ms on input to prevent animation thrashing during fast typing
- Changing filter chip or sort order preserves the active search term (they all call `renderGrid(activeFilter)` which reads `_searchTerm`)
- Load More operates against `_currentVis` which is already the search-filtered set
- Clear button appears when input has content; click resets term and re-renders

**What is NOT searched:** bio text, team/driver names, country code, platforms. These can be added if needed.

**Empty state:** shows `No properties matched "term".` when search returns nothing.

---

## Previous Session — 2026-03-14 (Property page — ecosystem relationship explanation layer)

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

~~Implement SVG sparkline rendering on cards using `renderSpark()`.~~ DONE 2026-03-14. See session log below.

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
