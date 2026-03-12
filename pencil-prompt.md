# Pencil Design Prompt — SponsorAI Main Screen

## What you are designing

Design the main Explore screen for **SponsorAI** — a calm, analytical B2B sponsorship intelligence platform. This is not a sports app, not a leaderboard, not a dashboard. It is a structured decision-support tool used by brands and sponsorship professionals to explore the sponsorship market with clarity.

The screen has two states:
1. **Default** — a full-width grid of property cards arranged in labelled rows
2. **Selected** — same layout but with a side panel sliding in from the right, showing detailed property info when a card is clicked

---

## Design Identity

**Personality:** Bloomberg meets Notion. Calm, structured, evidence-led, quietly premium.

**Never:** Gamified, leaderboard-style, aggressive, sports-broadcast energy, hype.

**Rule:** Accent is punctuation, not paint. Use the rose accent sparingly and only to signal intent.

---

## Colour Tokens (use these exactly)

```
Background page:     #F8F8F9
Surface (cards):     #FFFFFF
Border:              #E6E6E8
Text primary:        #111827
Text secondary:      #6B7280
Text muted/label:    #9CA3AF
Accent:              #C56B7C  (muted rose — use sparingly)
Accent soft bg:      #F5E6EA
Accent border:       #E7C7CF
Positive:            #1F7A52
Negative:            #A33A3A

Property type — Driver:  border #7B9EF8, bg #EEF2FF
Property type — Team:    border #A78EF8, bg #F3F0FF
Property type — Series:  border #50C090, bg #EBFAF3
Property type — Event:   border #E0A050, bg #FEF3C7
```

---

## Typography

```
Font: Inter
Sizes:
  Label / caps: 10px, weight 600, letter-spacing 0.08em, uppercase
  Body small:   12px, weight 400
  Body:         14px, weight 400
  Body medium:  14px, weight 500
  Heading sm:   16px, weight 600
  Heading:      18px, weight 600
```

---

## Spacing & Radius

```
Base unit: 4px
Common spacings: 4, 8, 12, 16, 24, 32px
Card radius: 10px
Panel radius: 0 (flush right edge, 14px on left corners only)
```

---

## Layout — Main Screen (Default State)

**Shell:**
- Left sidebar nav: 56px wide, dark (#171A21), icon-only
- Top bar: 48px tall, white, contains: SponsorAI wordmark (left), search input (center), user avatar (right)
- Content area: fills remaining space, background #F8F8F9, padding 24px

**Content area structure:**
- Page title: "Explore" — 18px, weight 600, #111827
- Subtitle below title: "Structured discovery across the sponsorship landscape." — 13px, #6B7280
- Filter strip below subtitle: row of filter chips — Sport, Property Type, Budget, Confidence. Chips use border style (not filled). Active chip uses accent border #C56B7C.
- Then rows of cards (see below)

---

## Card Rows

Arrange property cards in **labelled horizontal rows**, not a single ranked list. Each row has:

- A row label in all-caps, 10px, #9CA3AF, e.g. "HIGH ENGAGEMENT LEADERS"
- A small row count badge, e.g. "12 properties"
- A horizontal scrollable row of cards (or wrapping grid — your choice, but keep it row-based)

**Canonical rows to show (pick 3–4 for the design):**
1. HIGH ENGAGEMENT LEADERS
2. FASTEST GROWING
3. EMERGING OPPORTUNITIES
4. ESTABLISHED PREMIUM ASSETS

---

## Property Card

**Size:** approximately 240px wide × 160px tall (compact)

**Card anatomy (top to bottom):**

```
[ Property Type Tag ]         e.g. "SERIES" or "TEAM" — tiny pill, coloured per type above

[ Property Name ]             e.g. "Formula E"           14px, weight 600, #111827
[ Country · Sport ]           e.g. "Global · Motorsport" 12px, #6B7280

---  divider line ---

[ FanScore label ]  [ FanScore value ]     e.g. "FanScore  74"
[ Confidence ]      [ Confidence level ]   e.g. "Confidence  Moderate"
[ Trend delta ]                            e.g. "↑ +3.2 (30d)"  in #1F7A52 if positive

```

**Card states:**
- Default: white background, 1px border #E6E6E8, radius 10px
- Hover: border darkens to #D1D5DB, very subtle shadow (0 2px 8px rgba(0,0,0,0.06))
- Selected: 2px accent border #C56B7C — NO fill change, no heavy shadow

**Important:** FanScore is always labelled "FanScore" — never "Score", never "Rating". Confidence is always secondary and smaller than FanScore.

---

## Side Panel (Selected State)

When a card is selected, a side panel slides in from the right. The main card grid does NOT disappear — it shifts left (compresses), making room for the panel.

**Panel dimensions:** 380px wide, full viewport height, flush to right edge

**Panel styling:**
- Background: #FFFFFF
- Left border: 1px solid #E6E6E8
- No drop shadow on panel itself
- Top padding: 24px, side padding: 20px

**Panel anatomy (top to bottom):**

```
[ × Close button ]                         top right, 32×32, subtle icon

[ Property Type Tag ]                      same coloured pill as card

[ Property Name ]                          20px, weight 600, #111827
[ Country · Sport · Season ]               13px, #6B7280

--- divider ---

SCORES SECTION

[ FanScore ]
  Large numeral: 74                         28px, weight 700, #111827
  Label below: "Attention signal · 30-day"  11px, #9CA3AF
  Trend delta: ↑ +3.2 vs prior period       12px, #1F7A52

[ FitScore ]  (only shown if brand context exists)
  Large numeral: 68                         28px, weight 700, #111827
  Label below: "Alignment signal"           11px, #9CA3AF
  Note: "Requires brand profile"            11px, italic, #9CA3AF (if not set)

[ Confidence ]
  Pill badge: "Moderate"                    soft neutral pill, 12px
  Sub-label: "Based on social signal coverage"  11px, #9CA3AF

--- divider ---

PROPERTY DETAILS

  Type:          Formula E Series
  Country:       Global
  Sport:         Motorsport
  Season:        2025/26
  Tier:          Mid-tier

--- divider ---

SIGNALS BREAKDOWN  (small section label, all-caps)

  Instagram     ████░░  signal bar, labelled with platform name
  X / Twitter   ███░░░
  YouTube       ██░░░░
  TikTok        █░░░░░

  Note below bars: "Signal bars indicate relative platform coverage, not absolute reach."
  — 11px, #9CA3AF, italic

--- divider ---

ACTIONS (bottom of panel)

  [ Add to Watchlist ]    primary outlined button, accent border #C56B7C, text #C56B7C
  [ Compare ]             secondary ghost button, #6B7280

  Spacing between: 8px
```

**Important rules for the panel:**
- FitScore section must be visually separate from FanScore — same size, not merged
- Confidence is always below and smaller than both scores
- No score is presented as a "recommendation"
- Signal bars are descriptive — label them clearly as relative coverage
- Never use a star rating, gauge, or percentage circle for scores

---

## Navigation Sidebar

56px wide, dark background (#171A21), vertical stack of icons:

```
  [logo mark]         top, 32px

  [grid icon]         Explore (active — accent dot or accent underline)
  [list icon]         Browse All
  [bookmark icon]     Watchlist
  [compare icon]      Compare
  [briefcase icon]    Portfolio
  [star icon]         Opportunities

  [settings icon]     bottom
  [user icon]         bottom
```

Active state: icon in white, small 2px accent dot below icon or accent left border strip. No filled background blocks.

---

## Top Bar

Height: 48px, background white, bottom border 1px #E6E6E8

Left:   "SponsorAI" wordmark — "Sponsor" in #111827 weight 600, "AI" in accent #C56B7C
Center: Search input — placeholder "Search properties, sports, series..." — 14px, #9CA3AF, subtle border
Right:  User avatar circle (initials), 32px

---

## Tone Reminders

- This must feel like a **well-lit analytical workspace**
- No gradients on cards
- No emoji in the UI
- No progress rings or gauge visuals for scores
- No leaderboard numbering (no #1, #2, #3 badges)
- No "Best Match" or "Recommended" labels
- Confidence is descriptive ("High", "Moderate", "Limited") — never a percentage
- FanScore and FitScore are always separate, never combined into one number
- Empty states should be calm and informational, not playful

---

## What success looks like

A viewer should be able to look at this and think:

> "This is a serious analytical tool. I can trust the data here. It's not trying to sell me anything."

If it feels exciting, reduce it.
If it feels gamified, strip it back.
If the accent is everywhere, remove 80% of it.

When uncertain — simplify.
