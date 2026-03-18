# ADMIN_BUILD_LEDGER.md

SponsorAI — Admin and Data Layer Build Log

Last updated: 2026-03-18

---

## Purpose

Single source of truth for all admin tooling, data pipeline work, schema changes, and internal process decisions in SponsorAI. Every item that affects data integrity, image sourcing, ingestion behaviour, or admin tooling must have an entry here.

This ledger is separate from the main `DEVELOPMENT_LEDGER.md` (which tracks the full product) and from `ADMIN_FEATURE_BACKLOG.md` (which tracks future work). The Build Ledger captures what was done, why, and what the lasting effects are.

---

## Entry template

```
### [YYYY-MM-DD] Entry title

**Date:** YYYY-MM-DD
**What was built:** One-sentence summary.
**Why:** The problem or need that drove this work.
**Key behaviour:** How it works. What it does and does not do.
**Data impact:** Tables, rows, migrations, or schema changes affected.
**UI affected:** Pages, components, or user-facing surfaces changed.
**Limitations:** Known gaps, edge cases, or intentional constraints.
**Follow-ups:** Linked backlog items, open questions, or next steps.
```

---

## Entries

---

### [2026-03-18] Team-player relationships — first-class data and ESM/CM improvements

**Date:** 2026-03-18
**What was built:** Made team-to-player relationships a first-class database concept for Premiership Rugby, updated the Entity Source Manager roster loading to use a three-step fallback hierarchy, added `?focus=SLUG` team auto-lookup, added a "Needs attention" default filter to Coverage Monitor, and added a missing-image attention indicator to the ESM roster.
**Why:** The ESM previously relied entirely on `entity_images.note` substring matching to infer roster membership. This was a workaround, not a data model. Proper `property_relationships` rows now exist for all 10 Premiership Rugby teams, and the ESM has been updated to use them as the primary source with the image-note inference demoted to a last-resort fallback.
**Key behaviour:**

- **Database backfill:** 416 `team_has_athlete` rows inserted across 10 Premiership Rugby teams (Bath 19, Bristol 30, Exeter 44, Gloucester 42, Harlequins 42, Leicester 42, Newcastle 51, Northampton 57, Sale 53, Saracens 36). Source: `entity_images.note LIKE 'Prem Rugby {TeamName} - %'`. Uses `ON CONFLICT (from_id, to_id, relationship_type) DO NOTHING`.
- **ESM three-step roster fallback:** (1) `team_has_athlete` from `from_id=team.id` — primary, no warning shown; (2) `athlete_belongs_to_team` where `to_id=team.id` — secondary, no warning shown; (3) image notes LIKE pattern — tertiary, fallback bar shown. Each step is tried only if the previous step returns zero athletes. Steps 1 and 2 require no UI warning because they reflect real data; step 3 is the only mode that shows the fallback bar.
- **`?focus=SLUG` team auto-lookup:** When Coverage Monitor passes `?focus=SLUG` without `?team=` (athlete rows only pass focus, not team), ESM now calls `lookupTeamForFocus()` on load. This queries `properties` for the athlete's `property_id` by slug, then queries `property_relationships` for a `team_has_athlete` edge pointing to that athlete, and sets `ESM.pendingTeamSlug` before `loadTeams()` runs. The team auto-selects and the roster loads, then `applyFocus()` highlights the athlete. Requires a `team_has_athlete` edge to exist; silent fallback if not found.
- **Coverage Monitor "Needs attention" default:** New filter `needs-attention` matches rows where `hasError || noSocial || suppression_reason` is set. This replaces "All" as the default active filter on page load. The "All" button remains available. The filter gives operators an immediate view of properties requiring action without manually triaging the full matrix.
- **ESM missing-image attention indicator:** After roster loads, if `placeholder > 0`, a compact accent bar appears above the filter buttons: "N athletes missing images [View]". Clicking View activates the "Missing image" roster filter. Hides automatically when all athletes have images.

**Data impact:** Migration `backfill_premiership_rugby_team_has_athlete_relationships` applied. 416 `team_has_athlete` rows inserted into `property_relationships`. No schema changes. No other table writes.
**UI affected:** `app/admin-source-manager.html` (three-step fallback in `loadRoster()`, `lookupTeamForFocus()` function, attention bar HTML/CSS/JS, `activateMissingFilter()` helper). `app/coverage-monitor.html` (Needs attention filter button + case in `matchesFilter()`, default `ACTIVE_FILTER` changed from `'all'` to `'needs-attention'`).
**Limitations:** `lookupTeamForFocus()` only resolves a team if a `team_has_athlete` edge exists. If an athlete has no relationship data (e.g. teams not yet backfilled), the team auto-select silently does not occur and the ESM opens without a team pre-selected. The "Needs attention" CM filter treats all suppressed properties as needing attention; properties intentionally and permanently suppressed (e.g. Insufficient data) will always appear in this view. The backfill covers Premiership Rugby only; other sports without `property_relationships` data still rely on image-note inference (step 3).
**Follow-ups:** Extend backfill to GTWCE, Formula E, and other onboarded sports. Consider a `?team=SLUG&focus=SLUG` dual-param handoff in Coverage Monitor manage links for athletes once relationships are confirmed for all teams. "Needs attention" filter refinement: distinguish permanently-suppressed from action-required (Tier 1.5 backlog).

---

### [2026-03-18] Entity Source Manager — second-pass refinements

**Date:** 2026-03-18
**What was built:** Eight improvements to the Entity Source Manager MVP covering Coverage Monitor handoff, roster filters, property page links, queue clarity, write result feedback, resolver-winner badges, fallback bar tone, and documentation.
**Why:** The MVP was functional but lacked navigation context from other admin tools, client-side filtering, and enough signal in the approval queue to support confident decision-making.
**Key behaviour:**

- Coverage Monitor now has a 13th column ("Manage") with per-row links to the ESM. Team rows pass `?team=SLUG`; athlete rows pass `?focus=SLUG`. ESM reads these URL params on load, auto-selects the team (if `?team=`), and highlights the entity row with a brief accent flash (if `?focus=`).
- Roster has a client-side filter bar (All / Confirmed / Missing image / Needs review / Approved queue / Rejected queue). Filters are applied in memory against `ESM.roster` and `ESM.queue`; no re-fetch required.
- Entity names in the roster table are now links to `property.html?slug=SLUG` opening in a new tab.
- Approval queue items show "Current: source_type" and "Candidate: source_type" labels below each image. Confidence bar is now accompanied by a High / Medium / Low text label (High ≥ 0.85, Medium ≥ 0.65, Low < 0.65). Pre-commit summary shows N approved / M rejected / P pending.
- Post-commit result banner replaces `return=minimal` with `return=representation`. HTTP 201 = inserted (new row); HTTP 200 + empty array = skipped (duplicate). Result shows "N inserted / M already existed / P failed".
- `imageCountMap` tracks total row count per entity (alongside `imageMap` which tracks the winning row). Roster shows "N rows" badge next to the source type if the entity has more than one image row in DB.
- Fallback bar text rewritten to calm, operational tone: explains the note-based inference without alarm.
- `property_relationships` limitation documented in `DEVELOPMENT_LEDGER.md` and in this ledger.

**Data impact:** No schema changes. `commitApproved()` changed from `Prefer: return=minimal` to `Prefer: return=representation` to detect duplicates by HTTP status code. No behavioural change for the database.
**UI affected:** `app/coverage-monitor.html` (13th column + Manage links), `app/admin-source-manager.html` (all 8 refinements).
**Limitations:** `applyFocus()` only highlights entities visible in the current roster filter. If the entity is filtered out, the scroll does not occur. The `?focus=SLUG` param only auto-highlights; it does not auto-load a team (team must also be passed via `?team=`). The `return=representation` duplicate detection assumes PostgREST returns HTTP 201 for new rows and HTTP 200 + empty array for ignored duplicates; this matches observed behaviour but is not explicitly guaranteed by the PostgREST specification.
**Follow-ups:** Tier 1.5 features in `ADMIN_FEATURE_BACKLOG.md` (entity debug panel, suppression reason standardisation, ingestion health indicator).

---

### [2026-03-17] Newcastle Red Bulls image pipeline

**Date:** 2026-03-17
**What was built:** Formalised the Red Bull CMS API as the authoritative image source for Newcastle Red Bulls, inserted canonical API image URLs for all squad members, extended the `source_type` check constraint, updated existing rows to `redbull_api`, and documented the priority model.
**Why:** Newcastle Red Bulls player images had been sourced ad-hoc from Excel exports. The official Red Bull CMS API provides stable, official Cloudinary CDN URLs with consistent portrait crops. A formal pipeline was needed to make this repeatable and well-documented.
**Key behaviour:** The Red Bull CMS API feed (`/v3/api/graphql/v1/v3/feed/en-INT?filter[type]=person-profiles`) returns player profiles including headshot URLs with an `{op}` placeholder. Replacing `{op}` with `c_fill,g_auto,w_300,h_300/q_auto,f_auto` produces a stable 300x300 Cloudinary URL. New rows are inserted (not updating existing rows) so historical data is preserved. The resolver in `loadEntityImages()` uses `order=created_at.asc` so the newest insert (the API row) wins per entity without any deletion. The `source_type` column encodes trust level: `redbull_api` > `manual` > `scan` > `other`.
**Data impact:** `entity_images_source_type_check` constraint extended via migration `extend_source_type_check_add_redbull_api` to include `'redbull_api'`. 51 Newcastle rows updated to `source_type = 'redbull_api'`. 5 players also have older `manual` rows retained for history. Total: 56 `redbull_api` rows for 50 unique players. Coverage: 51/51 squad members resolve to a `redbull_api` winning image.
**UI affected:** `app/data.js` comment blocks updated with source priority table and Newcastle pipeline note. `project-docs/DEVELOPMENT_LEDGER.md` updated with pipeline documentation.
**Limitations:** CORS blocks direct browser fetch of the API endpoint. The Entity Source Manager handles this via a paste-JSON fallback. The API requires no authentication but may change structure or URLs over time.
**Follow-ups:** Apply the same API-first pipeline approach to other Red Bull teams when onboarded. Monitor for URL changes in future seasons.

---

### [2026-03-17] Entity Source Manager MVP

**Date:** 2026-03-17
**What was built:** A new internal admin page (`app/admin-source-manager.html`) for visual image and source management per team, with human-in-the-loop review and approval before any database write.
**Why:** Image sourcing for players was ad-hoc and invisible. There was no UI for reviewing candidate images against current images, approving or rejecting candidates, or committing approved images to the database in a controlled way.
**Key behaviour:** Two-column layout: left side has team selector, roster table (32px thumbnails, status badges, source type badges), and summary strip (total / confirmed / placeholder / needs review). Right side has a candidate source panel (three tabs: API / Site / URL list) and an approval queue. The Red Bull CMS API endpoint is pre-filled for known teams. CORS-aware with paste-JSON fallback for the API tab. Approval queue shows side-by-side current vs candidate images with confidence bars. Per-item approve/reject; bulk approve (threshold 0.85) and bulk reject. Commit strip shows pre-commit summary and writes all approved items via Supabase PostgREST upsert with `ON CONFLICT DO NOTHING` semantics. The page is gated behind the dev nav (`localStorage.sai_dev_nav = 'true'`).
**Data impact:** Writes to `entity_images` only on explicit commit. Uses `POST /entity_images?on_conflict=property_id,image_url` with `Prefer: resolution=ignore-duplicates`. Never deletes rows. Never modifies existing rows.
**UI affected:** `app/admin-source-manager.html` (new page), `app/ui-helpers.js` (dev menu entry added: "Entity Source Manager").
**Limitations:** `property_relationships` is not populated for Newcastle Red Bulls (or most teams). The ESM falls back to inferring the roster from `entity_images.note` containing the team name substring. Players with no image row are invisible in the fallback roster. See DEVELOPMENT_LEDGER.md for full documentation of this gap.
**Follow-ups:** Roster inference via `property_relationships` (requires pipeline work). Tier 1.5 features in backlog (entity debug panel, ingestion health indicator). Coverage Monitor integration (added 2026-03-18).

---

### [2026-03-17] Source type schema update

**Date:** 2026-03-17
**What was built:** Extended the `entity_images_source_type_check` constraint to include the value `'redbull_api'`.
**Why:** The check constraint only allowed `['scan', 'manual', 'wikipedia', 'wikimedia', 'other']`. Attempting to set `source_type = 'redbull_api'` caused a constraint violation.
**Key behaviour:** The constraint now allows `['scan', 'manual', 'wikipedia', 'wikimedia', 'other', 'redbull_api']`. The migration drops the old constraint and re-adds it with the extended list. This is a non-destructive schema change; existing rows are unaffected.
**Data impact:** Migration `extend_source_type_check_add_redbull_api` applied to the live Supabase project (`kyjpxxyaebxvpprugmof`). Check constraint `entity_images_source_type_check` on `entity_images.source_type` updated.
**UI affected:** None directly. Unblocks the Newcastle image pipeline inserts and the Entity Source Manager API-sourced writes.
**Limitations:** New `source_type` values (e.g. `'wikimedia_api'`) will require a further migration to extend the constraint.
**Follow-ups:** Consider replacing the check constraint with a lookup table (`source_types`) if the set of valid values grows.

---

### [2026-03-17] Image source priority model

**Date:** 2026-03-17
**What was built:** Established and documented a formal source priority ordering for `entity_images` rows, encoded as `source_type` and enforced by insert order.
**Why:** Multiple rows can exist for the same entity (e.g. a legacy Excel row and a newer API row). Without a documented and enforced priority model, the resolver could unpredictably return a lower-trust image.
**Key behaviour:** Priority (highest to lowest): `redbull_api` > `manual` > `scan` > `other`. Enforced by `loadEntityImages()` fetching rows `order=created_at.asc` so the newest inserted row per entity wins. A higher-trust row is asserted by inserting it after the lower-trust row -- the resolver picks it up automatically without any deletion. The resolver does not filter by `source_type`; it relies entirely on `created_at` ordering. This means any row inserted later wins, regardless of source type -- the priority model is a convention for insert practice, not a query-time filter.
**Data impact:** No schema changes. The model is a documented convention. It is codified in the `data.js` comment block and in `DEVELOPMENT_LEDGER.md`.
**UI affected:** `app/data.js` (comment update on `loadEntityImages()` and `resolveImageMeta()`).
**Limitations:** If a lower-trust row is inserted after a higher-trust row (e.g. a manual insert after the API row), it will become the resolver winner. The model relies on operators following the convention. No DB-level enforcement exists.
**Follow-ups:** Consider adding a `priority_score` column to `entity_images` and modifying the resolver to use `ORDER BY priority_score DESC, created_at DESC` if the convention proves insufficient in practice.

---

### [2026-03-16] Coverage Monitor initial build

**Date:** 2026-03-16
**What was built:** A new internal admin page (`app/coverage-monitor.html`) providing a full-property matrix view of platform coverage, ingestion status, FanScore state, and rollup health.
**Why:** There was no way to see at a glance which properties had live social data, which were suppressed, which had ingestion errors, and which were scoring. Debugging required direct Supabase queries.
**Key behaviour:** Loads all properties and joins to `property_social_accounts`, `social_account_snapshots` (7d), `social_rollups_daily` (7d), and `fanscore_daily` (today). Computes per-property status for X, Instagram, TikTok, YouTube (live / linked / pending / not-found / error / not-linked), snap count, rollup presence, FanScore, confidence band, score effect category, and last ingested timestamp. Summary strip at top. Client-side filters: All / Teams / Athletes / Events / Scored / Suppressed / Ingestion errors / No social found. Refresh button reloads all data from Supabase.
**Data impact:** Read-only. No writes. Queries: `properties`, `property_social_accounts`, `social_account_snapshots`, `social_rollups_daily`, `fanscore_daily`.
**UI affected:** `app/coverage-monitor.html` (new page), `app/ui-helpers.js` (dev menu entry added: implicit via existing Admin section).
**Limitations:** Does not show image coverage (separate concern handled by Entity Source Manager). Does not show ingestion run history (handled by Control Room). FanScore is today-only; no historical trend in this view. Snapshot and rollup counts are limited to a 7-day window.
**Follow-ups:** Add "Manage source" links per row connecting to Entity Source Manager (added 2026-03-18). Tier 2 backlog features: FanScore/ingestion visibility, platform state standardisation, broken state detection.

---

### [2026-03-16] Instagram state decision

**Date:** 2026-03-16
**What was built:** Documented a deliberate decision on how to handle Instagram account state in the admin tooling, following a review of the `property_social_accounts.status` field behaviour.
**Why:** Instagram accounts were showing inconsistent states in the Coverage Monitor and in ingestion logs. A decision was needed on whether to treat "not found" vs "no data" vs "error" states differently in the UI.
**Key behaviour:** Three distinct Instagram states are handled: `not_found` (account does not exist at the searched handle -- displayed as "Not found" chip, negative signal for FanScore eligibility), `error` (last ingest attempt failed -- displayed as "Error" chip, triggers "Ingestion errors" filter), `live` (has snapshot data in the last 7 days). The `pending` and `pending_verification` states are transient and shown as "Pending". Properties with no `property_social_accounts` row for Instagram show "--" (not linked). This is the same pattern applied to all four platforms (X, Instagram, TikTok, YouTube).
**Data impact:** No schema changes. Decision affects Coverage Monitor display logic in `platChipStatus()` and `matchesFilter()`.
**UI affected:** `app/coverage-monitor.html` (chip status logic).
**Limitations:** The distinction between "account not found at this handle" and "handle not yet searched" is not surfaced in the UI -- both show as "--" (not linked) if there is no row for the platform.
**Follow-ups:** Platform state standardisation is Tier 2.2 in `ADMIN_FEATURE_BACKLOG.md`. Consistent suppression reason vocabulary is Tier 1.5.2.

---

### [2026-03-15] No-data trust rule

**Date:** 2026-03-15
**What was built:** Established and applied the "no-data trust rule" as an engineering and product principle: suppressed properties with `suppression_reason = 'Insufficient data'` are treated as honest signal, not broken pipeline, and should not be surfaced to sponsors as scoreable.
**Why:** During the FanScore repair sweep, 15 properties were suppressed for insufficient data (fewer than 3 posts in 90 days). There was debate about whether to apply synthetic data to bring them above the threshold. The decision was made not to.
**Key behaviour:** Properties suppressed for `'Insufficient data'` are displayed in Coverage Monitor under the "Suppressed" filter. They show `--` for FanScore and "No social data" or similar as Score effect. They are intentionally excluded from Explore by default (controlled by `visible_in_ui`). The `fanscore_daily` suppression reason is preserved and used downstream. No synthetic data is applied to properties solely to meet the FanScore threshold.
**Data impact:** 15 properties (8 GTWCE events, 6 GTWCE venues, 1 other) remain with `suppression_reason = 'Insufficient data'`. No data changes from this decision.
**UI affected:** `app/coverage-monitor.html` (suppression display), `app/explore.html` (suppressed cards show `--`), `app/property.html` (suppressed state rendering).
**Limitations:** The rule is a documented convention, not enforced programmatically. A future engineer could apply synthetic data without reading this ledger.
**Follow-ups:** Standardised suppression reason vocabulary (Tier 1.5.2 in backlog). Internal confidence layer (Tier 4.5 in backlog) would formalise the distinction between "not enough data" and "data missing due to pipeline error".

---

## Logging rule

Every build, schema change, data pipeline decision, or admin tool shipped must have an entry in this ledger before the session ends. Entries should be added newest-first (most recent at the top of the Entries section).

Minimum required fields per entry: Date, What was built, Why, Key behaviour, Data impact, UI affected.

Optional but strongly encouraged: Limitations, Follow-ups.

Do not delete entries. Superseded decisions should be noted inline (e.g. "Superseded by [entry title] on [date]") and the superseding entry should reference the original.
