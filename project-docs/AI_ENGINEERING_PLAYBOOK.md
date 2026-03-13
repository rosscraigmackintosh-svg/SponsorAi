# AI_ENGINEERING_PLAYBOOK.md

SponsorAI — Safe Engineering Practices for AI Agents

Last updated: 2026-03-13 (added working modes, prompt templates, workflow sequences)

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

## 9. Entity Expansion Definition of Done

When inserting a new series, team, athlete, venue, or event, all five stages below must be completed before the expansion is described as done. Structural insertion alone is not sufficient — an entity that is in the database but missing presentation data is visually broken in the UI.

**Stage 1 — Structural creation**

- Property row with valid unique slug
- property_type from the enum
- All applicable property_relationships rows

**Stage 2 — Presentation completion**

- bio populated (factual, 1 to 3 sentences, calm analytical tone)
- country and country_code populated (ISO 3166-1 alpha-2; null only for pan-regional entities)
- sport = 'motorsport' for all current properties
- region = 'Europe' for all current properties
- city populated for teams and venues
- Image entry in app/images.js using typed format { src, kind, fit, pos, pad?, bg? }
- Image URL verified as reachable and rendering correctly in the UI (registry presence alone is not sufficient)
- If no image URL is found, document the absence inline in images.js with a comment

Note on venue image sources: official circuit websites frequently block external image embedding (hotlink protection). Use Wikimedia Commons (upload.wikimedia.org) for venue aerial photography. Compute the thumbnail URL with the MD5 formula: hash = md5(filename), path = thumb/{hash[0]}/{hash[:2]}/{filename}/1280px-{filename}.

**Stage 3 — Score and demo data (scoreable properties only)**

- Accounts in the accounts table, one per intended platform
- Follower history in raw_account_followers covering 90 days minimum
- Posts in raw_posts (at least 30 per account over 90 days)
- Post daily metrics in raw_post_daily_metrics
- Rollups run via compute_daily_rollups
- FanScore windows run via compute_fanscore_windows

Events and venues: FanScore suppression with reason 'Insufficient data' is acceptable if they have no dedicated social accounts. This must be noted as an intentional exception in the expansion notes.

**Stage 4 — UI verification**

- Cards render with correct image, type badge, and country flag
- Panel opens with bio, image hero, and key facts populated
- No unintended placeholder text or blank sections
- Scoreable properties: FanScore renders in card and panel

**Stage 5 — Exceptions reported**

Any deviation from stages 1 through 4 must be documented in project-docs/DEVELOPMENT_LEDGER.md in the same session as the expansion. Acceptable exceptions: image URL not found (document inline in images.js), event without social accounts (document in migration notes).

The authoritative version of this rule is in docs/SPONSORAI_SYSTEM_CONTRACT.md Section 8.

---

## 10. Authoritative References

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

---

## 11. Claude Working Modes

Every task belongs to one of five modes. The mode tells Claude how to behave: what lens to use, how cautious to be, and what counts as done.

**Always declare the mode if it is not obvious from the prompt.**

---

### Build Mode

**Use when:** Implementing features, fixes, or new functionality.

**Behaviour:**

- Act as a senior engineer writing production-quality code.
- Prefer simple, robust solutions over clever ones. If two approaches work, choose the more debuggable one.
- Never break existing behaviour. When modifying a function, trace all callers before changing its signature or return value.
- Automate every safe step. If something can be done by the pipeline rather than manually, wire it in.
- If the task requires a DB change, include the migration explicitly. Never assume the DB matches the master schema file.
- Read CLAUDE.md before touching any UI. Load the full Design System in order.
- Flag ambiguity rather than resolving it silently.

---

### Review Mode

**Use when:** Checking work after implementation is complete.

**Behaviour:**

- Act as a paranoid senior reviewer who has seen production incidents.
- Look for: logic errors, broken assumptions, edge cases, regressions, inconsistent state, missing null checks, hardcoded values that should be tokens or constants, and anything that would fail silently.
- When an issue is found, explain clearly: what breaks, in which scenario, and what the impact is.
- Do not rewrite code unnecessarily. Identify the exact change needed, not a refactor.
- Be particularly suspicious of: status strings that could arrive in unexpected case, async functions without error paths, UI state that is not reset in `finally` blocks, and DB writes that could succeed while the UI shows failure (or vice versa).

---

### Audit Mode

**Use when:** Validating data completeness, running ingestion checks, detecting duplicates, verifying image coverage, or assessing FanScore scoreability.

**Behaviour:**

- Verify each entity type in sequence: properties exist, relationships exist, presentation data is populated, scoring is possible.
- Distinguish intentional suppression from broken ingestion. A suppressed entity with `suppression_reason` is expected. An entity with no posts and no suppression reason is a bug.
- Report exact failure points. "3 of 8 athletes are missing follower history" is useful. "Some entities have missing data" is not.
- Prefer diagnosis before repair. Run the full audit and present findings before proposing or making any changes.
- Use the `run_series_audit` RPC as the primary diagnostic tool. Supplement with direct DB queries for structural checks.
- Document all intentional exceptions in DEVELOPMENT_LEDGER.md in the same session.

---

### Architecture Mode

**Use when:** Designing new systems, evaluating structural decisions, or planning multi-sport expansion.

**Behaviour:**

- Focus on: scalability, automation, maintainability, and the eventual need to support dozens of sports and hundreds of properties.
- Evaluate tradeoffs explicitly. State what each approach enables and what it makes harder.
- Recommend structure before implementation. Architecture decisions should be captured in writing before any code is written.
- Consider the operational load of each design. A schema that requires manual repair at scale is not a good schema.
- Flag decisions that would be hard to reverse and give them more scrutiny.
- Reference `docs/SPONSORAI_SYSTEM_CONTRACT.md` when any decision touches scoring, FitScore, or the property model.

---

### Documentation Mode

**Use when:** Updating ledgers, roadmap, system state, contracts, or any setup doc.

**Behaviour:**

- Update documentation only. Do not change application code.
- Keep WORKING_CONTEXT.md, DEVELOPMENT_LEDGER.md, PRODUCT_ROADMAP.md, and SERIES_INGESTION_PROCESS.md aligned with the current state of the codebase.
- Capture future ideas in the roadmap or a separate ideas section -- not in active build scope.
- Be precise about what is built vs. what is planned vs. what is stubbed. These three states are not the same and must not be conflated.
- Date all new entries. State what changed, not just what the current state is.

---

## 12. Automation and Human-in-the-Loop

**Default rule:**

> If anything can be safely automated instead of manual, automate it.

Safe automation means: idempotent, reversible, and diagnosable. An automated step that creates correct state on success and leaves the system unchanged on failure is always preferred over a manual SQL step.

**Balancing rule:**

> Where ambiguity or risk exists, keep a human in the loop rather than faking automation.

Do not simulate success. Do not paper over gaps with optimistic defaults. If a template does not exist for a slug, return `unsupported_steps` and tell the operator. Do not invent data.

**Practical test:** Before automating a step, ask: "If this runs against a production database and the input is wrong, what breaks?" If the answer is "nothing irreversible", automate it. If the answer is "corrupted entities", add a human gate.

---

## 13. Recommended Prompt Templates

Short reusable patterns for each mode. Paste and adapt.

---

### Build Mode prompts

```
[Build Mode] Add [feature/fix] to [file or component].
Context: [brief description of what exists today].
Constraints: do not change [specific area]. Keep DB changes explicit.
```

Example:
```
[Build Mode] Add a "Copy slug" button to each row in the status table in control-room.html.
Context: the status table renders in renderStatus(). Each row has a slug in the data.
Constraints: do not change the table structure or column order.
```

---

### Review Mode prompts

```
[Review Mode] Review the changes made to [file or function] in this session.
Focus on: [error paths / state management / DB consistency / edge cases].
Do not rewrite -- identify specific issues only.
```

Example:
```
[Review Mode] Review the updated handleStartIngestion() function.
Focus on: async error paths, status values, checklist state correctness.
Do not rewrite -- identify specific issues only.
```

---

### Audit Mode prompts

```
[Audit Mode] Run a data audit for [series slug].
Check: structural completeness, relationship coverage, presentation data, scoreability.
Report exact failure points. Distinguish intentional suppression from missing data.
```

Example:
```
[Audit Mode] Run a data audit for premiership-rugby.
Check all 35 expected entities. Verify relationships, bios, images, and FanScore coverage.
Distinguish intentional suppression from missing data. List all gaps.
```

---

### Architecture Mode prompts

```
[Architecture Mode] Design [system or feature].
Constraints: [any hard constraints].
Evaluate at least two approaches. Recommend structure before implementation.
Consider: multi-sport scale, operational load, reversibility.
```

Example:
```
[Architecture Mode] Design the approach for supporting additional sports in the ingestion pipeline.
Current state: build_series_structure supports two templates.
Evaluate: template-per-file vs config-driven vs rule-based approaches.
Consider: how many series we might have in 12 months, and what a new template should cost to add.
```

---

### Documentation Mode prompts

```
[Documentation Mode] Update [document(s)] to reflect the changes made in this session.
Session summary: [brief].
Do not change any application code.
```

Example:
```
[Documentation Mode] Update WORKING_CONTEXT.md, DEVELOPMENT_LEDGER.md, and PRODUCT_ROADMAP.md
to reflect Control Room v0.7.
Session: added build_series_structure RPC, rewrote handleStartIngestion, created seed files.
Do not change any application code.
```

---

## 14. Recommended Workflow Sequences

### Standard feature development

```
Plan (Architecture Mode if significant)
  -> Build (Build Mode)
  -> Review (Review Mode)
  -> Audit (Audit Mode, if data or DB was affected)
  -> Document (Documentation Mode)
  -> Commit
```

Most sessions skip the Architecture step for small features. Review and Audit can be done in the same pass for small changes. Documentation always runs at the end of the session.

---

### Series ingestion workflow (Control Room)

```
Create run (Control Room: Start ingestion)
  -> Build structure (automated via build_series_structure RPC)
  -> Audit (automated: run_series_audit fires after structure builder)
  -> Triage issues (manual: review flags in Issues table, mark intentional exceptions)
  -> Repair presentation data (manual: image URLs, bio corrections, EVENT_VENUE_MAP)
  -> Mark ready (Control Room: Mark ready button)
  -> Make visible in UI (Control Room: Go live button)
  -> Document exceptions (Documentation Mode: DEVELOPMENT_LEDGER.md)
```

Steps 1-3 are now fully automated for supported templates. Steps 4-7 require human judgment and are intentionally manual.

---

### Data quality repair

```
Audit Mode: run audit, identify exact failure points
  -> Build Mode: fix the specific failure (repair seed, migration, or RPC update)
  -> Audit Mode: re-run audit to confirm resolution
  -> Document Mode: update DEVELOPMENT_LEDGER.md exceptions table
```
