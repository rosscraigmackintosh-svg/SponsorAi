# SponsorAI Prototype — Structured Handover Document

**File:** `07_Prototype/html/sponsorai-explore.html`
**Date:** 2026-03-03
**Purpose:** Handover for AI system extending the SponsorAI frontend

---

## 1. Tech Stack & Architecture

**Framework:** None. Vanilla HTML, CSS, and JavaScript in a single self-contained file (2,625 lines). No build step, no bundler, no module system.

**Styling system:** Custom CSS using CSS custom properties (variables) throughout. No utility framework. All layout is hand-written. Styles live in a single `<style>` block in the `<head>`.

**Design token structure:**
Tokens are stored in `:root` and `[data-theme="dark"]` blocks at the top of the `<style>` block. Three layers:

- Layer 1 — Primitive palette (`--color-purple-600`, `--color-gray-300`, `--color-base-white`, etc.) sourced from `Style.tokens.json`. Covers base, gray, brand, error, warning, success, blue, indigo, violet, purple, fuchsia, pink, rose, orange, yellow, green, teal, cyan scales in 25–950 steps.
- Layer 2 — Semantic mode tokens (`--colors-text-text-primary`, `--colors-border-border-primary`, etc.) sourced from `Light mode.tokens.json` (in `:root`) and `Dark mode.tokens.json` (in `[data-theme="dark"]`). 303 tokens each.
- Layer 3 — Component-level aliases (`--text-1`, `--text-2`, `--text-3`, `--accent`, `--accent-hover`, `--accent-soft`, `--accent-border`, `--bg`, `--surface`, `--surface-muted`, `--border`, `--border-strong`, `--positive`, `--negative`). These are what all CSS rules actually reference.
- Layer 4 — Spacing tokens (`--spacing-none` through `--spacing-11xl`, 0px–160px) sourced from `Mode 1.tokens.json`. All padding, margin, and gap values in CSS rules reference these.
- Layer 5 — Property-type color tokens: `--driver-bg/fg/score`, `--team-bg/fg/score`, `--series-bg/fg/score`, `--event-bg/fg/score`. Defined separately in both `:root` (light) and `[data-theme="dark"]`.

**No hardcoded hex values** exist in any CSS rule. All colors reference tokens.

**State management:** Plain JS variables. No framework, no store.
- `allCards` — array of all card data objects fetched on load.
- `activeFilter` — current type filter string (`'all'`, `'driver'`, `'team'`, `'series'`, `'event'`).
- `chatState` — object tracking chat preferences: `{ greeted, prefTypes, prefSort, prefLimit }`.
- `conversationHistory` — array of `{ role, content }` objects for Claude API multi-turn context.
- `navMenuOpen`, `profileMenuOpen`, `chatOpen` — simple boolean flags.

**Routing:** None. Single page, no URL changes, no hash routing.

**Data source:** Live Supabase REST API (no SDK). Two fetch calls on init:
1. `GET /v_property_summary_current` — returns up to 200 rows with aggregated FanScore columns.
2. `GET /fanscore_daily` — returns raw daily scores for the last 30 days for all loaded property IDs.

API credentials (anon key) are hardcoded in the JS. Model version is hardcoded as `'v1.0'`.

**AI chat:** Direct fetch to `https://api.anthropic.com/v1/messages` using `claude-haiku-4-5-20251001`, max 600 tokens. API key hardcoded. Retry logic: up to 3 attempts with 1.2s and 2.5s delays on overload or 5xx errors.

**External dependencies:**
- Google Fonts: `Inter:wght@400;500;600` and `DM+Mono:wght@400;500`
- Lucide icons: `https://unpkg.com/lucide@latest` (used for card action button icons: bookmark, check-check, briefcase)

**Prototype constraints and shortcuts:**
- API key and Anthropic key are both exposed in client-side JS. Not production-safe.
- No authentication, no user session.
- Theme is persisted via `localStorage` (`sai-theme`).
- No real data for `image_url` — all cards render placeholder SVG icons.
- No FitScore data exists yet.
- `MODEL` is hardcoded as `'v1.0'`.

---

## 2. Layout System

**Global layout structure:**
Three fixed floating bars at the top. Main content scrolls beneath them. An optional slide-in chat panel on the left. No sidebar. No footer.

```
[LEFT FLOATING BAR]          [CENTRE FLOATING BAR]          [RIGHT FLOATING BAR]
[CHAT PANEL — slides in]
[MAIN CONTENT — .content]
[GRID FADE OVERLAY — bottom]
```

**Floating bar base class:** `.float-bar`
- `position: fixed; top: 24px; height: 40px; z-index: 200`
- Background: `linear-gradient(180deg, var(--color-base-white) 0%, var(--color-gray-100) 100%)`
- Border: `1px solid var(--color-base-white)`
- Box shadow: `0 0 0 1px var(--color-gray-300), 0 2px 3px 1px rgba(0,0,0,0.08)`
- Border radius: `8px`

**Left bar (`.bar-left`):**
- `left: 24px; padding: 0 var(--spacing-xl) 0 var(--spacing-md); gap: var(--spacing-xs)`
- Contains: hamburger menu button (`#menu-btn`) + brand logo SVG (`.brand-logo`) + vertical divider (`.bar-divider`) + page title text (`#page-view-title`)
- The hamburger icon is a Figma-exported SVG with an embedded `<filter>` for inset shadow. Stroke color is hardcoded `#9B8AFB` (purple-400) inside the SVG attribute — this is the one remaining non-token color value, intentional as it is inside an inline SVG attribute.

**Centre bar (`.bar-centre`):**
- `position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 200`
- Implemented as `.btn-group.bar-centre` — an `inline-flex` pill of filter chips
- Contains: All / Drivers / Teams / Series / Events chips

**Right bar (`.bar-right`):**
- `right: 24px; padding: 0 var(--spacing-xl) 0 0; gap: var(--spacing-xl)`
- Contains: chat icon button (`#chat-bar-btn`) + vertical divider + profile initials button (`#profile-btn`)

**Nav menu dropdown (`.nav-menu`):**
- `position: fixed; top: 73px; left: 24px; z-index: 201`
- Opens below the left bar on hamburger click
- Hidden by default (`opacity: 0; pointer-events: none; transform: translateY(-6px) scale(0.98)`)
- Open state: `.nav-menu.open` restores opacity and scale, `pointer-events: all`
- Contains two `.menu-col` groups: (Explore / Portfolio / Compare) and (Scenarios / Reports), separated by a `.menu-col-divider`, then a `.menu-divider` above a theme toggle row

**Profile dropdown (`.profile-menu`):**
- `position: fixed; top: 78px; right: 24px; z-index: 201`
- Same open/close animation pattern as nav menu
- `transform-origin: top right`

**Chat panel (`.chat-panel`):**
- `position: fixed; top: 88px; bottom: 0; left: calc(-1 * var(--cp-w) - 48px); width: var(--cp-w); z-index: 99`
- `--cp-w: max(420px, calc(100vw / 6))`
- Opens by sliding to `left: 0` with opacity fade
- Background matches `var(--bg)` — deliberately embedded in the page, not a floating overlay
- When open: `body.chat-open` class causes `.content` to add `padding-left: calc(var(--cp-w) + var(--spacing-6xl))`, pushing the card grid right

**Main content area (`.content`):**
- `padding: 92px var(--spacing-6xl) var(--spacing-5xl)` (top clears the 24px bar offset + 40px bar height + 28px breathing room)
- `transition: padding-left 0.22s ease` (smooth push when chat opens)
- No max-width constraint on the content container itself — the grid fills available width

**Content structure:**
```
.main#main-content
  .content
    .page-header
      .page-meta#page-meta
    .card-grid#card-grid
```

**Breakpoints:**
- `max-width: 640px` (mobile): single-column grid, chat panel goes full-width, smaller logo
- `min-width: 641px` and `max-width: 1024px` (tablet): 2-column grid, reduced content padding
- Above 1024px: `auto-fill` grid with `minmax(300px, 1fr)` columns

**Dark mode implementation:**
- `data-theme` attribute on `<html>` element (`data-theme="light"` by default)
- Dark mode tokens applied via `[data-theme="dark"]` selector in the stylesheet
- Theme toggled via `applyTheme(theme)` JS function which sets `document.documentElement.setAttribute('data-theme', theme)`
- Persisted in `localStorage` under key `'sai-theme'`
- Respects `prefers-color-scheme` on first load if no saved preference

---

## 3. Explore Page Structure (Current State)

**Page hierarchy (DOM order):**
1. Skip link (`.skip-link`)
2. Centre floating bar (`.btn-group.bar-centre`) — filter chips
3. Left floating bar (`.float-bar.bar-left`) — logo + menu
4. Nav dropdown (`nav.nav-menu#nav-menu`)
5. Right floating bar (`.float-bar.bar-right`) — chat + profile
6. Profile dropdown (`.profile-menu#profile-menu`)
7. Chat panel (`aside.chat-panel#chat-panel`)
8. Main (`main.main#main-content`)
9. Grid fade overlay (`.grid-fade-bottom#grid-fade-bottom`)

**Main content section order:**
1. `.page-header` containing `.page-meta` (property count + model version + as-of date)
2. `.card-grid` (CSS Grid containing `.fanscore-card` elements)

There is no page title `<h1>` rendered in the current state. `.page-title` class exists in CSS but the element is not present in the HTML. Only `.page-meta` is used.

**How cards are rendered:**
Cards are rendered entirely as HTML strings by `renderCard(c, idx)` and injected via `innerHTML`. No templating engine or DOM diffing. On initial load and every filter/sort change, `setGridContent(html)` replaces the grid's `innerHTML`. Lucide icons are re-initialised via `lucide.createIcons()` after each render.

**How sorting works:**
Default sort is `avg_score_30d DESC` applied server-side in the Supabase query (`&order=avg_score_30d.desc.nullslast`). The client does not re-sort by default — cards arrive pre-sorted. AI chat commands can trigger client-side re-sorts via `applyAIView()` using `sort` options: `'score'` (no client sort, uses server order), `'trend'` (sorts by `t30` descending), `'confidence'` (sorts by `conf30` using High/Medium/Low mapping).

**How filtering works:**
The centre bar chips call `setFilter(el)` which sets `activeFilter` and calls `renderGrid(activeFilter)`. `renderGrid` filters `allCards` client-side by `c.type`. No network request on filter change. All 200 records are loaded once on page load.

**How search works:**
No text search input exists on the page. Search is handled entirely through the AI chat panel. The user types in the chat textarea, Claude responds with `[CMD:...]` tags that update the grid.

**Card grid layout:**
CSS Grid. `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`. Gap: `var(--spacing-3xl)` (24px). No masonry. No fixed column count above 1024px — columns expand to fill width.

**Whether results are deterministic:** Yes for initial load — server returns `avg_score_30d DESC, nullslast` order. AI-triggered views are also deterministic based on the applied command set.

**Default sort state:** FanScore 30d average, descending.

**Property in Focus section:** Does not exist. There is no detail panel, no modal, no expanded card state. `selectCard(id)` applies a `.selected` class (accent ring) to the clicked card but takes no further action. No side panel or drawer opens.

---

## 4. Card System (FanScore Cards)

**Card component name:** `.fanscore-card`

**Card rendering:** HTML string concatenation in `renderCard(c, idx)`. Not a web component or React component.

**Card height:** Variable — not fixed. The card is `display: flex; flex-direction: column`. Height is determined by content. The hero image uses `aspect-ratio: 1/1` on the `.card-hero` div, so the image zone is always square relative to card width. The body region (`.card-body`) grows with content via `flex: 1`.

**Card structure (inner DOM):**
```
.fanscore-card
  .card-hero                       (square image zone, background = type color)
    img OR .card-hero-placeholder  (SVG icon if no image_url)
  .card-body
    .card-header
      .card-name-row
        .card-name                 (property name, 24px, weight 800, ellipsis)
        .country-tag               (emoji flag or invisible placeholder)
      .card-badges
        .type-badge                (currently display:none)
      .team-plain                  (team name for drivers, driver names for teams, or hidden empty div)
    .score-row
      .score-main
        .score-val                 (FanScore number, 30px, weight 600)
        .score-lbl                 ("FanScore · 30d avg", 12px, gray-500)
      .score-aside
        .trend-line                (arrow + trend value per day, colored by direction)
        .conf-line                 (confidence band: High/Medium/Low, 12.5px, gray-500)
        .conf-line                 (coverage %, same style)
    .sup-notice                    (only if suppressed — accent-colored notice block)
    .card-actions
      .card-btn[data-action=watchlist]  (bookmark icon)
      .card-btn[data-action=compare]    (check-check icon)
      .card-btn[data-action=portfolio]  (briefcase icon)
```

**Image handling:** `image_url` field is expected but not populated in current data. All cards render `.card-hero-placeholder` with a type-specific SVG icon. The `img` path exists in the render function but is not exercised.

**FanScore rendering:**
- Displayed as `avg_score_30d` formatted to 1 decimal place
- If `sup30` (suppression reason) is truthy: score renders as `'--'` in dimmed style (`.score-val.dim`, `var(--text-3)`, 22px)
- If not suppressed: score color is `var(--[type]-score)` from the type config

**Color logic by property type:**
Type config object `TYPE` maps `driver/team/series/event` to CSS variable references:
```
driver: bgVar=var(--driver-bg), fgVar=var(--driver-fg), scoreVar=var(--driver-score)
team:   bgVar=var(--team-bg),   fgVar=var(--team-fg),   scoreVar=var(--team-score)
series: bgVar=var(--series-bg), fgVar=var(--series-fg), scoreVar=var(--series-score)
event:  bgVar=var(--event-bg),  fgVar=var(--event-fg),  scoreVar=var(--event-score)
```
These var references resolve to different values in light and dark mode.

**Confidence display:** Rendered as two `.conf-line` elements in `.score-aside`:
1. `conf30` field (band label: High / Medium / Low) + " confidence"
2. `cov30` field (decimal, multiplied by 100) + "% coverage"
Both are only rendered if the field is non-null. Both use `color: var(--color-gray-500)`.

**Hover state:** `.fanscore-card:hover` increases box-shadow from `0 1px 6px 0 rgba(0,0,0,0.10)` to `0 4px 14px 0 rgba(0,0,0,0.13)`.

**Selected state:** `.fanscore-card.selected` adds `0 0 0 2px var(--accent)` to the box-shadow.

**Card entry animation:** `card-in` keyframe (opacity 0→1, translateY 10px→0, 0.22s). Staggered by `animation-delay` at 22ms per card, capped at card index 24 to avoid long delays on large grids.

**Card exit animation:** `card-out` keyframe (opacity 1→0, translateY 0→40px). Triggered by `.card-leaving` class. Stagger of 18ms per card, total capped at 380ms.

**Card action buttons:** Toggle `.active` class on click (client-side only). No network call, no persistent state. The watchlist/compare/portfolio actions are purely visual at this stage.

**Equal height assumption:** Cards do NOT assume equal height. Grid cells will vary in height depending on content length (e.g. presence of `sup-notice`, length of team/driver names). CSS Grid places cards in rows; columns align at the top of each row. There is no masonry or height-equalisation logic.

---

## 5. Sorting & Governance Safeguards

**Available sort options:**
- `score` — FanScore 30d average descending (server-side default; no client re-sort)
- `trend` — 30-day momentum (`t30`) descending (client-side)
- `confidence` — data confidence band descending: High → Medium → Low (client-side)

**Default sort:** `score` (server-side `ORDER BY avg_score_30d DESC NULLSLAST`)

**Sort state visibility:** The currently active sort is not displayed anywhere in the UI. No sort control or label is rendered. Sort changes only occur via AI chat commands.

**Anti-ranking protections:**
- The type badge (`.type-badge`) is set to `display: none` — suppressed to avoid type-based ranking visual hierarchy.
- Suppressed cards (low data coverage) render FanScore as `'--'` with `.score-val.dim` styling to visually neutralise the score, not hide the card.
- There is no leaderboard numbering, no rank indicator, no position badge.
- AI system prompt explicitly instructs Claude: "Never present scores as verdicts. Never imply guaranteed outcomes or ROI certainty. Never declare winners in comparisons." and "If asked for 'the best' property: clarify intent first, then present a short unranked shortlist."
- Cards in the AI-controlled view are presented in data order; Claude never presents a ranked list with positional labels.

**Whether UI implies hierarchy:** Partially. The default server sort is score-descending, so the highest-scoring property appears first. However, there is no numeric rank, no medal/trophy UI, no explicit "top X" label applied to cards. The meta line (`page-meta`) shows count only. The visual separation between a score of 8.5 and 7.9 is purely numerical — no tier banding or tier coloring.

---

## 6. Portfolio / Compare Integration

**How users save items:**
The three `.card-btn` elements (watchlist, compare, portfolio) toggle `.active` class on click via an event listener on `#card-grid`. This is purely client-side visual state. No data is written anywhere. No persistent state, no API call, no cross-card awareness.

**How compare works:**
There is no compare view or compare logic. The compare button (`data-action=compare`) toggles the button active state only. The nav menu has a "Compare" item which calls `setNavActive('Compare')` — this updates the page title text and active nav item visually, but does not navigate to or render any compare surface.

**Whether compare affects Explore ordering:** No. No cross-card interaction exists.

**Cross-surface state sharing:** None. There is no Portfolio surface, no Scenarios surface, no Reports surface. These nav items exist as interactive buttons but do not render any content.

---

## 7. Known Technical Constraints

**Layout fragility:**
- The nav menu top position (`top: 73px`) is hardcoded as a comment-explained calculation: `24px bar top + 44px bar height + 5px gap`. If bar height or top offset changes, this value must be manually updated.
- The profile menu top position (`top: 78px`) is similarly hardcoded.
- The content top padding (`92px`) is also manually calculated and hardcoded.
- Chat panel top (`88px`) is a third hardcoded offset.
- `--cp-w: max(420px, calc(100vw / 6))` — the chat panel width formula could produce awkward widths on very wide monitors. It has no maximum cap.

**Performance limitations:**
- All 200 cards are loaded into memory on init. The second fetch (sparkline data) fires for all 200 property IDs simultaneously in one request with a 2000-row limit. No pagination.
- Grid re-renders replace the entire `innerHTML` — no diffing, no partial update.
- `lucide.createIcons()` is called after every render, scanning the entire DOM.
- The system prompt for the Claude API is rebuilt on every chat send from live data, including full driver index and team roster strings.

**Known hacks:**
- Hamburger icon stroke color `#9B8AFB` is hardcoded inside the SVG `stroke` attribute — it is the one color in the entire file not using a CSS variable. This is because SVG presentation attributes do not inherit CSS custom properties without `currentColor` threading.
- `animation-delay` for cards is set via inline `style` attribute written directly into the card HTML string during `renderCard`.
- Chat panel uses `left` property transition (not `transform`) for the slide-in animation, which triggers layout reflows.

**Areas that would break if grid logic changed:**
- Any change from CSS Grid to masonry or absolute positioning would require rethinking the card entry/exit animation system, which assumes normal flow.
- Adding fixed card heights would require auditing `team-plain`, `sup-notice`, and `rel-row` elements which are conditionally rendered and currently drive variable height.
- The card `data-id` attribute is used for `selectCard()` lookup. Any change to card rendering that removes this attribute would break card selection.

---

## 8. What Is NOT Yet Built

**Navigation surfaces:** Portfolio, Compare, Scenarios, Reports — all exist as nav items only. No views, no content, no routing.

**Property detail view:** No expanded card, no modal, no detail panel. Clicking a card selects it (visual ring) but nothing else happens.

**FitScore:** Referenced in design documentation and AI guardrail copy but no FitScore data exists in the schema or is rendered anywhere.

**Search input:** No keyword search field on the page. Search is chat-only.

**Sort controls:** No visible sort UI. Sort only changes via AI commands.

**Filter state indicators:** The active filter chip highlights, but there is no clear-filter button and no count badge on filter chips.

**Image loading:** `image_url` is never populated from the current dataset. The placeholder SVG path is the only rendering path exercised.

**Watchlist / Compare / Portfolio functionality:** All three card action buttons are cosmetic toggles only. No data persistence, no view surface.

**Sparkline charts:** The data fetch includes sparkline data (`fanscore_daily` for 30 days) and it is stored in `c.sparks`, but no sparkline is rendered. The `renderCard` function does not output any chart element. The sparkline CSS class or container does not exist.

**Pagination / infinite scroll:** Not implemented. Hard limit of 200 cards from the API.

**Property type icons in filter bar:** Currently text-only chips. No icons.

**Responsive nav:** On mobile, the nav menu and profile menu behaviour is unchanged from desktop — no bottom sheet, no full-screen overlay.

**Error states per card:** Only a grid-level error state exists. No per-card error handling.

**Loading skeletons:** Only a spinner inside a `.state-msg` div is shown during initial load. No skeleton cards.

**User data:** Profile name and email (`Ross Mackintosh`, `rosscraigmackintosh@gmail.com`) are hardcoded in the HTML.

---

## 9. Screenshot-Level Mental Model

The screen has a light grey page background (`#F8F8F9`). Three floating pill-shaped bars sit near the top of the viewport, 24px from the top edge, each separated by clear space.

**Left bar:** Small, left-aligned. Contains a hamburger icon (purple stroke, 3 lines), the SponsorAI wordmark (dark grey text + orange-to-purple gradient "Ai" suffix), a thin vertical divider, and the word "Explore" in medium-weight text.

**Centre bar:** Horizontally centred. A segmented pill with five chips: All, Drivers, Teams, Series, Events. The active chip ("All" by default) has a soft purple background and purple text. Inactive chips are neutral grey text. Chips are separated by thin vertical rules.

**Right bar:** Right-aligned. A chat bubble icon button, a thin vertical divider, and a circular profile button with initials "RS".

Below the bars, the page has a short meta line in small grey text showing: "N properties · model v1.0 · as of YYYY-MM-DD".

Below that, the card grid begins. Cards are roughly equal-width columns (minimum 300px each, expanding to fill width). Each card has:
- A square image zone at the top with a type-colored background and a white outline icon (person silhouette for drivers, car shape for teams, etc.)
- Below the image: a large bold property name (24px, weight 800, dark grey)
- A right-aligned emoji flag
- A small grey team or driver line
- A large FanScore number (30px, type-specific color for valid scores, or "--" in muted grey for suppressed)
- Below the score: "FanScore · 30d avg" in small medium grey
- To the right of the score: a directional arrow with a per-day trend value (green for up, red for down), and a confidence/coverage line beneath it
- Three small icon buttons at the bottom (bookmark, check-check, briefcase) in light grey

The page background fades to transparent at the bottom of the viewport via a fixed gradient overlay.

When the chat panel is open, it slides in from the left edge, pushing the card grid to the right. The panel background matches the page background (no border or card styling). Inside the panel: a scrollable message area with AI messages in dark text and user messages right-aligned on a white surface. At the bottom: a rounded textarea with a purple circular send button.

---

## 10. Extension Safety Notes

**Must not be changed to preserve SponsorAI constitutional rules:**
- FanScore and FitScore must remain visually separated. Do not merge them into a single composite score, single bar, or single color treatment.
- The `.score-val.dim` suppression pattern — cards with `sup30` truthy must render `'--'` not the actual score. Revealing suppressed scores would violate data confidence rules.
- Type color tokens (`--driver-fg/bg/score` etc.) must remain distinct. Do not collapse all property types into a single neutral color — type identity is a core signal.
- No rank numbers, position badges, or leaderboard patterns. The `type-badge` is already hidden (`display:none`) for this reason. Do not add numeric position indicators.
- The AI system prompt contains explicit guardrails. Do not modify the prompt sections: GUARDRAILS, TONE, STRICT DISCIPLINE. Particularly: "Never present scores as verdicts", "Never declare winners."
- Confidence indicators (`conf-line`) must remain secondary and descriptive. Do not elevate them to primary prominence or color them with accent/positive/negative colors.

**Areas sensitive to ranking drift:**
- Default sort is score-descending. Any UI change that adds visible rank labels (1st, 2nd, etc.), rank-based coloring, or tier grouping (Top Tier / Mid Tier) would introduce ranking theatre and violate design philosophy.
- The page meta line currently says "N properties". Adding "Top N" or "Ranked by score" language to this line would imply ranking endorsement.
- Filter chips currently show types without count badges. Adding count badges is neutral. Adding percentage-of-total or "most active" labeling would start to imply competitive hierarchy between types.

**Patterns currently safe but could become risky:**
- Score color by type (`var(--driver-score)` etc.) is currently descriptive (type identity). If score colors were changed to reflect score magnitude (e.g. green = high, red = low), it would introduce a value judgement on score level — which violates the neutral/analytical philosophy.
- The trend arrow (`↑ ↓ →`) with `var(--positive)` / `var(--negative)` color is currently scoped to directional momentum only. Expanding this pattern to color the FanScore number itself by positive/negative threshold would be risky.
- The `.fanscore-card.selected` state (accent ring) is safe as a selection indicator. If extended to mean "added to shortlist" with a persistent visual priority treatment (e.g. pinned to top, larger card), it could imply ranking endorsement.
- The AI chat `sort:score` command re-uses server order. If a future sort introduces weighted composite scoring visible to the user without disclosure, it would violate the trust-first positioning.
