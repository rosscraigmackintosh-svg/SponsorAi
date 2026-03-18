# DEVELOPMENT_LEDGER.md

SponsorAI — Current Development State

Last updated: 2026-03-18 (Entity Source Manager MVP + second-pass refinements shipped. Coverage Monitor handoff links + Needs Attention default filter added. Admin Build Ledger created at `project-docs/ADMIN_BUILD_LEDGER.md`. Newcastle Red Bulls image pipeline formalised. `source_type` constraint extended to include `redbull_api`. Premiership Rugby team-player relationships backfilled (416 rows across 10 teams). ESM roster loading upgraded to three-step fallback: relationships primary, reverse-relationships secondary, image-note inference tertiary. Admin Feature Backlog at `project-docs/ADMIN_FEATURE_BACKLOG.md`.)

---

## Purpose

A living record of what is built, what is stub-only, what is broken, and what the next likely engineering decisions are. Update this file when the development state changes.

The authoritative technical source for prototype internals is:
`_internal/prototype-archive/HANDOVER.md`

The authoritative issue list is the March 2026 code review at:
`_internal/06_Experiments/SponsorAI_Code_Review.md`

The admin and internal tooling feature backlog is at:
`project-docs/ADMIN_FEATURE_BACKLOG.md`

---

## Prototype Status

### What is active and functional

| Surface | Status | Notes |
|---|---|---|
| Control Room (`app/control-room.html`) | Active — v1.2 (auth guard + session JWT, 2026-03-15) | Internal-only page. "Start ingestion" calls `build_series_structure` RPC. Row menu: Run audit, Run again, Scan images, View images, View entities, View changes, Edit run, Checklist, Readiness, visibility controls, Archive run, Delete permanently. Archive: soft-delete. Delete: cascade removes checklist+log+run. loadIngestionRuns filters archived=eq.false. Section 2.5 (Images): full image audit surface. Readiness sub-row: toggled via "Readiness" menu item, shows Entities/Bios/FanScore/Images/Visibility metrics with is-ok/is-gap colour coding. Entity viewer modal: queries Supabase for all properties in the series via property_relationships + lists name, type, FanScore, image status, visibility. View changes modal: parses control_room_log for the run_id, groups entries into Created/Updated/Skipped/Errors, shows summary stat counts; falls back to best-effort message for older/incomplete runs. |
| Explore screen (`app/explore.html`) | Active — in-page header + keyboard shortcut (2026-03-14) | Grid-only layout. Full-page property overlay (scroll-preserving). Load More pagination (24 + 24). Scroll-to-top button. Masonry and list views removed. Search and filter chips now live in-page inside `.explore-header` block (title + search + chips). Content padding-top reduced from 232px to 88px. `/` keyboard shortcut focuses search field. |
| Card grid | Active | Fetches up to 200 cards; renders first 24, loads +24 on demand |
| Type filters | Active | All / Drivers / Teams / Series / Events -- client-side |
| Sport filter | Active (2026-03-14) | Motorsport / Rugby dropdown on Explore. Combines with type filter and search. Button shows active state (accent border + bg). Resets on Clear. Title context: "Motorsport · Athletes" etc. Mobile: visible (enabled button). |
| Geography filter | Active (2026-03-14) | United Kingdom / Continental Europe / Asia dropdown on Explore. Client-side bucket derived from raw `country` + `region` fields (inconsistent ISO codes + full names normalised in `_getGeoBucket()`). UK = ~68 props, Continental Europe = ~39 props, Asia = 1 prop. Combines with sport + type + search. Title context: "Motorsport · United Kingdom · Athletes" etc. Resets on Clear. |
| Confidence filter | Active (2026-03-14) | High / Medium / Low / No score dropdown on Explore. Filters on `c.conf30` (card field for `confidence_band_30d`). High=69, Medium=5, Low=20, No score=15 (suppressed). Participates in `isActive` (drives Clear + has-active-filter) but intentionally omitted from contextual title to avoid noise. Active button state shown. Resets on Clear. |
| Audience filter | Active (2026-03-15) | Under 100k / 100k--1M / 1M+ dropdown on Explore. Filters on `c.followers` (card field for `total_followers_latest`). Buckets: small < 100k, mid 100k--1M, large >= 1M. Properties with null followers excluded from any bucket (no "No audience data" option in v1). Participates in `isActive` (drives Clear + has-active-filter) but intentionally omitted from contextual title (same reasoning as Confidence -- title would become too noisy). Active button state shown. Resets on Clear. Completes the Explore v1 filter set: Type / Sport / Geography / Confidence / Audience all live. |
| AI chat panel | Active | Direct Anthropic API call, CMD-based grid control |
| Property detail panel | Active — full-page overlay (2026-03-14) | Full-page overlay with backdrop blur, closes on backdrop click or Escape, scroll position restored on close. Content: FanScore history, confidence, signals, bio, related properties, recent posts. Action buttons (Watch, Portfolio, Compare) wired to SAI_STORAGE. |
| Theme toggle | Active | Light/dark mode, persisted in localStorage |
| FanScore display | Active — whole numbers (2026-03-16) | 30d average, trend direction, confidence band, coverage %. All score surfaces use `fmtScore()` (Math.round + null guard). 20 previously-suppressed properties fixed via synthetic engagement data in `property_platform_daily_metrics` + pipeline rerun. 15 properties with no `fanscore_windows` row receive a deterministic 45-65 client-side fallback seeded from property slug (Math.imul hash). No visible card shows '--' or a decimal score. |
| Suppression handling | Active | Suppressed cards render `--` instead of score. `sup30 = 'Insufficient data'` cleared by client-side fallback when present. |
| Property images | Active | Typed image asset system (`images.js`). Kinds: car, portrait, logo, venue, series. `EVENT_VENUE_MAP` provides venue image fallback for events. Car assets apply CSS zoom + cubic-bezier ease-out on hover. 93 PROPERTY_IMAGES entries; 19 EVENT_VENUE_MAP entries. Premiership Rugby ecosystem: series, venue, 10 team logos, governing body all in images.js. entity_images: 13 confirmed rows post 2026-03-14 cleanup (bath, bristol, exeter, gloucester, harlequins, leicester, newcastle, northampton, sale, saracens, premiership-rugby series, premiership-rugby-ltd, + bath previously confirmed). Event (premiership-rugby-final-2026) uses EVENT_VENUE_MAP fallback. Athletes: 11 pending portrait sourcing. Governance: `hosted: true` flags local assets; `SAI_IMAGES` IIFE provides `audit()`, `list()`, `risky()` helpers. **Audit state (2026-03-15):** 93 total, 18 local, **0 risky**. All Priority 1 (4 venue/logo hotlinks) and Priority 2 (12 rugby CDN badges) migrated to `assets/venues/` and `assets/logos/`. Remaining external sources: britishgt.com (46), gt-world-challenge-europe.com (9), wikimedia (7), msv-azure-cdn (4), 5 moderate-risk team sites. |
| Sort controls | Active | Sort menu UI with alpha, score, followers, engagement, trend, and Trending options. Triggered from explore header. |
| Momentum signals | Active | Signal badges on cards and in panel. `computeMomentumScore()` derives up to 2 badges (Rising Fast, Growing, Losing Momentum, High Engagement, Audience Surge) from `t30`, `engRate30d`, `followersDelta`, `followers`. Suppressed cards show no badges. Panel section 4b renders when signals are present; omits section entirely when none. |
| CSS token spacing | Active | Spacing rhythm pass applied 2026-03-13. Five raw-px values replaced with semantic tokens (`--spacing-xs` through `--spacing-xl`). |
| Shared UI helpers (`app/ui-helpers.js`) | Active — v1.1 (2026-03-16) | `window.SAI_UIH` namespace. Centralises: `initTheme`, `navigateTo` (global alias), `initMenuListeners`, `typeBadgeHtml`, `fanScoreText`, `trendText`, `trendColor`, `propertyCountText`, `isOnWatchlist`, `isInPortfolio`, `isInCompare`, `errorHtml`, `loadingHtml`, `userErrorHtml` (NEW). `userErrorHtml(opts)` is the SponsorAI shared user-facing error pattern: takes `{ explanation, nextStep, helpLine, actions }` and returns HTML for a structured outcome block. CSS classes produced: `.user-err-explanation`, `.user-err-next-step`, `.user-err-help-line`, `.user-err-actions`, `.user-err-action-link`. Add these to the page stylesheet at point of use. Full pattern documented in JSDoc: title (what happened) / explanation (why) / nextStep (how to fix) / helpLine (who to contact) / actions (optional links). |

### What exists as stub only

| Surface | Status | Notes |
|---|---|---|
| Control Room — entity creation SQL | Not started | Start ingestion creates a run record and runs the audit. The actual property/account/post data population is still manual via Supabase SQL editor. |
| Compare view (`app/compare.html`) | Active -- improved (2026-03-15) | 3-way side-by-side comparison. URL-driven (?a=slug&b=slug&c=slug). localStorage-driven fallback. Handles 0/1/2/3 selection states with status feedback. Table scales to 2 or 3 columns. Clear selection + save-as-link. Rows (2026-03-15): FanScore 30d, FanScore 60d, FanScore 90d, Trend 30d, Confidence, Followers, Followers change (30d) [new -- signed delta with k/M shorthand, positive/negative colour via arrC()], Posts (30d), Total interactions (30d) [new -- k/M shorthand], Engagement rate, Sport, Region. `cols` query updated to include `followers_net_30d` and `total_interactions_30d`. Single-property arrival state fix (2026-03-15): `updateComparison()` now called on init when `selCount > 0`; partial-state message ("Select 1 more property") renders correctly when arriving via `?a=slug` from Board or Watchlist. |
| Portfolio view (`app/portfolio.html`) | Active — improved empty state (2026-03-14) | Table layout. Loads live data from Supabase for saved slugs. Summary stats bar (count, avg FanScore, rising count). Remove, View, Compare actions all functional. SAI_STORAGE wired. Empty state: "Your portfolio is empty" / "Add properties to start tracking potential sponsorship opportunities." |
| Watchlist view (`app/watchlist.html`) | Active — improved (2026-03-15) | List layout. Loads live data from Supabase for saved slugs. Remove, View, Compare actions functional. SAI_STORAGE wired. Empty state: "Your watchlist is empty" / "Add properties from Explore to track their momentum." Item name now a clickable link to `property.html?slug=...&ref=watchlist` (2026-03-15). View button also passes `&ref=watchlist` for origin-aware back button. |
| Brand account (`app/account.html`) | Active — V1 (2026-03-15) | Email-only identity gate (`sai_account_v1`). Sidebar: Overview, Profile, Introductions (live), Settings (stub). Brand Profile form: 4 sections, 8-field completeness bar, save/load via Supabase REST. Introductions panel (2026-03-15): stat summary (sent/accepted/declined/pending -- pending includes nudged), lazy-loaded request list newest-first, expandable cards showing full message + vertical event timeline (events cached per request). Batch property name lookup on load. Contextual reminder/closure CTAs rendered per card via `renderIntroCardActions(req)`: "Send reminder" (after 7 days, status=sent), countdown note (not yet eligible), "Reminder sent + Close option" (status=nudged; Close available after 14 further days), "Closed on DATE" (status=closed_no_response). Session reset clears cache + panel state. Overview panel stats (`stat-intros`, `stat-accepted`) updated from intro data. V2: Supabase Auth. |
| Introduction system | Active — V0.2 gated (2026-03-16) | `introduction-request` Edge Function v11: upsert brand profile, **deduplication check (step 3, NEW)** -- queries active requests (status IN submitted/pending_property_claim/sent/nudged) for same brand+property; returns HTTP 409 `{ error: "duplicate_active_request", message: "You already have an active introduction request for this property.", existing_request_id, existing_status }` if found; otherwise proceeds to create. `introduction-respond` Edge Function v11: token-based accept/decline, sends paired intro emails on accept; handles nudged status identically to sent; closed_no_response treated as terminal. `introduction-remind` Edge Function v1: POST `{ request_id, brand_email, action }`. action=remind: verifies brand_email, checks status=sent + nudged_at IS NULL + 7+ days, sends reminder, sets nudged + nudged_at. action=close: checks nudged + 14+ days since nudged_at, sets closed_no_response + closed_at. DB constraint: `intro_req_active_dedupe_uix` partial unique index on `(from_profile_id, to_property_slug) WHERE status IN ('submitted','pending_property_claim','sent','nudged')` -- DB-level backstop enforced independently of application layer. Live DB: 2 test duplicate rows closed to `closed_no_response` to allow index creation; live status constraint + nudged_at/closed_at columns patched 2026-03-16. DB: `profiles`, `introduction_requests` (nudged_at, closed_at), `introduction_events`. Statuses: submitted / pending_property_claim / sent / nudged / accepted / declined / intro_completed / closed_no_response. Reminder eligibility: REMIND_AFTER_DAYS=7, CLOSE_AFTER_DAYS=14. Email: Resend. Secrets required: `RESEND_API_KEY`, `INTRO_FROM_EMAIL`. Remaining gaps: Resend secrets not yet set, rate limiting, property claim flow, re-request after terminal status not yet surfaced in UI, V2 auth + RLS. |
| Property profile (`app/property.html`) | Active — workflow-aware (2026-03-16) | Full property view. FanScore card, audience signals, momentum chart, ecosystem, similar opportunities, recent posts. Watchlist/portfolio/compare/board actions wired to SAI_STORAGE. Smart Recommendations (similar properties by sport/type/region/audience, 2026-03-15). Mobile responsive layout (2026-03-15). Board button navigates to Board when property already tracked, instead of silently removing (2026-03-15). Origin-aware back button via `?ref=` URL parameter: maps board/watchlist/opportunities/portfolio/explore to correct destination page and aria-label; falls back to Explore (2026-03-15). Intro modal outcome system (2026-03-16): `showIntroOutcome(opts)` replaces all manual outcome-state manipulation. Takes `{ title, body?, explanation?, nextStep?, helpLine?, actions?, closeLabel?, info? }`. `info:true` sets `.intro-success-state--info` modifier (neutral icon). New DOM slots `#intro-outcome-detail` + `#intro-outcome-actions` in the success state HTML; both hidden by default; reset in `openIntroModal`. 409/duplicate: structured copy ("You already have an active introduction request...", explanation, nextStep, helpLine, Go to My Account link, "Stay on this page" close label). Generic server error: "We couldn't send your request. Please try again, or contact us at hello@sponsorai.com." (no raw JSON exposed). Pending success (`pending_property_claim`): title "Request received". Normal success: title "Request sent". CSS: `.user-err-*` classes + `.intro-outcome-*` classes added to property.html style block. |
| Opportunities (`app/opportunities.html`) | Placeholder | Bridge content only (top 5 FanScore properties). Not in main nav. Page loads directly but is not linked from primary navigation. |
| Scenarios | Removed | Nav item removed from all pages |
| Reports | Removed | Nav item removed from all pages |
| Shared storage module (`app/storage.js`) | Active | SAI_STORAGE.watchlist / .portfolio / .compare (max 3) / .board. Board stores stage-keyed object `{ watching, shortlist, evaluation, confirmed }` via `makeBoard('sai-board')`. `addToStage()` auto-removes from previous stage. `isOnBoard()`, `getSlugStage()`, `moveToStage()`, `removeFromBoard()` all available. |
| Market Board (`app/board.html`) | Active — improved (2026-03-15) | Kanban workspace with 4 stages: Watching, Shortlist, Under Evaluation, Confirmed. Loads all board slugs, single API call, distributes to columns. Cards: name (clickable link to property.html?ref=board, 2026-03-15), flag, type badge, sport, FanScore (type-coloured), audience, trend arrow, confidence_band_30d (right-aligned third column in signals row, 2026-03-15). Drag-and-drop between columns (HTML5 native). Move dropdown for non-drag move. Remove button. View button passes `&ref=board`. Empty state per column. Dynamic header copy: "Browse Explore to add properties" (empty) / "Add more from Explore" (non-empty, 2026-03-15). Board state persisted in localStorage via SAI_STORAGE.board. "Add to Board" button in Explore panel (panel.js dp-btn-board) and on property.html prop-actions row. Navigation updated on all 5 pages to include Board link. |
| Image asset registry (`app/images.js`) | Active — governance pass (2026-03-15) | 93 entries. Schema extended with optional `hosted` (bool) and `source_host` (string) fields; ignored by renderer, used by audit helper. `SAI_IMAGES` audit namespace added: `audit()` returns grouped stats by host, `list()` returns console.table-friendly flat array, `risky()` returns entries on known unstable hosts. Live counts (2026-03-15): 93 total, 2 local (hosted), 91 external, 16 risky (silverstone.co.uk x1, spa-francorchamps.be x1, barwellmotorsport.co.uk x1, emilfreyracing.com x1, cortextech-cdn x5, incrowdsports-cdn x7). Full migration spec at `assets/IMAGE_MIGRATION.md`. |
| FitScore | Not started | Referenced in docs; no data in schema, no UI |
| Sparkline charts — FanScore (small) | Active (property page + panel only) | Rendered in FanScore block on property.html via `renderSparkline()`. 120x48 SVG, async after sparks load. Also in Explore detail panel (panel.js, dp-spark-chart) and Compare panel (explore.html, compare-spark). Card sparklines removed 2026-03-15: `.card-spark` IIFE and CSS removed from card.js + styles.css to reduce discovery-card noise. `renderSpark()` in data.js preserved as shared utility. |
| Momentum chart (large) | Active | Rendered in Momentum section on property.html via `renderMomentumChart()`. Full-width 600x72 SVG with date labels. Metric tiles (30d/90d change, daily trend) rendered synchronously via `renderMomentumMetrics()`. |
| Search input | Active (2026-03-14) | Fixed search bar below filter chips. Client-side, 140ms debounced. Matches: name, slug, type label, sport, region, city. Works alongside type filter and sort. Clear button shown when active. Empty state message includes search term. |
| Pagination | Active — client-side (2026-03-14) | PAGE_SIZE=24. First 24 rendered on load/filter/sort. Load More appends +24. Full 200-card fetch preserved. Footer shows count + Load More button. |
| Panel relationship sections | Active | DB-backed; `loadRelationships()` queries `property_relationships` forward+reverse; grouped by `REL_LABELS` with 20 type×direction mappings; capped 8 per group; renders clickable `.dp-rel-item` rows |
| Momentum signals | Active | `computeMomentumScore()` in `data.js`; up to 2 badges per card; panel section 4b rendered conditionally; suppressed cards show no badges |
| Trending sort | Active | Trending sort option in explore sort menu; momentum_score derived client-side |
| Key Facts enrichment | Active | `sport`, `region`, `city` fetched from `v_property_summary_current` (view updated 2026-03-13 to expose these columns); rendered in panel Key Facts section |

---

## Known Issues

Derived from the March 2026 code review. Full detail at:
`_internal/06_Experiments/SponsorAI_Code_Review.md`

### Critical — security

1. **Anthropic API key in browser JS** (`app/config.js`)
   Keys are now isolated to `app/config.js` (gitignored) and no longer committed to the repository. The key is still visible in browser DevTools to anyone with local access. Must be proxied through a backend function (e.g. Supabase Edge Function) before wider sharing. Rotate the key if it has previously been shared in a committed file.

2. ~~**Supabase anon key in browser JS** (`app/config.js`)~~ — FULLY HARDENED 2026-03-15
   Key isolated to `app/config.js` (gitignored). RLS enabled on all tables. Four migration passes applied:
   `harden_control_room_anon_write_policies` (2026-03-14): series_visibility anon_all dropped; entity_images anon DELETE dropped.
   `tighten_cr_table_write_policies` (2026-03-15): ingestion_runs and ingestion_run_checklist -- anon SELECT only; authenticated ALL.
   `finalise_anon_write_lockdown` (2026-03-15): control_room_issue_states anon INSERT/UPDATE/DELETE dropped; control_room_log anon INSERT dropped; entity_images anon INSERT/UPDATE dropped.
   Final anon write surface (full DB scan confirmed): only `email_signups` anon INSERT remains. This is intentional -- the public website signup form requires it.
   All other tables: anon SELECT only. CR writes arrive as authenticated role via session JWT.
   Remaining risk: anon key is visible in DevTools. This is unavoidable for a browser-based client. Key is low-value (anon role, no bypass of RLS). Consider rotation if key was ever shared outside a private context.

3. ~~**Investor portal credentials hardcoded in `website/investor-auth.js`**~~ RESOLVED 2026-03-14. Hardcoded `investor / SponsorAI2026` credentials removed entirely. Replaced with Supabase Auth magic link flow. `investor_allowlist` table created in Supabase with RLS (authenticated users can SELECT only their own row). Login page replaced with email-only field. Portal body starts `visibility:hidden` and is revealed only after (1) a valid Supabase session is confirmed and (2) the user's email is found in `investor_allowlist`. Portal signup form now writes real rows to `email_signups` (source: `investor-portal`). All hardcoded fallback paths removed. See WORKING_CONTEXT for detail.

### High — correctness

4. ~~**Scoring model weights hardcoded in SQL, not read from `fanscore_models.weights_json`**~~ FULLY RESOLVED 2026-03-14. Two migrations applied: (1) `fanscore_model_driven_weights` -- `compute_fanscore_daily` reads weights from `fanscore_models.weights_json` using the supplied model version, eliminating hardcoded 0.65/0.15/0.20 literals. (2) `fanscore_active_model_version_in_recompute` -- `build_series_structure` no longer hardcodes `'v1.0'`; instead calls `get_active_fanscore_model_version()` helper which reads `is_active = true` from `fanscore_models` with a RAISE EXCEPTION guard if no active model exists. Helper function granted to anon and authenticated. Verified: re-run of 2026-03-13 produced identical scores and hashes for all 5 sampled properties across both series.

5. ~~**`v_property_summary_current` column names diverge between master schema and `ui_data_layer.ts`**~~ RESOLVED 2026-03-14. The master schema contained the pre-migration view definition using old column aliases (`p.name` unaliased, `latest_fanscore`, `latest_score_date`, `avg_30d`, `trend_30d`, etc.) and referenced the now-removed helper views `v_fanscore_daily_current` / `v_fanscore_windows_current`. The TypeScript layer was correctly written against the live view. Fix: `001_master_schema.sql` view definition replaced with the live state (full column list with aliases matching live DB and TypeScript: `property_name`, `as_of_day`, `model_version`, `avg_score_30d`, `trend_value_30d`, etc.; adds social aggregation joins, relationship arrays, bio/slug, sport/region/city, visible_in_ui, WHERE occurrence filter). Example queries in the schema comment block updated to use new column names. `PropertyType` in `ui_data_layer.ts` expanded from `'driver' | 'team' | 'series' | 'event'` to include `'athlete' | 'venue' | 'governing_body'` to match the live `property_type_enum`. Remaining gap: `toWin(v, '60d')` and `toWin(v, '90d')` access columns the view intentionally does not expose (the view provides only `avg_score_60d` and `avg_score_90d` + `trend_value_90d` for those windows); at runtime those fields return null which is handled gracefully, but `PropertyDetail.win60d` / `win90d` are partially-populated `WindowSnapshot` objects by design.

6. ~~**`compute_fanscore_windows` does not write `suppression_reason`**~~ RESOLVED 2026-03-14. The master schema function body was the pre-migration-008 definition. Five differences from the live DB were identified: (1) `suppression_reason` missing from INSERT column list; (2) `suppression_reason` CASE expression absent from SELECT; (3) `suppression_reason = EXCLUDED.suppression_reason` absent from ON CONFLICT UPDATE; (4) WHERE clause incorrectly excluded `fd.fanscore_value IS NOT NULL`, preventing suppressed rows from being counted in `anomaly_days_count`; (5) `REGR_SLOPE` used `EXTRACT(EPOCH FROM ...)` instead of `::float8` casts; (6) `confidence_band` CASE lacked the leading `< 0.6 → 'Low'` guard. Fix: `001_master_schema.sql` function body replaced with the live version (migration 008 state). No new Supabase migration required -- the live DB already holds the correct function. A schema rebuild from repo now produces a database where `fanscore_windows.suppression_reason` is populated for low-coverage windows.

7. **`MODEL_VERSION` hardcoded in TypeScript as `'v1.0'`**
   The UI will not pick up a new active model version until the constant is manually updated.

8. **Typo in TypeScript interface: `isSupressed` (missing one `p`)**
   Propagates through both `LatestDailyScore` and `ScorePoint` interfaces.

9a. ~~**Social metrics and momentum signals silently returning null for all anon users**~~ RESOLVED 2026-03-14. Root cause: `v_property_summary_current` and `v_property_posts` are SECURITY INVOKER views. Their JOINs to `accounts`, `raw_account_followers`, `raw_posts`, `raw_post_daily_metrics`, and `property_platform_daily_metrics` all executed as the `anon` role, which had RLS enabled on those tables but no SELECT policies. Result: every social aggregation (total_followers_latest, followers_net_30d, posts_30d, total_interactions_30d, engagement_rate_30d_pct, platforms_active) returned null for all properties. Downstream: `computeMomentumScore()` returned [] for all properties, disabling momentum badges (Rising Fast, Growing, Losing Momentum, High Engagement, Audience Surge) on every card and panel. AI system prompt showed 0 for all social context. Fix: migration `anon_read_social_tables` added `FOR SELECT TO anon USING (true)` policies to all five tables. Verified: v_property_summary_current now returns real follower counts (Valentino Rossi: 8.6M, Premiership Rugby: 804k, British GT: 544k), non-null engagement rates and platform arrays for all sampled properties.

9. ~~**Email signup form captures nothing**~~ RESOLVED 2026-03-14. `email_signups` table created in Supabase with RLS (anon INSERT only, authenticated SELECT only). `website/script.js` now POSTs to Supabase REST API. Duplicate emails handled gracefully (unique index on `lower(email)`). `website/config.js` (gitignored) holds credentials; `website/config.example.js` is the tracked template. Verified: test insert confirmed end-to-end.

### Medium — performance

10. **Correlated subqueries in `compute_fanscore_daily`** — acceptable for current dataset size; will degrade at production scale.

11. **Sequential fetches with large URL parameter** — second Supabase fetch passes all 200 UUIDs as a URL string (~7,500 characters). Fragile at scale.

12. **Missing index for `suppression_reason IS NOT NULL` filter** — documented as acceptable for demo.

### Low — maintainability

13. ~~`explore.html` is a 3,699-line monolithic file — CSS and JS are not separated.~~ RESOLVED 2026-03-13. `explore.html` has been split into layered files: `styles.css`, `data.js`, `components/card.js`, `components/layout.js`, `components/panel.js`, `ui.js`, `ai.js`, `config.js`. The inline script now contains only two init IIFEs (`initLayout`, `initTheme`), two document-level event listeners, and the `init` IIFE. See `project-docs/REFACTOR_SUMMARY.md`.

14. CSS variable forward references in `:root` — works in all modern browsers but reduces legibility.

15. Inline onclick handlers in dynamically built HTML strings — event delegation would be cleaner.

16. `escHtml` function defined after first use — works due to function hoisting, but inconsistent.

17. ~~Detail panel action buttons are non-functional stubs.~~ RESOLVED 2026-03-14 -- all three panel action buttons (Watch, Portfolio, Compare) are fully wired. See WORKING_CONTEXT for detail.

18. Old prototype files in `prototype-archive/Old/` are not yet formally archived to `99_Archive/`.

19. `console.log` statements in production-facing website code expose internal state in DevTools.

20. ~~**Master schema is not the source of truth for the live database**~~ RESOLVED 2026-03-14. Full consolidation applied. All table shape drift between the original master schema and the live database is now resolved. Specifically: `property_type_enum` expanded from 4 to 7 values (`athlete`, `venue`, `governing_body` added). `properties` table expanded from 8 to 19 columns (`sport`, `slug`, `country_code`, `city`, `region`, `latitude`, `longitude`, `event_end_date`, `metadata`, `visible_in_ui`, `hidden_reason`). `accounts` gains `platform_user_id`. `raw_posts` gains `platform_post_id`. `raw_account_followers` gains `is_estimated` and `data_source`. `fanscore_windows` gains `suppression_reason`. All 8 missing indexes added. Column counts verified against live DB: all 6 affected tables match exactly (properties: 19, accounts: 10, raw_posts: 10, raw_account_followers: 8, fanscore_daily: 12, fanscore_windows: 15). Note: tables added entirely by later migrations (property_relationships, series_visibility, entity_images, ingestion_runs, control_room_log, control_room_issue_states, ingestion_run_checklist, email_signups, investor_allowlist, v_property_posts view) are not in 001_master_schema.sql and are not expected to be -- they represent architectural additions beyond the base schema. A full rebuild still requires running those migrations after the base schema.

22. **`series_visibility` table does not auto-populate when a new ingestion run is created.** A new series added via "Start ingestion" creates a row in `ingestion_runs` but no corresponding row in `series_visibility`. Its visibility defaults to `{ ready_for_ui: false, visible_in_ui: false }` (derived from `visData()` fallback). The Control Room shows "Hidden" for such series. The operator must click "Mark ready" or "Go live" to create the row and set flags. This is intentional -- new data is hidden by default -- but the absence of a DB row means the `series_visibility` table does not capture the hidden state explicitly until the operator takes action.

21. ~~**GTWCE 2024 migrations applied directly, not tracked as SQL files.**~~ RESOLVED 2026-03-14. Seven GTWCE migrations were applied to the live database without corresponding SQL files in the repo. `database/seeds/gtwce_2024_full.sql` has been created as a complete, idempotent creation seed covering: 1 series + 1 governing body + 7 teams + 10 GTWCE-only athletes + 5 shared British GT athletes (relationship only) + 10 events + 8 venues + 43 social accounts + 91-day synthetic follower history + synthetic posts + per-post metrics + series_visibility record. All statements use ON CONFLICT DO NOTHING. Safe to run on an empty database (after 001_master_schema.sql + british_gt_2024_seed_confirmed.sql) or on the live database. Live DB verified against seed: all entities, relationships, accounts, follower rows, and posts confirmed present. Note: `series_visibility` table was empty on live DB at time of seed creation. Row for `gt-world-challenge-europe` (`ready_for_ui: true, visible_in_ui: true`) inserted directly 2026-03-14. Verified present. No further gap.

---

## Next Likely Engineering Tasks

These are the most impactful improvements to work toward, roughly ordered by priority:

**Security (prerequisite for wider sharing)**
- ~~Proxy the Anthropic API call through a Supabase Edge Function or similar backend~~ DONE -- API key removed from browser scope; chat proxied through `supabase/functions/chat`
- ~~Enable Row-Level Security on all Supabase tables~~ DONE 2026-03-14 -- RLS enabled on all tables; anon SELECT on data tables; social tables unblocked 2026-03-14
- ~~Replace investor portal credentials with a real auth mechanism~~ DONE 2026-03-14 -- Supabase Auth magic link flow implemented; `investor_allowlist` table with RLS created
- Rotate any API keys that have been shared externally
- Tighten anon write access on control room tables (ingestion_runs, entity_images, series_visibility, control_room_*, ingestion_run_checklist) -- require `authenticated` role for all writes before broader sharing

**Business-critical**
- ~~Fix the website email capture~~ DONE 2026-03-14 -- signups now stored in `email_signups` table via Supabase REST. RLS enforced. Verified end-to-end.
- Review signups via Supabase dashboard → Table Editor → email_signups (requires authenticated session)

**Data model integrity**
- ~~Fix the scoring function to read weights from `fanscore_models.weights_json` dynamically~~ DONE 2026-03-14 -- `compute_fanscore_daily` reads from `fanscore_models.weights_json`; `build_series_structure` calls `get_active_fanscore_model_version()`
- ~~Align `v_property_summary_current` column names across schema, TypeScript, and JS~~ DONE 2026-03-14 -- master schema view and `ui_data_layer.ts` `PropertyType` updated
- ~~Sync `compute_fanscore_windows` suppression logic (migration 008) into master schema~~ DONE 2026-03-14 -- function body replaced with live version
- ~~Consolidate migrations 006–007 (and all later table shape changes) into the master schema file~~ DONE 2026-03-14 -- all 6 affected tables and 8 missing indexes consolidated; enum corrected to 7 values

**Structural maintainability**
- ~~Split `explore.html` into separate CSS and JS files~~ DONE 2026-03-13 — see `project-docs/REFACTOR_SUMMARY.md`
- Migrate direct REST calls to use the Supabase JS SDK pattern defined in `ui_data_layer.ts`
- Move TypeScript data layer into active use

**Product features**
- ~~Implement property detail panel action buttons~~ DONE 2026-03-14 -- Watch, Portfolio, Compare fully wired in panel and card overlay
- ~~Implement persistent watchlist/compare/portfolio state~~ DONE 2026-03-14 -- SAI_STORAGE wired across all pages; cross-page state sync confirmed
- ~~Watchlist/Portfolio card button state stale after panel action~~ DONE 2026-03-14 -- syncWatchlistButtons/syncPortfolioButtons helpers added; all toggle paths now cross-update card and panel buttons immediately
- Property profile momentum charts -- replace static sparkline with a proper 30d / 90d change chart on the property profile page (next prioritised UX item)
- ~~Implement sparkline rendering on cards~~ DONE 2026-03-14 -- `.card-spark` div added to `renderCard()` in `card.js`; 30d FanScore history line rendered at bottom of each non-suppressed card using `renderSpark()` in type score colour; CSS `.card-spark` + `.card-spark .spark-svg` added to `styles.css`; sparkline hidden in list view.
- ~~Market Board (Kanban opportunity workspace)~~ DONE 2026-03-14 -- `app/board.html` built; SAI_STORAGE.board added to storage.js; "Add to Board" in panel.js + property.html; nav updated on all pages.
- ~~Cross-page workflow navigation continuity~~ DONE 2026-03-15 -- Board card names clickable; Board confidence_band_30d surfaced; Compare single-property arrival state fixed; Watchlist item names clickable; property-page Board button navigates instead of removes; origin-aware back button via `?ref=` parameter; all six entry-point files updated.
- `.prop-action-btn.active` visual differentiation -- Board/Compare active states rely only on label text change; no CSS for the `active` class on these buttons. Add accent border or fill for "On Board" / "In Compare" confirmed states.
- Ecosystem eco-cards collapse to 1 column on mobile (≤640px) -- `minmax(160px, 1fr)` grid collapses too aggressively; 2-column layout at narrow widths would match the similar-grid fix applied in the responsive pass.
- ~~Add image governance schema fields and audit helper~~ DONE 2026-03-15 -- `hosted` + `source_host` optional fields added to images.js schema; `SAI_IMAGES.audit()` / `.list()` / `.risky()` helpers added; 16 risky entries identified (see IMAGE_MIGRATION.md)
- Image migration: replace 16 risky external hotlinks with locally hosted or stable CDN assets — prioritised in `assets/IMAGE_MIGRATION.md`
- Populate missing portrait images: 11 rugby players, 2 motorsport drivers (Boguslavskiy, MacLeod) — sourcing guide in IMAGE_MIGRATION.md

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

| `add_sport_region_city_to_view` | Applied 2026-03-13 | `CREATE OR REPLACE VIEW v_property_summary_current` adds `p.sport`, `p.region`, `p.city` to SELECT; required for Key Facts enrichment (Feature 3) |
| `populate_region_from_country` | Applied 2026-03-13 | 9 country→region UPDATE statements; population script archived as `database/populate_sport_region.sql` |
| `populate_region_remaining` | Applied 2026-03-13 | Confirmed 99/99 region coverage after timeout; see DEVELOPMENT_LEDGER for details |
| `fix_missing_country_codes` | Applied 2026-03-13 | Fixed `country_code = 'GB'` for British GT Donington Park; `country_code = 'IT'` for Giacomo Petrobelli |
| `sro_synthetic_posts_and_metrics` | Applied 2026-03-13 | 30 IG posts + 30 X posts for SRO Motorsports Group; HASHTEXT-seeded; pipeline re-run to produce FanScore |
| `create_run_series_audit_function` | Applied 2026-03-13 | PostgreSQL function `run_series_audit(p_series_slug text)` -- full CTE chain over series ecosystem; RETURNS TABLE 18 columns; SECURITY DEFINER; GRANT to anon, authenticated |
| `create_run_series_audit_summary_function` | Applied 2026-03-13 | `run_series_audit_summary(p_series_slug text)` -- aggregates the audit function into 10-column count summary |
| `create_control_room_issue_states` | Applied 2026-03-13 | `control_room_issue_states` table -- persists resolved/intentional issue states from the Control Room. Schema: id, series_slug, property_id (FK), issue_type, issue_key, state, note, created_at, updated_at. UNIQUE (series_slug, property_id, issue_key). RLS enabled (permissive policies for anon/authenticated). Trigger auto-maintains updated_at. Index on series_slug. |
| `create_ingestion_runs` | Applied 2026-03-13 | `ingestion_runs` table -- tracks each ingestion lifecycle run. Schema: id, series_slug, series_name, season, sport, gov_body_slug, notes, include_teams, include_athletes, include_events, include_venues, synthetic_signals, status (pending/running/needs-review/complete), entity_count, issue_count, started_at, completed_at, created_at, updated_at. RLS enabled (permissive for anon/authenticated). Reuses `set_updated_at()` trigger. Indexes on series_slug and created_at DESC. |
| `create_control_room_log` | Applied 2026-03-13 | `control_room_log` table -- append-only log of Control Room operations. Schema: id, run_id (nullable FK to ingestion_runs, SET NULL on delete), series_slug, tag (audit/ingest/repair/error), message (HTML text), meta (jsonb), created_at. RLS: SELECT + INSERT for anon and authenticated; no UPDATE or DELETE. Indexes on created_at DESC, series_slug, and run_id (partial, WHERE NOT NULL). |
| `create_ingestion_run_checklist` | Applied 2026-03-13 | `ingestion_run_checklist` table -- one row per lifecycle stage per ingestion run. Schema: id (uuid PK), run_id (FK to ingestion_runs, CASCADE DELETE), stage_key (text), state (not_started/in_progress/complete/blocked, CHECK constraint), note (nullable text), updated_at. UNIQUE (run_id, stage_key). Trigger `set_checklist_updated_at` reuses existing `set_updated_at()` function. RLS: permissive all-operations policies for anon and authenticated. |
| `build_series_structure_rpc` | Applied 2026-03-13 | `build_series_structure(p_series_slug text, p_season int, p_sport text, p_include_flags jsonb, p_synthetic_signals boolean) RETURNS jsonb`. SECURITY DEFINER. Two templates: `premiership-rugby` (full creation -- 35 entities, ~45 relationships, optional synthetic signals + scoring pipeline) and `gt-world-challenge-europe` (idempotent repair -- fixes country/region fields, ensures SRO relationship). Returns `{ entities_created, entities_updated, relationships_created, warnings, unsupported_steps }`. Granted to anon and authenticated. |
| `fanscore_model_driven_weights` | Applied 2026-03-14 | `CREATE OR REPLACE FUNCTION compute_fanscore_daily`. Removed hardcoded weight literals 0.65/0.15/0.20. Function now reads `norm_weight`, `growth_weight`, `consistency_weight` from `fanscore_models.weights_json` using the supplied `p_model_version`. RAISE EXCEPTION if model version not found or weights keys missing. `components_json` weights fields now reflect live model values. Zero score change for v1.0. |
| `fanscore_active_model_version_in_recompute` | Applied 2026-03-14 | New helper function `get_active_fanscore_model_version() RETURNS text STABLE` -- reads `model_version` from `fanscore_models WHERE is_active = true LIMIT 1`, RAISE EXCEPTION if none found. Granted to anon and authenticated. `build_series_structure` patched: added `v_model_version text` to DECLARE, replaced two hardcoded `'v1.0'` literals in the premiership-rugby scoring block with `get_active_fanscore_model_version()`. All other RPC logic preserved. Zero score change verified across 5 sampled properties. |
| `anon_read_social_tables` | Applied 2026-03-14 | Added `FOR SELECT TO anon USING (true)` policies on accounts, raw_account_followers, raw_posts, raw_post_daily_metrics, property_platform_daily_metrics. Unblocked social metrics that were silently null due to SECURITY INVOKER view + missing anon SELECT policies. |
| `harden_control_room_anon_write_policies` | Applied 2026-03-14 | Dropped `anon_all` on `series_visibility`; added `anon_read` (SELECT only). Dropped `anon can delete entity_images`. Key rationale: `set_series_ui_visibility()` and `build_series_structure()` are SECURITY DEFINER -- they bypass RLS and do not require table-level anon write policies. Direct anon write to series_visibility (which could hide all 112 Explore properties) is now closed. entity_images DELETE (used by CR "Dismiss suggestion" admin feature) removed as an acceptable prototype trade-off. |
| `tighten_cr_table_write_policies` | Applied 2026-03-15 | Drops all existing policies on `ingestion_runs` and `ingestion_run_checklist`, replaces with anon SELECT only + authenticated ALL on both tables. Enabled by the Control Room auth guard (session JWT now used as Bearer token for all CR fetch calls). `ingestion_runs` and `ingestion_run_checklist` can no longer be written by the anon role. |
| `finalise_anon_write_lockdown` | Applied 2026-03-15 | Drops remaining anon write policies: `control_room_issue_states` anon INSERT/UPDATE/DELETE; `control_room_log` anon INSERT; `entity_images` anon INSERT/UPDATE. All three tables now anon SELECT only. Authenticated retains full access. Post-migration full DB scan confirms only `email_signups` anon INSERT remains (intentional -- public website signup). |
| `introduction_system_v1` (via `20260315000000_introduction_system_v1.sql`) | Applied 2026-03-15 | Creates `profiles`, `introduction_requests`, `introduction_events` tables. `introduction_requests` includes `nudged_at TIMESTAMPTZ` and `closed_at TIMESTAMPTZ` (nullable). Status CHECK constraint covers all 8 values: submitted, pending_property_claim, sent, nudged, accepted, declined, intro_completed, closed_no_response. `set_updated_at` triggers on profiles + introduction_requests. Note: live DB had the table created before nudged_at/closed_at were added; those columns were applied via ALTER TABLE. Migration file now reflects the full intended schema for fresh builds. |
| `introduction_deduplication` (via `20260316000000_introduction_deduplication.sql`) | Applied 2026-03-16 | Adds partial unique index `intro_req_active_dedupe_uix ON introduction_requests (from_profile_id, to_property_slug) WHERE status IN ('submitted','pending_property_claim','sent','nudged')`. DB-level backstop preventing duplicate active requests even if the application-layer check is bypassed. Also applied to live DB: (1) nudged_at/closed_at columns added, status CHECK constraint expanded to 8 values (pre-requisite for closing the 2 test duplicate rows found during index creation), (2) 2 test duplicate adam-smalley requests closed to closed_no_response, (3) index created successfully. |

### FanScore Results — post-repair-sweep (2026-03-13)

GTWCE teams (all High confidence): Manthey EMA 81.99, Akkodis ASP 80.98, Iron Lynx 80.91, Haupt Racing 80.72, Emil Frey 75.51, Boutsen VDS 75.42.

GTWCE athletes (all High confidence): Bortolotti 72.54, Weerts 70.87, Vanthoor 70.71, Juncadella 69.31, Gounon 65.73, Boguslavskiy 62.60, Varrone 62.37, Makowiecki 60.22.

SRO Motorsports Group (governing_body): 70.65, Low confidence. Low confidence is expected — 30 posts over 90 days with no prior scoring history.

GT World Challenge Europe (series): 57.79, High confidence.

### Image fix log (2026-03-13)

Barcelona and Magny-Cours broken images fixed (2026-03-13 session): both were using official circuit site URLs with hotlink protection. Replaced with Wikimedia Commons SkySat aerial URLs.

Monza, Paul Ricard, Misano broken image risk mitigated (repair sweep, 2026-03-13): official circuit site URLs replaced with Wikimedia Commons URLs (Monza: `Monza_aerial_photo.jpg`, Paul Ricard: `Circuit_Paul_Ricard,_April_22,_2018_SkySat.jpg`, Misano: `Misano_World_Circuit_Marco_Simoncelli.jpg`).

Nürburgring: no confirmed Wikimedia Commons aerial alternative found; retains official `nuerburgring.de` URL. Potential hotlink risk. Known outstanding gap.

### Intentional exceptions (repair sweep, 2026-03-13)

| Entity | Exception | Status |
|---|---|---|
| `timur-boguslavskiy` | No portrait URL confirmed — GTWCE portal driver_id known (2090) but photo_id not accessible without direct portal access | Intentional placeholder; to revisit |
| `marco-varrone` | No GTWCE driver page found under this name — portal lists Nico/Nicolas Varrone; name may need reconciliation | Intentional placeholder; entity name to verify |
| 8 GTWCE event entities | No social accounts; suppression reason `'Insufficient data'` | Intentional per Rule 8.4 |
| 6 GTWCE venue entities | No social accounts; suppression reason `'Insufficient data'` | Intentional per Rule 8.4 |
| Nürburgring venue image | Official circuit URL; no Wikimedia alternative confirmed | Known hotlink risk; to address when alternative source identified |

### Newcastle Red Bulls image pipeline (2026-03-17)

Newcastle Red Bulls images are sourced from the official Red Bull CMS API feed and treated as the authoritative source.

**API endpoint:**
```
https://www.newcastleredbulls.com/v3/api/graphql/v1/v3/feed/en-INT
  ?filter[type]=person-profiles&page[limit]=60&rb3Schema=v1:cardList
```

**Transform applied to all player headshots:**
```
c_fill,g_auto,w_300,h_300/q_auto,f_auto
```
Replace `{op}` in raw API URLs with this transform string. The result is a stable Cloudinary CDN URL that auto-crops to a 300x300 square portrait.

**Source priority rule (encoded as `source_type` in `entity_images`):**

| Priority | source_type | Description |
|---|---|---|
| 1 (highest) | `redbull_api` | Official Red Bull CMS API |
| 2 | `manual` | Official site scrape or hand-verified insert |
| 3 | `scan` | Semi-automated scan (Wikipedia / Wikimedia) |
| 4 | `other` | Legacy Excel imports or ad-hoc inserts |

Priority is enforced by insert order (newest `created_at` wins via `order=created_at.asc` in `loadEntityImages()`). Do not delete older rows to assert priority -- insert the higher-trust row after and the resolver picks it up automatically.

**Coverage as of 2026-03-17:** 51 entity_images rows for 50 Newcastle squad members. All players have at least one `redbull_api` row. Five players also have older `manual` rows from a prior Excel import; these are retained for history but superseded by the API row.

**Do not:**
- Replace API images with Excel data or ad-hoc URLs
- Scrape newcastleredbulls.com directly (session-cookie required; unstable)
- Guess Cloudinary IDs without confirming from the API response

**To update images in future:** re-fetch the API endpoint, diff against current `entity_images` rows, insert new rows for changed Cloudinary IDs with `source_type = 'redbull_api'`.

---

### Admin tool limitations — ESM roster inference (updated 2026-03-18)

#### Entity Source Manager: roster loading hierarchy

The Entity Source Manager (`admin-source-manager.html`) determines which athletes belong to a team using a three-step fallback:

1. **`team_has_athlete` (primary):** Queries `property_relationships` where `from_id = team.id` and `relationship_type = 'team_has_athlete'`. No warning shown. Used when real relationship data exists.
2. **`athlete_belongs_to_team` reverse (secondary):** Queries `property_relationships` where `to_id = team.id` and `relationship_type = 'athlete_belongs_to_team'`. No warning shown. Catches cases where the relationship was recorded from the athlete side.
3. **Image notes inference (tertiary):** Falls back to `entity_images.note LIKE '%TeamName%'` substring matching. Fallback notice bar shown. Used only when no relationship data exists.

**Current state (as of 2026-03-18):** Premiership Rugby — 10 teams, 416 `team_has_athlete` rows backfilled via migration `backfill_premiership_rugby_team_has_athlete_relationships`. All 10 rugby teams now resolve via step 1. Newcastle Red Bulls resolves via step 1 (relationships seeded from image notes at backfill time). GTWCE events, Formula E, and any other sport without relationship data still rely on step 3.

**Remaining gap:** Teams without any `property_relationships` data rely on image notes. Players with no image row are invisible in the step-3 fallback. The fallback does not write relationships into `property_relationships`.

**Resolution path:** Extend the backfill pattern to GTWCE, Formula E, and all remaining sports. See `ADMIN_BUILD_LEDGER.md` (2026-03-18 entry) for migration details. Long-term: replace note-based backfill with an authoritative ingestion pipeline that populates `property_relationships` on first data import.

**Related backlog item:** Feature 3.5.1 (Entity Linking Manager) in `project-docs/ADMIN_FEATURE_BACKLOG.md`.
