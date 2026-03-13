# SYSTEM_STATE.md

SponsorAI — Current System State

Last updated: 2026-03-13 (repair sweep + Phase 1 complete)

---

## Purpose

A point-in-time snapshot of the live system. Read this to understand what is currently deployed and scored. Update whenever the database state or scoring pipeline changes.

---

## Database

Provider: Supabase (PostgreSQL 17)
Project ID: kyjpxxyaebxvpprugmof
Model version in use: v1.0

---

## Properties in Database

### By type

| Type | Count | Notes |
|---|---|---|
| Driver / Athlete | ~20+ | British GT and GTWCE athletes fully scored |
| Team | ~12+ | British GT and GTWCE teams fully scored |
| Series | 2+ | British GT Championship, GT World Challenge Europe |
| Event (brand) | ~16+ | British GT rounds + GTWCE Sprint and Endurance rounds |
| Venue | ~10+ | British GT + GTWCE circuits |

### Series covered (fully populated with social data and scoring)

British GT Championship — all 2024 rounds (Brands Hatch, Silverstone 500, Spa, Snetterton, Oulton Park, Donington Park).

GT World Challenge Europe 2024 — Sprint Cup rounds (Brands Hatch, Misano, Nurburgring) + Endurance Cup rounds (Barcelona, Monza, Paul Ricard, Misano, Magny Cours, Nurburgring) + 6 teams + 8 athletes.

### Scoring pipeline status

All British GT properties: scored, High or Medium confidence.

All GTWCE properties (6 teams, 8 athletes): scored, all High confidence.

GTWCE venues (6) and events (7 of 8): intentionally suppressed -- no dedicated social accounts.

GTWCE Sprint Cup Brands Hatch 2024: scored, High confidence (has dedicated social accounts).

SRO Motorsports Group (governing_body): scored 70.65, Low confidence. Posts added 2026-03-13 repair sweep.

GT World Challenge Europe (series): scored 57.79, High confidence.

---

## Frontend

### Deployed files

| File | Role |
|---|---|
| `app/explore.html` | Main application shell |
| `app/styles.css` | All styling, semantic token system |
| `app/config.js` | API_URL and API_KEY (gitignored) |
| `app/data.js` | Data fetch, type config, utility functions |
| `app/images.js` | PROPERTY_IMAGES registry, EVENT_VENUE_MAP |
| `app/ui.js` | Grid render, filter, sort, panel open/close |
| `app/ai.js` | AI chat panel (Anthropic API direct call) |
| `app/components/card.js` | Card HTML renderer |
| `app/components/panel.js` | Detail panel renderer |
| `app/components/layout.js` | Layout / shell renderer |

### Feature state

| Feature | State |
|---|---|
| Card grid (up to 200 cards) | Active |
| Type filter chips | Active |
| Sort menu (alpha, score, followers, engagement, trend) | Active |
| Property detail panel | Active |
| AI chat panel | Active |
| Dark / light mode toggle | Active |
| FanScore display (30d avg, trend, confidence, coverage) | Active |
| Suppression handling | Active |
| Property images (typed asset system) | Active |
| Car livery zoom + ease-out transition | Active |
| Sparkline charts | Not started — data fetched, never rendered |
| Keyword search | Not started |
| Pagination | Not started |
| Watchlist persistence | Not started (console stub only) |
| Compare view | Stub |
| Portfolio view | Stub |
| Panel relationship sections | Active -- DB-backed, all 10 relationship types, 20 label mappings |
| Momentum signals badges | Active -- up to 2 badges per card; panel section conditional |
| Trending sort | Active |
| Key Facts enrichment (sport, region, city) | Active -- view updated; panel Key Facts populated |

---

## Image Asset Coverage

Images registered in `images.js` as of 2026-03-13 (repair sweep):

Venues: Circuit de Barcelona-Catalunya (Wikimedia Commons), Circuit de Nevers Magny-Cours (Wikimedia Commons), Circuit Paul Ricard (Wikimedia Commons SkySat), Misano World Circuit (Wikimedia Commons), Autodromo Nazionale Monza (Wikimedia Commons), Nurburgring (official site -- known hotlink risk), plus British GT circuits.

Teams: Manthey EMA, Akkodis ASP, Iron Lynx, Haupt Racing Team, Emil Frey Racing, Boutsen VDS — all as kind: logo.

Athletes: Bortolotti, Weerts, Vanthoor, Juncadella, Gounon, Boguslavskiy (no confirmed portrait ID), Varrone (no confirmed portrait ID), Makowiecki.

Event fallbacks: 18 event slugs mapped to venue slugs via EVENT_VENUE_MAP so events without dedicated images inherit circuit photography.

---

## Security Status

| Issue | Status |
|---|---|
| Anthropic API key in browser JS | Isolated to gitignored `config.js`. Not committed. Still visible in DevTools. |
| Supabase anon key in browser JS | Isolated to gitignored `config.js`. RLS not yet enabled. |
| Investor portal credentials hardcoded | Unresolved. Trivially bypassable. |

None of the above are acceptable for production. This is a prototype / investor demo state.
