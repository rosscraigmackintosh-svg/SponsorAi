# SponsorAI — Implementation Plan: Phase 1 Features

Version: v1.0
Created: 2026-03-13
Status: Ready to build

---

## Overview

Three features, in build order. Each is self-contained and safe to merge independently.

| # | Feature | Scope | DB change |
|---|---------|-------|-----------|
| 1 | Momentum Signals + Trending | Small | None |
| 2 | Panel Relationship Sections | Medium | None |
| 3 | Key Facts Enrichment | Small–Medium | None (columns exist) |

Build in this order. Features 1 and 3 are data-only changes to existing flows. Feature 2 introduces a new async fetch pattern.

---

## Feature 1 — Momentum Signals + Trending

**Scope:** Small
**DB changes:** None. All three input fields (`t30`, `engRate30d`, `followersDelta`) are already present in the card object on every grid load.

### What it does

Adds signal badges to property cards (up to 2 per card) and a Trending sort option. Badges surface meaningful movement without implying prediction.

Permitted badge labels (calm, descriptive, non-gamified):

- Rising Fast
- Growing
- Losing Momentum
- High Engagement
- Audience Surge

### Files changing

**`app/data.js`**

Add `computeMomentumScore(card)` function after the `loadPosts()` function. Returns an array of 0–2 badge strings based on thresholds applied to `t30`, `engRate30d`, and `followersDelta`. Function must be pure and defensive (handle null inputs gracefully — return empty array).

Threshold notes:
- `t30 > 3.0` → Rising Fast (use only if not already suppressed)
- `t30 > 1.0` → Growing
- `t30 < -1.5` → Losing Momentum
- `engRate30d > 5.0` → High Engagement
- `followersDelta / followers > 0.05` (5% growth) → Audience Surge

Only emit up to 2 badges. Priority order: trend signals first, engagement second.

---

**`app/components/card.js`**

In `renderCard()`, call `computeMomentumScore(c)` and inject badge HTML after the type badge in `.card-badges`.

Current insertion point:
```
'<div class="card-badges">'
+'<span class="type-badge" ...>'+cfg.label+'</span>'
```

Add after the type badge:
```
+ badges.map(function(b){ return '<span class="signal-badge">'+b+'</span>'; }).join('')
```

Badges must not appear if the card is suppressed (`c.sup30` is set).

---

**`app/components/panel.js`**

Add a Momentum Signals section in the panel. Insert between the existing Score section and the Data & Transparency section (before section on Confidence).

Use `computeMomentumScore(p)` (same function). If no signals, render nothing — do not render an empty section shell.

Render using `dpSignalGroup()` if the helper fits, otherwise a simple `dp-row` pair showing trend delta and engagement rate as labelled data points alongside any signal badges.

---

**`app/ui.js`**

In `sortCards()`, add a new case:

```javascript
case 'trending':
  s.sort(function(a,b){
    var sa = computeMomentumScore(a).length;
    var sb = computeMomentumScore(b).length;
    if (sb !== sa) return sb - sa;
    return (b.t30!=null?b.t30:-999)-(a.t30!=null?a.t30:-999);
  }); break;
```

In `sortLabel()`, add:

```javascript
'trending': 'Trending first'
```

---

**`app/explore.html`**

Add to sort menu after the existing trend items:

```html
<div class="sort-divider" aria-hidden="true"></div>
<button class="sort-item" role="menuitem" data-sort="trending" onclick="applySort('trending')">Trending first</button>
```

---

**`app/styles.css`**

Add `.signal-badge` styles. Must be visually lighter than the type badge — suggested treatment:

- smaller font (10–11px)
- no background fill, or very soft tinted fill using `var(--surface-muted)`
- text colour `var(--text-2)` or a single muted accent
- no border-radius extremes (match type-badge radius)

Do not use green/red traffic-light colouring. These are descriptive signals, not judgements.

### Build order for Feature 1

1. Add `computeMomentumScore()` to `data.js` and verify in console.
2. Add `.signal-badge` styles to `styles.css`.
3. Add badges to `card.js` — confirm they render correctly and suppressed cards show none.
4. Add Momentum section to `panel.js` — verify on a property with strong trend signals.
5. Add `trending` case to `sortCards()` and `sortLabel()` in `ui.js`.
6. Add sort-item button to `explore.html`.
7. Smoke test: sort by Trending, open panel on top result, confirm signals shown in both places.

---

## Feature 2 — Panel Relationship Sections

**Scope:** Medium
**DB changes:** None. `property_relationships` table has 392 rows across 4 relationship types. RLS is enabled — the anon key must have SELECT access (confirm before build).

### What it does

Replaces the current `dpRelated()` heuristic (score proximity + same type, client-side only) with a DB-backed fetch returning true structural relationships. The panel section for a driver would show their team; a team would list its drivers; a series would list its events and teams.

### Relationship types in DB

| `relationship_type` | Direction | Panel label |
|--------------------|-----------|-------------|
| `series_contains_event` | from=series, to=event | Events in this series |
| `event_at_venue` | from=event, to=venue | Venue |
| `series_has_team` | from=series, to=team | Participating teams |
| `team_has_athlete` | from=team, to=athlete | Drivers / Athletes |

Reverse traversal also applies: an event panel should show its series; a driver panel should show their team.

### Files changing

**`app/data.js`**

Add `loadRelationships(propertyId)` function. Fetches two queries in parallel:

1. `property_relationships?from_id=eq.{id}&select=...` — forward relationships
2. `property_relationships?to_id=eq.{id}&select=...` — reverse relationships

Each query must join to `properties` to fetch the related property's name, type, and slug. Use PostgREST embedded resource syntax or a separate second lookup if join syntax is unavailable.

Return a structured object:

```javascript
{
  forward: [{ type, relatedId, relatedName, relatedType, relatedSlug }],
  reverse: [{ type, relatedId, relatedName, relatedType, relatedSlug }]
}
```

---

**`app/components/panel.js`**

Replace section 8 (`dpRelated()` heuristics) with an async relationship section.

The panel currently renders synchronously. Feature 2 requires making the relationship section async. Implementation approach:

1. Render the panel as normal.
2. In the relationship section placeholder, insert a loading state: `<div id="dp-relationships-body">Loading...</div>`.
3. After `openPanel()` renders the panel, call `loadRelationships(p.id)` and update `dp-relationships-body` in place.

Type-aware labelling: use a lookup table to derive human labels from `relationship_type` and direction (forward vs reverse). Example:

```javascript
var REL_LABELS = {
  'series_contains_event:forward': 'Events',
  'series_contains_event:reverse': 'Part of series',
  'event_at_venue:forward':        'Venue',
  'event_at_venue:reverse':        'Events hosted',
  'series_has_team:forward':       'Participating teams',
  'series_has_team:reverse':       'Competing in',
  'team_has_athlete:forward':      'Drivers / Athletes',
  'team_has_athlete:reverse':      'Drives for'
};
```

Render each relationship group as a sub-section within the panel section. Each related item should be a clickable row that opens that property's panel (re-use the existing `openPanel()` call pattern).

If no relationships exist for a property, render: `<p class="dp-empty">No linked properties.</p>`

---

**`app/styles.css`**

Add styles for:

- `.dp-rel-group` — wrapper for a relationship type group
- `.dp-rel-item` — individual related property row (clickable)
- `.dp-rel-item:hover` — hover state matching other interactive panel rows
- `.dp-empty` — empty state text

Match density and spacing to existing panel rows. Do not add new spacing tokens — use existing `--spacing-*` variables.

### Build order for Feature 2

1. Verify RLS on `property_relationships` allows anon SELECT. Query the table via the API key and confirm rows are returned. If blocked, add a Supabase RLS policy before proceeding.
2. Add `loadRelationships()` to `data.js`. Test in console: confirm forward and reverse results for a known property ID.
3. Add `.dp-rel-*` styles to `styles.css`.
4. Update `panel.js` section 8: replace `dpRelated()` with async load + in-place update pattern.
5. Test on a driver (expect: team), a team (expect: drivers + series), a series (expect: events + teams), an event (expect: series + venue).
6. Handle edge case: properties with 0 relationships (venue with no events mapped).

---

## Feature 3 — Key Facts Enrichment

**Scope:** Small–Medium
**DB migration:** None. Columns `sport`, `region`, and `city` exist on the live `properties` table. No schema change needed.

### What it does

Fills in the 4 currently hardcoded-null rows in the Key Facts panel section. Two rows can be populated immediately from the DB. Two rows remain null pending data entry decisions.

Current state of Key Facts section (panel.js):

```javascript
h += dpFact('Competition / league', null);   // no DB column for this yet
h += dpFact('Sport category',       null);   // → properties.sport
h += dpFact('Season timing',        null);   // no DB column for this yet
h += dpFact('Primary region',       null);   // → properties.region or .city
```

Target state:

- Sport category → `c.sport` (already in DB, not yet fetched)
- Primary region → `c.region` or fallback to `c.city`
- Competition / league → remains null for now (no column exists)
- Season timing → remains null for now (no column exists)

### Files changing

**`app/data.js`**

In `loadGrid()`, add `sport`, `region`, `city` to the column fetch string.

Current columns string (abbreviated):
```
'property_id,property_name,...,platforms_active'
```

Add: `,sport,region,city`

In the card object mapping (`.then()` return block), add:
```javascript
sport:  r.sport  || null,
region: r.region || null,
city:   r.city   || null,
```

---

**`app/components/panel.js`**

Replace the two null dpFact calls with populated values:

```javascript
h += dpFact('Sport category',  p.sport  || null);
h += dpFact('Primary region',  p.region || p.city || null);
```

Keep `dpFact('Competition / league', null)` and `dpFact('Season timing', null)` as-is until columns are defined.

Note: `dpFact()` already handles null gracefully — it renders a `--` placeholder. No change to the helper function needed.

---

**Data population (separate, optional)**

If `sport` and `region` are null for most of the 99 properties, the enrichment will show `--` everywhere. In that case, run targeted UPDATE statements to populate the fields for key properties.

This is a data entry task, not a code task. It can be done via the Supabase dashboard or a SQL script saved to `database/populate_sport_region.sql`.

Check null coverage before building — query:

```sql
SELECT
  COUNT(*) AS total,
  COUNT(sport) AS has_sport,
  COUNT(region) AS has_region,
  COUNT(city) AS has_city
FROM properties;
```

If coverage is low, populate data before surfacing the section — partial display of real data mixed with `--` is acceptable but should be noted in the UI if more than 60% of properties lack the field.

### Build order for Feature 3

1. Query null coverage for `sport`, `region`, `city` on live DB.
2. If coverage is reasonable (>40% populated), proceed to code changes.
3. Add `sport`, `region`, `city` to column fetch in `data.js`. Verify in console that card objects contain these fields.
4. Update panel.js Key Facts section to use `p.sport` and `p.region || p.city`.
5. Open panels for a driver, team, and series — confirm sport and region appear where data exists, `--` where null.
6. If coverage is low: create `database/populate_sport_region.sql` with targeted UPDATEs and run it.

---

## Cross-cutting notes

**Load sequence:** All three features add to `data.js` functions. Ensure new functions are defined before any call sites — `data.js` loads before `card.js` and `panel.js`.

**Suppression rule:** Momentum badges must check `c.sup30` and emit nothing for suppressed properties. Do not surface trend signals when the FanScore itself is suppressed.

**No new tokens:** All three features must use existing CSS token variables only. No hex values. No new spacing tokens.

**Panel async pattern (Feature 2):** The async relationship fetch introduces the first non-synchronous panel section. Keep it isolated to section 8 only — do not refactor other panel sections to async at this stage.

**FanScore / FitScore separation:** Momentum signals are FanScore-adjacent (attention signals). They must not be labelled as FitScore, alignment, or brand match signals.

---

End of document
