# Responsive and Grid  
Status: Active  
Scope: SponsorAI product UI surfaces

SponsorAI must remain calm and structured at all breakpoints.
Responsive behaviour must reduce complexity, not shrink everything.

---

# Responsive and Grid  
Status: Active  
Stack: React + Tailwind  
Scope: SponsorAI product UI surfaces

SponsorAI must remain calm and structured at all breakpoints.
Responsive behaviour must reduce complexity, not shrink everything.

---

## Breakpoints (Tailwind)

These are canonical. Do not invent new breakpoints.

- `sm`: 640px  
- `md`: 768px  
- `lg`: 1024px  
- `xl`: 1280px  
- `2xl`: 1536px  

---

## Layout Rules

### Desktop (lg+)
- top nav + optional sidebar
- card-based sections
- max readable text width: 72ch

### Tablet (md)
- sidebar collapses to drawer or icon-only
- reduce columns, keep cards readable

### Mobile (sm)
- single-column
- secondary panels move behind tabs/accordion
- tables switch to stacked rows or horizontal scroll

---

## Card Grid Columns

Property grid:
- `sm`: 1 col
- `md`: 2 col
- `lg`: 3 col
- `xl`: 4 col

Avoid 5+ columns.

---

## Tables on Mobile

Tables must not become unreadable on `sm`.

On `sm`:
- show only 3–5 key columns, move the rest into expandable row detail
OR
- horizontal scroll with sticky first column if needed

---

## Touch Targets

Interactive controls must be at least 44px tall on mobile.

---

## Charts

On `sm`:
- prefer sparklines + summary stats
- reduce axis labels/ticks
- avoid multi-series unless essential

---

## Responsive Reduction Principle

When a layout breaks:

1) remove secondary content  
2) collapse to tabs/accordion  
3) reduce columns  
4) then adjust spacing  
5) do not solve by shrinking font size
---

## Layout Rules

### Default layout (lg and up)

- Top nav + optional sidebar  
- Main content uses card-based sections  
- Max readable text width: 72ch  
- Grid gaps default: `space.4`

### md (tablet)

- Sidebar collapses to icon-only or drawer  
- Reduce columns, keep card widths readable  
- Preserve padding rhythm, avoid “tight squeeze” layouts

### sm (mobile)

- Sidebar becomes a drawer  
- Single-column layout  
- Prioritise key metrics and current window first  
- Defer secondary panels behind tabs or accordions

---

## Card Grid Behaviour

Property card grid columns:

- `sm`: 1 column  
- `md`: 2 columns  
- `lg`: 3 columns  
- `xl`: 4 columns  

Rules:
- Never go below comfortable card width
- Avoid 5+ columns, it becomes scan-noise
- Keep equal card heights only when it aids scanning

---

## Tables and Dense Views

Tables must not become unreadable on mobile.

### sm behaviour
- Switch to “stacked rows” layout or horizontal scroll
- Show 3–5 most important columns only
- Move secondary fields into expandable detail

### md behaviour
- Allow horizontal scroll if needed
- Keep sticky header only if it remains calm and useful

---

## Navigation

### sm
- Primary nav: bottom bar or hamburger drawer
- Keep global search accessible
- Avoid large persistent left nav on mobile

### md
- Collapsible side nav acceptable
- Preserve section clarity

---

## Typography and Spacing Responsiveness

Typography scales minimally with breakpoint.
Do not shrink text to fit layouts.

### sm
- Prefer fewer elements over smaller type
- Reduce padding by one step only where needed
- Maintain touch targets

Touch targets:
- Minimum 44px height for controls

---

## Data Visualisation

Charts must remain legible.

### sm
- Reduce ticks and labels
- Prefer sparklines and summary stats
- Avoid multi-series charts unless essential

---

## Reduction Principle for Responsive

When a layout breaks:

1. Remove secondary content  
2. Collapse into tabs/accordions  
3. Reduce columns  
4. Only then adjust spacing  
5. Do not reduce font size as the primary fix