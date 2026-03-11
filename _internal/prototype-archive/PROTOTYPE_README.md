## SponsorAI HTML Prototype

Last updated: 2026-03-02

---

### Active Files

Location: `07_Prototype/html/`

Six active prototype files:

**sponsorai-explore.html** — Primary explore view. FanScore card grid with live Supabase data. Filter chips, sort controls, and AI-powered chat panel (Claude Haiku via Anthropic API). This is the current lead prototype.

**sponsorai-property.html** — Property detail page. Full signal breakdown: FanScore, FitScore, Budget signals, FitScore dimension bars, data confidence indicators, social signals, active opportunity panel, related properties. Reads `?id=X` URL parameter.

**sponsorai-compare.html** — Side-by-side property comparison. Pre-loaded with two properties; selector dropdowns to swap. Parallel data table, 12 comparison categories. No winner declarations.

**sponsorai-watchlist.html** — Watchlist page. List-view layout. Shows property info, signals, confidence dot. Actions: View, Compare, Remove.

**sponsorai-portfolio.html** — Portfolio page for active evaluations. Larger card layout, full FitScore dimension bars, status badge, opportunity panel integration.

**sponsorai-opportunities.html** — Opportunities page. Budget range, FitScore, and sort filters. Opportunity rows with FitScore and budget signals. Visual indicator for in-budget properties.

---

### Archived Files

Location: `07_Prototype/Old/`

Contains earlier explore iterations (`sponsorai-explore-1.html` through `-5.html`) and experimental files moved from `html/` during the March 2026 cleanup.

---

### Notes

- All active files use direct Supabase REST API via `fetch()` — no SDK dependency.
- Design tokens follow `03_Design_System/`.
- `sponsorai-explore.html` contains the Anthropic API key — do not share publicly.
