# PRODUCT_FEATURE_BACKLOG.md

SponsorAI — Product Feature Backlog

Last updated: 2026-03-13

---

## Purpose

This document captures product ideas that emerged during development but are not part of the current build scope. These are not committed features. They are documented here to preserve the thinking, avoid re-deriving the same concepts in future sessions, and give future planning a clear starting point.

None of the concepts in this document should be implemented without a deliberate decision to move them into the roadmap.

Reference: `docs/PRODUCT_ROADMAP.md`

---

## Explore Discovery Rows

**Concept**

Transform the Explore grid from a sortable flat list into an AI-curated discovery feed using named, curated rows. Each row surfaces a focused signal slice of the property set, making the grid readable without requiring the user to know what to sort by.

**Example rows**

- Attention Leaders
- Rising Attention
- High Engagement Communities
- Emerging Drivers
- Teams to Watch
- Event Interaction Leaders

**Data availability**

All rows derive from fields already loaded in the grid. No schema changes required.

| Row | Primary field | Secondary field |
|-----|--------------|-----------------|
| Attention Leaders | fanscore | -- |
| Rising Attention | t30 | fanscore |
| High Engagement Communities | engRate30d | followers |
| Emerging Drivers | followersDelta | t30 |
| Teams to Watch | t30 | engRate30d |
| Event Interaction Leaders | engRate30d | -- |

**Roadmap placement**

Phase 2 -- Explore Intelligence

---

## Series Ecosystem Influence

**Observation**

Series FanScore currently reflects only the social accounts belonging to the series entity itself. This is correct and should not change. However, there is a meaningful unanswered question: what is the total audience reach that a sponsorship of this series provides access to, including the teams and drivers competing within it?

**Future concept**

An Influence metric, separate from FanScore, that aggregates audience reach across the ecosystem of a series.

Example formula:

```
Influence = FanScore(series)
          + sum(FanScore(team) * 0.25) for all teams in series
          + sum(FanScore(driver) * 0.10) for all drivers in series
```

Weighting rationale:

- Series accounts: 100% -- the primary property
- Teams: 25% -- associated but independently owned audiences
- Drivers: 10% -- individually distinct but related reach

**Important constraint**

FanScore remains unchanged. Influence would be an additional contextual metric, clearly labelled and separated from FanScore in all UI surfaces. It must not merge with, replace, or be presented alongside FanScore in a way that causes confusion.

This is consistent with SponsorAI's prohibition on composite scoring.

**Roadmap placement**

Phase 4 -- Ecosystem Intelligence

---

## Ecosystem Size Panel Section

**Concept**

A future panel section displaying the structural scale of a series or event's ecosystem. Answers the question: how large is this property's network?

**Proposed metrics**

- Number of teams
- Number of drivers
- Number of events
- Total followers across all ecosystem entities

**Data source**

Derived from the `property_relationships` table, which already tracks `series_has_team`, `series_contains_event`, `team_has_athlete`, and `event_at_venue` links.

No schema change required. Aggregate queries against existing relationships.

**Roadmap placement**

Phase 2 -- Panel Intelligence

---

## Explore Card Hierarchy

**Observation**

The current card layout distributes visual weight roughly evenly across name, score, and badges. FanScore is the primary analytical signal in SponsorAI and should read as such at a glance in the Explore grid.

**Target hierarchy**

1. Image (hero zone -- highest real estate)
2. FanScore + inline trend (dominant metric)
3. Name + country flag (identity anchor)
4. Type badge + signal badges (classification layer)
5. Follower count (supporting, de-emphasised)

**Design constraints**

- Card height must not change
- Spacing tokens must not change
- Image size must not change
- Grid layout must not change
- Signal badges must remain visually lighter than the type badge

**Status**

This concept was partially implemented on 2026-03-13 as a targeted hierarchy adjustment:
- `.score-val` updated to `24px / weight 700`
- Trend moved inline with score (`72 ↑1.4` format)
- Follower chip de-emphasised (`11px / text-3 / weight 400`)
- New CSS classes `.score-val-row` and `.score-trend-inline` added

**Roadmap placement**

UX improvement backlog

---

## Image Reliability Policy

**Observation**

Official circuit and venue websites frequently block hotlinking. Images registered from official circuit URLs often fail silently in production, showing broken icons in the card hero zone. This was confirmed during the GTWCE ingestion repair sweep (2026-03-13), where five of six circuit images required replacement with Wikimedia Commons URLs.

**Preferred venue image sources (in priority order)**

1. Wikimedia Commons (`upload.wikimedia.org`) -- preferred; stable CDN, no hotlink restrictions
2. Motorsport media libraries -- use if Wikimedia coverage is absent or low quality
3. Official circuit sites -- only if the CDN explicitly permits hotlinking; treat as fragile by default

**Image validation checklist**

Before marking any image entry as complete:

1. Registry entry exists in `app/images.js`
2. URL loads independently in browser
3. Image renders correctly in card hero zone
4. No broken icon visible in grid or panel

Registry presence alone is not completion.

**Reference**

`docs/SERIES_INGESTION_PROCESS.md` Section 4 -- Image Pipeline

---

## Synthetic Data Policy (Demo Environments)

**Context**

FanScore computation requires posts. If a property has social accounts but no posts, the pipeline suppresses the score (Rule 2.5). In demo environments or ingestion scenarios where organic posts are unavailable, synthetic posts may be created to unblock scoring.

**Permitted conditions**

Synthetic posts may be created when all three conditions are met:

- Social accounts exist for the property
- Organic posts are unavailable or out of scope for the current ingestion
- A demo dataset requires a score to be computable

**Constraints**

- Synthetic entries must be documented in `project-docs/DEVELOPMENT_LEDGER.md`
- Synthetic data must produce Low confidence scores -- this is the expected and correct outcome
- Synthetic posts should use HASHTEXT-seeded deterministic content to ensure reproducibility across environments

**Example applied**

SRO Motorsports Group (2026-03-13 repair sweep). Accounts existed (Instagram ~57k, X ~34k) but zero posts were present, causing silent suppression. Migration `sro_synthetic_posts_and_metrics` applied 30 HASHTEXT-seeded synthetic posts per platform covering 90 days. Result: FanScore = 70.6, Low confidence. Low confidence is correct and expected.

---

## Relationship-Driven Discovery

**Concept**

Future discovery rows and surfaces based on traversal of the `property_relationships` graph, rather than flat signal aggregation. Allows the product to surface properties based on their network context, not just their individual scores.

**Example discovery rows**

- Drivers in rising teams (driver FanScore filtered by team t30)
- Drivers entering top series (athletes with recent series_has_athlete links to high-FanScore series)
- Teams gaining attention through drivers (team t30 correlated with athlete followersDelta)
- Events driving high engagement within their series (event engRate30d relative to series average)

**Data source**

`property_relationships` table, joined with property scoring windows. The graph structure is already present; this concept requires query-layer logic to traverse it meaningfully.

**Roadmap placement**

Phase 3 -- Network Intelligence
