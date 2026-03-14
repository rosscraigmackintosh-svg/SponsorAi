# SponsorAI Page Patterns

This document defines the canonical structure of each page type in the product.
Claude must follow these patterns when generating or modifying pages.
Do not invent new layouts unless explicitly instructed.

---

# Core Page Types

## 1. Explore Page

Purpose:
Primary discovery surface for sports properties.

Structure:
Header
Filter controls
Explore rows (horizontal discovery sections)

Rows include:
Property in Focus
High Engagement Leaders
Fastest Growing
Emerging Opportunities
Established Premium Assets
Women's Sport Spotlight
UK Market Focus
Sustainability & Community Impact
Related to Your Watchlist

Cards open the Property Profile side panel.

---

## 2. Property Profile Page

Purpose:
Deep analytical view of a single property.

Structure:

### Hero
- Property identity (name, flag, type badge, sport / region / city)
- Property image
- Bio (when available)

### FanScore
- Current FanScore value (s30 — 30d average)
- Trend direction and daily slope (t30)
- Confidence band
- 90-day sparkline (small, inline with score block)

### Audience Signals
- Followers (total, with 30d net delta)
- Engagement rate (30d)
- Posts (30d count)
- Platforms active (count of active platforms)

Note: this section is labelled "Audience Signals" in the current implementation.

### Momentum
- Momentum signal badges (Rising Fast, Growing, Losing Momentum, High Engagement, Audience Surge)
- 30d change tile (s30 minus s60 — current 30d avg vs prior 30d avg)
- 90d change tile (s30 minus s90 — current 30d avg vs 90d window avg)
- Daily trend tile (t30 — 30d slope per day, with directional arrow)
- FanScore line chart (full-width SVG, rendered async after sparks load, with first/last date labels)

Missing data behaviour:
- Suppressed properties show no tiles and no chart
- Missing baseline values (s60 or s90 null) show "--" in the relevant tile
- Fewer than 2 valid data points shows "Insufficient data for chart" notice in place of the chart line

### Ecosystem
- Related property cards, derived from property_relationships
- Each card shows: property name, type badge, FanScore (if unsuppressed)
- Clicking a card navigates to that property's profile
- Section is hidden when no relationships exist

### Recent Posts
- Up to 5 most recent posts, ordered by date descending
- Each post shows: platform, date, content type (when available), caption excerpt (max 200 chars), like and comment counts
- Section is hidden when no post data exists

### Sponsorship Context
**Planned / future section.**
Will cover sponsorship accessibility and brand alignment context when FitScore and sponsorship data are introduced. Not present in the current implementation.

### Actions

Currently implemented:
- Watch (floating bar button, top right — toggles SAI_STORAGE.watchlist)
- Compare (header action button — navigates to compare.html?a={slug})

Portfolio action: not currently present on the property page. May be added in a future pass.

---

## 3. Compare Page

Purpose:
Side-by-side analytical comparison.

Structure:
Header
Selected property selectors (max 3)

Comparison table sections:
Identity
FanScore
Audience
Momentum
Engagement
Sponsorship accessibility

Columns represent properties.

---

## 4. Watchlist Page

Purpose:
Saved discovery shortlist.

Structure:
Header
Saved properties list

Card layout identical to Explore cards.

Actions:
Open property
Add to compare
Add to portfolio
Remove from watchlist

---

## 5. Portfolio Page

Purpose:
User's sponsorship portfolio tracking.

Structure:
Header
Saved portfolio properties

Each property card includes:
FanScore
Momentum
Portfolio notes (future)

Actions:
Open property
Compare
Remove from portfolio

---

## 6. Control Room

Purpose:
Internal operational tooling for SponsorAI.

Sections include:
Series ingestion
Property ingestion
Data refresh tools
Image management
Dataset diagnostics

Not visible to external users.

---

# Page Generation Rules

Claude must:
- follow these page structures
- reuse existing components
- avoid introducing new layout patterns
- maintain visual hierarchy from the design system
