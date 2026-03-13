# DEVELOPMENT_LEDGER.md

SponsorAI — Current Development State

Last updated: 2026-03-13 (stabilisation pass)

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
| Explore screen (`app/explore.html`) | Active | Live Supabase data, AI chat, filtering, sorting |
| Card grid | Active | Renders up to 200 FanScore cards from live data |
| Type filters | Active | All / Drivers / Teams / Series / Events — client-side |
| AI chat panel | Active | Direct Anthropic API call, CMD-based grid control |
| Property detail panel | Active | Full panel: FanScore history, confidence, signals, bio, related properties. Action buttons (watchlist/compare/portfolio) are console-only stubs. |
| Theme toggle | Active | Light/dark mode, persisted in localStorage |
| FanScore display | Active | 30d average, trend direction, confidence band, coverage % |
| Suppression handling | Active | Suppressed cards render `--` instead of score |
| Property images | Active | Typed image asset system (`images.js`). Kinds: car, portrait, logo, venue, series. `EVENT_VENUE_MAP` provides venue image fallback for events. Car assets apply CSS zoom + cubic-bezier ease-out on hover. |
| Sort controls | Active | Sort menu UI with alpha, score, followers, engagement, trend options. Triggered from explore header. |
| CSS token spacing | Active | Spacing rhythm pass applied 2026-03-13. Five raw-px values replaced with semantic tokens (`--spacing-xs` through `--spacing-xl`). |

### What exists as stub only

| Surface | Status | Notes |
|---|---|---|
| Compare view | Stub | Nav item works; no content |
| Portfolio view | Stub | Nav item works; no content |
| Watchlist view | Stub | Nav item works; card action buttons toggle visually only (no persistence) |
| Scenarios | Stub | Nav item only |
| Reports | Stub | Nav item only |
| FitScore | Not started | Referenced in docs; no data in schema, no UI |
| Sparkline charts | Not started | Data is fetched and stored in `c.sparks` but never rendered |
| Search input | Not started | Search is chat-only; no keyword search field exists |
| Pagination | Not started | Hard limit of 200 cards; no infinite scroll |
| Panel relationship sections | Not started | Planned: DB-backed relationship display (Drives For, Appearing In, Venue, etc.) using `property_relationships` table |
| Momentum Signals | Not started | Planned: signal badges on cards (Rising Fast, Growing, Losing Momentum, High Engagement, Audience Surge) + panel section |
| Trending sort | Not started | Planned: `momentum_score` derived from t30, engRate30d, followersDelta; Trending sort option in explore |

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

17. Detail panel action buttons are non-functional stubs that appear interactive.

18. Old prototype files in `prototype-archive/Old/` are not yet formally archived to `99_Archive/`.

19. `console.log` statements in production-facing website code expose internal state in DevTools.

20. Master schema is not the source of truth for the live database — migrations 006–008 are not consolidated.

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
- Implement property detail panel action buttons — panel renders fully; watchlist/compare/portfolio actions in `dpAction()` are console-only stubs
- Implement sparkline rendering (data is already fetched and stored in `c.sparks`)
- Populate `image_url` with real property images
- Implement persistent watchlist/compare/portfolio state

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

### Post-migration FanScore Results (GTWCE, 2026-03-13)

All 14 GTWCE properties score at High confidence after the completeness fix migrations.

Teams: Manthey EMA 81.99, Akkodis ASP 80.98, Iron Lynx 80.91, Haupt Racing 80.72, Emil Frey 75.51, Boutsen VDS 75.42.

Athletes: Bortolotti 72.54, Weerts 70.87, Vanthoor 70.71, Juncadella 69.31, Gounon 65.73, Boguslavskiy 62.60, Varrone 62.37, Makowiecki 60.22.
