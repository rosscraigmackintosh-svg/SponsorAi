# WORKING_CONTEXT.md

SponsorAI — Working Context

Last updated: 2026-03-13

---

## Purpose

A short-lived document tracking what was just done, what is in progress, and what comes next. Read this before starting any engineering session. Update at the end of each session.

---

## Last Session — 2026-03-13

### Completed

CSS spacing rhythm polish. Five raw pixel values in `app/styles.css` replaced with semantic tokens (`--spacing-xs` through `--spacing-xl`). Rollback comment block inserted. See `project-docs/DEVELOPMENT_LEDGER.md` for specifics.

Car image transition smoothing. Moved `transition` from the generic `.card-hero img` rule to `[data-img-kind="car"]` only. Changed easing to `cubic-bezier(0.22, 1, 0.36, 1)` with a 0.45s duration. Logos and portraits no longer animate.

GT World Challenge Europe full data insertion. Inserted 6 venues, 8 event brands, 6 teams, 8 athletes. Created 24 social accounts with 90-day HASHTEXT-seeded follower histories. Created IG and X posts with decaying engagement metrics. Ran the full compute pipeline. All 14 GTWCE properties score at High confidence. Two follow-up migrations were required: one to add X posts for accounts that had no posts (causing completeness < 60% suppression), and one to add IG posts for Boguslavskiy and Varrone who had no posts at all.

Image system updates. Added 6 venue, 6 team logo, and 8 athlete portrait entries to `images.js`. Added 18 GTWCE event entries to `EVENT_VENUE_MAP` so events inherit circuit photography as fallback.

Documentation ledger updated. `project-docs/DEVELOPMENT_LEDGER.md` updated to reflect all 2026-03-13 changes.

System stabilisation pass. Documentation updated (DEVELOPMENT_LEDGER.md, SYSTEM_STATE.md, WORKING_CONTEXT.md). Code health verification performed.

---

## Queued — next session

The following have been scoped and are ready to implement, in priority order:

### 1. Panel relationship sections

Add a "Related" section to property panels backed by the `property_relationships` table. Each panel type should show its natural connections:

- Driver / Athlete panel: Drives For (team), Appears In (series)
- Team panel: Series (series they compete in), Drivers / Athletes, Events
- Series panel: Teams, Drivers / Athletes, Events, Venues
- Event panel: Series, Venue, Participating Teams
- Venue panel: Events Hosted

Implementation: the panel already has a `dpRelated()` function using client-side heuristics. Replace or augment it with a live `apiFetch` to `property_relationships` using the panel's property ID, then resolve display names from `allCards`.

### 2. Momentum Signals

Derive `momentum_score` client-side from existing card fields (`c.t30`, `c.engRate30d`, `c.followersDelta`). Emit up to 2 signal badges per card. Signals:

- Rising Fast: t30 > 0.5 and followersDelta > 1000
- Growing: t30 > 0.2
- Losing Momentum: t30 < -0.2
- High Engagement: engRate30d > 3.0
- Audience Surge: followersDelta > 2000

Add badges to card rendering in `card.js`. Add a Momentum Signals section to the detail panel in `panel.js`. Add a "Trending" sort option to the sort menu in `explore.html` and `ui.js`.

### 3. Keyword search

A visible search input field that filters `allCards` by name or type client-side without requiring the AI chat panel.

### 4. Sparkline rendering

Data is already fetched into `c.sparks`. Implement SVG sparkline rendering using the existing `renderSpark()` function in `data.js`. Add to card body or panel.

---

## Key invariants

- Never hardcode hex values. Use CSS custom properties only.
- Never merge FanScore and FitScore into a composite signal.
- FanScore is descriptive, not predictive. No forward-looking language in the UI.
- Confidence is always secondary and clearly labelled.
- Calm, analytical tone. No gamification language.
- All new database migrations must include posts for every platform account created, or completeness will fall below 60% and suppress FanScore.
- Image entries in `images.js` must use the typed format `{ src, kind, fit, pos, pad?, bg? }`. Plain string entries are legacy and should not be added.

---

## Known fragile points

The second Supabase fetch passes all property UUIDs as a URL parameter (~7,500 characters at 200 properties). This is fragile at scale and should be moved to a POST or filtered differently.

`dpRelated()` in `panel.js` currently uses client-side heuristics, not the `property_relationships` table. It will show wrong or incomplete connections until the DB-backed implementation is done.

Investor portal auth is trivially bypassable. Do not share the portal URL publicly.
