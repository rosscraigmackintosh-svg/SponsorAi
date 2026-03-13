# SPONSORAI_SYSTEM_CONTRACT.md

SponsorAI — Architectural and Product Rules

Last updated: 2026-03-13

Status: Active

---

## Purpose

This document defines the rules that govern how SponsorAI is built and how it behaves. These rules are not preferences or guidelines: they are contracts. Any code, schema change, UI addition, or documentation that violates a rule in this file must be corrected before it is accepted.

If a rule needs to change, update this file explicitly and note the reason. Do not silently deviate.

---

## Section 1 — Product Principles

SponsorAI is a sponsorship intelligence and decision-support platform.

Its positioning is: analytical, trust-first, neutral, non-gamified, decision-support only.

**Rule 1.1** SponsorAI surfaces structured judgement. It does not make decisions for users.

**Rule 1.2** SponsorAI must never present outputs as guarantees or predictions. All outputs are descriptive of past and present signals only.

**Rule 1.3** Calm, analytical tone is mandatory in all copy, labels, and empty states. Hype language, growth-hack framing, and competitive theatre are prohibited.

**Rule 1.4** No ranking or "best" language. Properties may be sorted or filtered, but no UI element may imply that one property is definitively better than another.

**Rule 1.5** Trust is earned through transparency. Every score must be accompanied by its confidence level and data coverage. Suppressed scores must show a suppression reason rather than a silent blank.

**Rule 1.6** SponsorAI is not a social media monitoring tool. Social metrics are inputs to structured scoring models, not headline outputs.

---

## Section 2 — Core Entities

SponsorAI uses a Universal Property Model. All scoreable objects are rows in the `properties` table with a `property_type` enum.

Valid property types: `driver`, `athlete`, `team`, `series`, `event`, `venue`, `governing_body`.

**Rule 2.1** All properties must have a unique slug. Slugs are kebab-case, human-readable, and permanent once assigned.

**Rule 2.2** Events follow a brand / occurrence model. A recurring event has a brand record (e.g. `gtwce-sprint-cup-brands-hatch`) and zero or more occurrence records per year. Only brands appear in the explore grid. Occurrences exist for data aggregation only.

**Rule 2.3** Relationships between properties are stored in `property_relationships` with columns `from_id`, `to_id`, `relationship_type`, `valid_from`, `valid_to`. Relationship types are plain text strings (e.g. `series_contains_event`, `team_has_athlete`).

**Rule 2.4** Social accounts are stored in the `accounts` table with `platform` constrained to a platform enum (instagram, tiktok, youtube, x, linkedin). Every account must have a corresponding follower history in `raw_account_followers` before the scoring pipeline is run, or FanScore will be suppressed.

**Rule 2.5** Every platform account created must have post data inserted at creation time. An account with no posts causes data completeness to fall below 60%, which suppresses FanScore. This is a hard insertion rule, not an advisory.

---

## Section 3 — UI Contracts

**Rule 3.1** FanScore and FitScore must never appear on the same visual surface without clear signal separation. They must not be merged, averaged, or combined into a composite number.

**Rule 3.2** Confidence is always secondary. It must be displayed in a subdued style (smaller text, muted colour) and never given the same visual weight as the score itself.

**Rule 3.3** Suppressed scores render as `--` with a suppression reason visible. A blank or zero is not an acceptable substitute.

**Rule 3.4** All CSS must use semantic token variables from the Design System. Hardcoded hex values are prohibited outside the token definition files. New tokens must not be invented without updating the Design System files.

**Rule 3.5** Card density is compact by default. No card may expand beyond its defined layout without an explicit density rule change.

**Rule 3.6** Action buttons (watchlist, compare, portfolio) must be present in the card actions row even if the underlying feature is not yet implemented. They must render as interactive stubs that log to console rather than being hidden or removed.

**Rule 3.7** The explore grid hard limit is 200 cards until pagination is implemented. This is a known limitation, not a design choice.

**Rule 3.8** Sort and filter state is ephemeral (session-only). No sort or filter preference is persisted between page loads unless localStorage is explicitly used with user intent.

---

## Section 4 — Image System Rules

**Rule 4.1** All image entries in `images.js` must use the typed object format: `{ src, kind, fit, pos, pad?, bg? }`. Plain string entries are a legacy format and must not be added.

**Rule 4.2** Valid image kinds are: `car`, `portrait`, `logo`, `venue`, `series`. Each kind has defined CSS treatment. No new kind may be introduced without updating the kind-specific CSS rules in `styles.css` and this contract.

**Rule 4.3** Car livery images (`kind: 'car'`) apply a CSS zoom transform (scale 1.12 resting, 1.16 on hover) with a `cubic-bezier(0.22, 1, 0.36, 1)` ease-out transition. No other image kind applies a hover transform unless explicitly contracted.

**Rule 4.4** Events without a dedicated image entry automatically inherit their venue's image via `EVENT_VENUE_MAP`. When adding new events, add the event slug to `EVENT_VENUE_MAP` pointing to the venue slug.

**Rule 4.5** Image URLs must point to stable, publicly accessible sources. CDN-hosted assets are preferred. URLs that require authentication or that may expire will cause card rendering failures.

**Rule 4.6** If no image is found for a property, the card hero renders the type placeholder SVG from `HERO_ICONS`. This is the correct fallback and must not be treated as an error.

---

## Section 5 — Data Rules

**Rule 5.1** The FanScore model version in use is defined by the `MODEL` constant in `data.js`. It must match the `model_version` value used in `fanscore_daily`. A mismatch produces an empty score grid.

**Rule 5.2** FanScore is computed in three pipeline stages: `compute_daily_rollups` then `compute_fanscore_daily` then `compute_fanscore_windows`. All three must be run after any insertion of post or follower data.

**Rule 5.3** Synthetic data must use HASHTEXT-seeded pseudo-random generation to ensure deterministic, reproducible variation. Raw random values are prohibited in synthetic data migrations.

**Rule 5.4** The `v_property_summary_current` view excludes properties with `event_role = 'occurrence'`. Occurrence-type events are not scoreable and must not appear in the explore grid.

**Rule 5.5** All new properties must be inserted with a valid `slug`. A null slug causes image resolution and URL routing to fail silently.

**Rule 5.6** Follower histories must cover a minimum of 30 days prior to the current date for a property to achieve full data coverage. Histories shorter than 30 days will result in reduced confidence or suppression.

**Rule 5.7** The scoring function currently reads model weights as hardcoded SQL constants, not from `fanscore_models.weights_json`. Changing the weights JSON has no effect until this is fixed. This is a known issue, not intended behaviour.

---

## Section 6 — Documentation Rules

**Rule 6.1** `project-docs/DEVELOPMENT_LEDGER.md` is the authoritative record of what is built, what is stubbed, and what is broken. It must be updated at the end of every engineering session.

**Rule 6.2** `docs/SYSTEM_STATE.md` records the live state of the database and frontend. Update whenever properties are added, scoring state changes, or features change status.

**Rule 6.3** `docs/WORKING_CONTEXT.md` records what was done in the last session and what is queued for the next. It is ephemeral and should be rewritten at the start of each new body of work.

**Rule 6.4** `docs/SPONSORAI_SYSTEM_CONTRACT.md` (this file) defines architectural rules. It is not ephemeral. Changes require an explicit edit with a reason noted.

**Rule 6.5** No engineering decision may be taken that conflicts with this contract without first updating this file. Silently deviating from a rule is not acceptable.

**Rule 6.6** The Design System folder (`Design_System/`) is the authority on all visual and token decisions. It must be read before any UI code is generated or modified.

---

## Section 7 — Scoring Scope

**Rule 7.1** SponsorAI v1 focuses exclusively on measuring and visualising fan attention across athletes, teams, events, and series.

**Rule 7.2** The primary scoring system is FanScore. FanScore measures audience attention and engagement momentum derived from social metrics (followers, engagement, growth). It is descriptive, not predictive.

**Rule 7.3** The following are intentionally excluded from SponsorAI v1:

- Brand Fit scoring
- FitScore
- Brand-to-property alignment modelling
- Sponsorship ROI prediction

**Rule 7.4** FitScore requires brand inputs and alignment modelling. This introduces additional complexity and assumptions that are incompatible with the trust-first, neutral positioning of SponsorAI v1. It is not excluded due to technical difficulty — it is excluded to preserve integrity.

**Rule 7.5** FanScore must remain independent. It must not incorporate brand-specific logic, brand weighting, or alignment signals of any kind.

**Rule 7.6** Brand Fit and FitScore may be introduced in a later phase once the attention intelligence layer is fully established and validated. Any future introduction requires an explicit update to this contract before implementation begins.
