# AI_ENGINEERING_PLAYBOOK.md

SponsorAI — Safe Engineering Practices for AI Agents

Last updated: 2026-03-12

---

## Purpose

This file explains how AI agents should safely work inside the SponsorAI repository. It summarises patterns derived from the prototype handover document and the March 2026 code review.

For complete technical detail, see the authoritative sources:
- `_internal/prototype-archive/HANDOVER.md` — full prototype technical reference
- `_internal/06_Experiments/SponsorAI_Code_Review.md` — known issues and structural analysis

---

## 1. The Codebase Reality

### The main prototype file

The primary working application is `app/explore.html`.

This file is:
- 3,699 lines long
- A single self-contained HTML file
- Vanilla HTML, CSS, and JavaScript with no build step, no framework, no bundler
- **Gitignored** — it does not exist in the repository for anyone cloning from GitHub

Because `explore.html` is gitignored, it lives only on the local machine. It cannot be read from git history. Any task involving this file requires the file to be present in the working directory. If it is absent, do not attempt to reconstruct it.

All other pages in `/app` (compare, portfolio, watchlist, property, opportunities) are stub files ranging from 185 to 400 lines. They are placeholder HTML with no live data or functionality.

### No build tooling exists

There is no `package.json` at the root, no webpack, no vite, no TypeScript compilation step, no CI pipeline. Changes to `.html` files are the changes. There is no build to run.

---

## 2. The Token System — Do Not Break This

The design token system in `explore.html` is the most important structural constraint in the codebase.

Tokens are layered in five levels inside the `<style>` block:

1. Primitive palette (`--color-purple-600`, `--color-gray-300`, etc.)
2. Semantic mode tokens (`--colors-text-text-primary`, etc.) — 303 in light, 303 in dark
3. Component aliases (`--text-1`, `--accent`, `--bg`, `--surface`, `--border`, etc.) — what all CSS rules reference
4. Spacing tokens (`--spacing-none` through `--spacing-11xl`)
5. Property-type color tokens (`--driver-bg/fg/score`, `--team-bg/fg/score`, etc.)

**Rules:**
- All CSS rules must reference component-level tokens, never primitive tokens or hex values
- The one known exception is the hamburger SVG `stroke="#9B8AFB"` — this is intentional because SVG presentation attributes do not inherit CSS custom properties without `currentColor` threading
- Dark mode is handled via `[data-theme="dark"]` on the `<html>` element — all semantic tokens already have dark values defined; do not add new hardcoded dark-mode overrides
- When adding a new UI element, use existing component tokens. Do not invent new token names. Do not hardcode hex values.

For the full design system specification, the canonical source is `_internal/03_Design_System/`.

---

## 3. How the Card Grid Works

Cards are rendered as HTML strings by the `renderCard(c, idx)` function and injected via `innerHTML`. There is no templating engine, no virtual DOM, no diffing.

On every filter or sort change, `setGridContent(html)` replaces the entire `#card-grid` innerHTML. After each render, `lucide.createIcons()` is called to re-initialise icon nodes.

**Safe extension patterns:**
- Modify `renderCard()` to change card structure — but test both light and dark mode, and suppressed vs active states
- Keep `data-id` attributes on `.fanscore-card` elements — `selectCard()` depends on them
- Animation delays are written as inline `style` attributes during `renderCard` — stagger logic is intentional and capped at index 24
- Card action buttons use event delegation via a listener on `#card-grid`, not inline onclick handlers on buttons — if adding new card buttons, follow the same delegation pattern

**Do not:**
- Remove the `.score-val.dim` suppression path — cards with `sup30` truthy must render `'--'` not the actual score
- Collapse property-type color tokens to a single neutral — type identity is a core signal
- Add rank numbers, position badges, or leaderboard indicators to cards

---

## 4. How Data Loads

On page load, two sequential `fetch` calls go to the Supabase REST API:

1. `GET /v_property_summary_current` — up to 200 rows with aggregated FanScore fields, sorted by `avg_score_30d DESC NULLSLAST` server-side
2. `GET /fanscore_daily` — raw daily scores for the last 30 days, for all loaded property IDs passed as a comma-separated list in the URL

All 200 records are held in memory in `allCards`. Filtering is client-side only (no new network request on filter change). There is no pagination.

Key state variables:
- `allCards` — the full loaded dataset
- `activeFilter` — current type filter (`'all'` | `'driver'` | `'team'` | `'series'` | `'event'`)
- `conversationHistory` — multi-turn chat history for the Claude API
- `chatState` — user preferences inferred during chat (`prefTypes`, `prefSort`, `prefLimit`)

The Supabase anon key and Anthropic API key are both hardcoded in the JS. This is a known prototype shortcut — see Known Issues in `DEVELOPMENT_LEDGER.md`.

---

## 5. How the AI Chat Layer Works

The chat panel makes direct browser-side `fetch` calls to `https://api.anthropic.com/v1/messages` using `claude-haiku-4-5-20251001`, with a 600-token response limit.

The system prompt is rebuilt from live data on every send. It includes a property index and team roster strings. Responses may include `[CMD:...]` tags which the frontend parses to update the card grid.

Available CMD patterns (from the existing implementation):
- `[CMD:FILTER:type]` — filter by property type
- `[CMD:SORT:metric]` — sort by score, trend, or confidence
- `[CMD:SHOW:id1,id2,...]` — show only specific property IDs
- `[CMD:RESET]` — restore full grid

The AI system prompt contains explicit guardrails that must not be modified:
- GUARDRAILS section: do not present scores as verdicts
- TONE section: calm, analytical, confidence-aware
- STRICT DISCIPLINE section: never declare winners, never imply ROI

These guardrails exist in the prototype JS and are derived from the Constitution. Do not soften or remove them.

---

## 6. Layout Fragility — Known Brittle Points

Several layout values are hardcoded as calculated offsets. If bar height or top offset changes, these must all be manually updated:

- Nav menu top: `73px` (= 24px bar offset + 44px bar height + 5px gap)
- Profile menu top: `78px`
- Content top padding: `92px`
- Chat panel top: `88px`

The chat panel width uses `--cp-w: max(420px, calc(100vw / 6))` with no maximum cap — on very wide monitors this can produce awkward widths.

The chat panel uses `left` property transition (not `transform`) for its slide animation, which triggers layout reflows. This is a known performance issue.

---

## 7. What Is Currently Stub-Only

The following surfaces exist as nav items or HTML stubs but have no live functionality:

- Portfolio view
- Compare view
- Watchlist view (card action buttons are cosmetic toggles only)
- Scenarios
- Reports
- Property detail panel (clicking a card applies a selected ring; nothing else happens)
- FitScore (referenced in documentation but no data or UI exists)
- Sparkline charts (data is fetched and stored in `c.sparks` but never rendered)
- Image loading (`image_url` is never populated; all cards show placeholder SVGs)
- Search input field (search is chat-only)

---

## 8. Database Schema State

The database has three files:

- `database/001_master_schema.sql` (979 lines) — the base schema definition
- `database/test_plan.sql` (443 lines) — test suite with gap documentation
- `database/ui_data_layer.ts` (408 lines) — typed TypeScript data access layer (Supabase SDK)

**Important:** The master schema is not the source of truth for the live database. Migrations 006, 007, and 008 have been applied to the live Supabase instance but are not reflected in the master schema file. Running the master schema from scratch will produce a broken database. The test plan documents the gaps.

Key known divergences:
- Column names in `v_property_summary_current` differ between master schema and `ui_data_layer.ts`
- `suppression_reason` column added in migration 008 is absent from the master schema
- Scoring function weights are hardcoded in SQL rather than read from `fanscore_models.weights_json`

---

## 9. Authoritative References

Before making any change to the prototype, consult:

| Topic | Source |
|---|---|
| Full layout and component detail | `_internal/prototype-archive/HANDOVER.md` |
| Known bugs and security issues | `_internal/06_Experiments/SponsorAI_Code_Review.md` |
| Token system specification | `_internal/03_Design_System/Tokens/` |
| Design component rules | `_internal/03_Design_System/Components/` |
| Scoring rules and guardrails | `_internal/04_Data_Models/SponsorAI_Scoring_Spec.md` |
| Constitutional constraints | `_internal/00_Core_Truth/SponsorAI_Constitution.md` |
| AI instruction rules for UI | `CLAUDE.md` |
