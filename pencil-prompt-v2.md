# Pencil Design Prompt v2 — SponsorAI Main Screen (Modern Refresh)

## What you are designing

Design the main **Explore screen** for **SponsorAI** — a calm, modern B2B sponsorship intelligence platform. Think: Linear meets Bloomberg. Structured and analytical but visually refined, with real visual weight and presence. Not a sports app. Not a leaderboard. A professional decision-support tool.

Two states to design:
1. **Default** — full-width card grid arranged in labelled discovery rows, cards have property imagery
2. **Selected** — same layout, compressed left, with a slide-in side panel showing full property detail

---

## Design Direction

**Reference aesthetic:** Linear · Vercel · Pitch · Stripe Dashboard
**Vibe:** Quietly premium. Dark shell, light content surface. Confident typography. Imagery with restraint.

**Key shifts from v1:**
- Cards now carry a **hero image** at the top (driver portrait, team photo, event scene, or series logo shot)
- The shell (sidebar + top bar) goes **full dark** for visual sophistication
- Cards use **subtle depth** (soft shadow, not flat borders only)
- Typography gets **more confident** — larger property names, bolder hierarchy
- The layout breathes more — slightly more generous card proportions
- Accent rose remains restrained — used for selection and action states only

**Never:** Gamified, leaderboard badges, hype language, saturated gradients, sports-broadcast energy.

---

## Colour System

```
── SHELL ──────────────────────────────────────────────
Shell background:      #0F1115   (sidebar, top bar)
Shell surface:         #171A21   (sidebar item bg)
Shell border:          #2A2F3A
Shell text primary:    #E5E7EB
Shell text muted:      #9CA3AF

── CONTENT ────────────────────────────────────────────
Page background:       #F1F2F4
Card surface:          #FFFFFF
Card border:           #E6E6E8
Card shadow:           0 2px 12px rgba(0,0,0,0.07)
Card shadow (hover):   0 6px 24px rgba(0,0,0,0.11)

── TEXT ───────────────────────────────────────────────
Text primary:          #111827
Text secondary:        #6B7280
Text muted / label:    #9CA3AF

── ACCENT ─────────────────────────────────────────────
Accent:                #C56B7C   (muted rose — selection, CTAs only)
Accent soft bg:        #F5E6EA
Accent border:         #E7C7CF

── STATUS ─────────────────────────────────────────────
Positive:              #1F7A52
Negative:              #A33A3A

── PROPERTY TYPE COLOURS ─────────────────────────────
Driver:   image overlay tint #3B5BDB,  pill bg #EEF2FF,  pill text #3B5BDB
Team:     image overlay tint #7048E8,  pill bg #F3F0FF,  pill text #7048E8
Series:   image overlay tint #1F7A52,  pill bg #EBFAF3,  pill text #1F7A52
Event:    image overlay tint #B45309,  pill bg #FEF3C7,  pill text #B45309
```

---

## Typography

```
Font: Inter (all weights)

10px / 600 / uppercase / tracking 0.08em  →  Row labels, section caps
11px / 400                                →  Micro labels, panel notes
12px / 400                                →  Secondary card data, meta
13px / 400                                →  Secondary body, subtitles
14px / 500                                →  Card property name
16px / 600                                →  Panel property name, section headings
20px / 700                                →  Panel score numerals
22px / 700                                →  Page title
```

---

## Layout Shell

### Sidebar (left, 60px wide)
- Background: #0F1115
- Full viewport height
- Top: SponsorAI logomark (white wordmark or monogram), 40px from top
- Nav icons stacked vertically with 8px gap, centered
- Active icon: white fill + 3px left accent bar (#C56B7C) on the icon row
- Inactive icons: #9CA3AF, no background
- Bottom: settings + avatar icons

### Top Bar (full width, 52px tall)
- Background: #0F1115 (matches sidebar — forms a unified dark L-shape)
- Bottom border: 1px solid #2A2F3A
- Left: "SponsorAI" — "Sponsor" in #E5E7EB weight 600, "AI" in #C56B7C — 16px
- Center: Search — dark input field (#171A21), border #2A2F3A, placeholder "Search properties, sports, series..." — 13px #9CA3AF, rounded-full, 320px wide
- Right: Filter icon button (subtle) + user avatar (36px circle, initials in white)

### Content Area
- Background: #F1F2F4
- Left padding: 24px (from sidebar edge), top padding: 28px, right padding: 24px
- Page title: "Explore" — 22px, weight 700, #111827
- Page subtitle: "Structured discovery across the sponsorship landscape." — 13px, #6B7280, 6px below title
- Filter strip: 20px below subtitle — horizontal row of filter chips for Sport, Property Type, Budget, Confidence. Chip style: white bg, 1px border #E6E6E8, 6px radius, 12px text, 8px horizontal padding. Active chip: border #C56B7C, text #C56B7C.

---

## Card Design (with imagery)

**Card dimensions:** ~260px wide × 200px tall

### Card structure (top to bottom):

**Image zone (top, ~96px tall):**
- Full-width image, cropped to top of card, border-radius 10px 10px 0 0
- Image subject depends on property type:
  - **Driver** → portrait photo of racing driver (helmet, suit, paddock)
  - **Team** → team livery or garage/pit-wall scene
  - **Series** → race scene, circuit shot, or championship graphic
  - **Event** → circuit aerial, podium scene, race start
- Over the bottom of the image: a subtle linear gradient fade to white (so it blends into the card body below)
- Top-left of image: property type pill badge — e.g. "SERIES" — small, 10px, coloured per type, with slight white bg blur/glass feel

**Card body (bottom ~104px, white bg):**

```
[ Property Name ]         14px, weight 600, #111827   — e.g. "Formula E"
[ Country · Sport ]       12px, #6B7280               — e.g. "Global · Motorsport"

  8px gap

[ FanScore row ]
  Label: "FanScore"       10px, #9CA3AF, uppercase
  Value: "74"             16px, weight 700, #111827
  Delta: "↑ +3.2"         11px, #1F7A52 (positive) or #A33A3A (negative)

[ Confidence row ]
  Label: "Confidence"     10px, #9CA3AF, uppercase
  Value: "Moderate"       11px, #6B7280
```

**Card states:**
- Default: white bg, soft shadow (0 2px 12px rgba(0,0,0,0.07)), radius 10px, no border needed
- Hover: shadow deepens (0 6px 24px rgba(0,0,0,0.11)), lifts slightly (transform: translateY(-2px))
- Selected: 2px accent border #C56B7C, shadow remains — NO fill change

**Critical rules:**
- FanScore always labelled "FanScore" — never "Score", "Rating", or a number alone
- No star ratings, progress rings, percentage circles, or gauge visuals
- No "#1", "#2" ranking badges anywhere
- Confidence is always smaller and secondary to FanScore

---

## Card Rows

Rows replace a single ranked list. Each row has a distinct analytical purpose.

**Row header:**
```
[ ROW LABEL ]             10px, weight 600, uppercase, #9CA3AF — e.g. "HIGH ENGAGEMENT LEADERS"
[ count badge ]           e.g. "12 properties" — 11px, #9CA3AF, right-aligned
```

Rows scroll horizontally (or wrap if you prefer grid). Use 16px gap between cards.

**Canonical rows (show 3–4):**
1. HIGH ENGAGEMENT LEADERS
2. FASTEST GROWING
3. EMERGING OPPORTUNITIES
4. ESTABLISHED PREMIUM ASSETS

Row header sits 24px above its cards. 32px gap between rows.

---

## Side Panel (Selected State)

When a card is selected, the panel slides in from the right. The card grid compresses left to make room. Panel does not overlay — it pushes the layout.

**Panel dimensions:** 400px wide, full viewport height (minus top bar)
**Panel background:** #FFFFFF
**Left border:** 1px solid #E6E6E8

### Panel — Hero Image Zone (top, 180px)
- Full-width image of the property (same type as card: driver / team / series / event)
- Gradient overlay fading from transparent to white at bottom (so content below reads cleanly)
- Over the image (bottom-left): property type pill
- Top-right: × close button — 32×32, white icon, subtle dark circle bg (#0F1115 at 40% opacity)

### Panel — Content (below image, 20px side padding)

```
[ Property Name ]             20px, weight 700, #111827
[ Country · Sport · Season ]  13px, #6B7280
                              12px gap

─── SECTION: SIGNALS ───────────────────────────
  (all-caps label 10px #9CA3AF)

  [ FanScore block ]
    Numeral:    "74"                    28px, weight 700, #111827
    Label:      "FanScore"             11px, #9CA3AF
    Sub-label:  "Attention signal · 30-day average"   11px, #9CA3AF
    Delta:      "↑ +3.2 vs prior period"              12px, #1F7A52

  16px gap

  [ FitScore block ]
    Numeral:    "68"                    28px, weight 700, #111827
    Label:      "FitScore"             11px, #9CA3AF
    Sub-label:  "Alignment signal"     11px, #9CA3AF
    Note:       "Requires brand profile to activate"   11px italic #9CA3AF
                (shown greyed out if no brand profile set)

  16px gap

  [ Confidence badge ]
    Pill:       "Moderate Confidence"   soft neutral pill, 12px, #6B7280 bg #F1F2F4
    Sub-label:  "Based on social signal coverage"    11px, #9CA3AF

─── SECTION: PROPERTY DETAILS ──────────────────
  (all-caps label 10px #9CA3AF)

  Type:        Formula E Series
  Country:     Global
  Sport:       Motorsport
  Season:      2025/26
  Tier:        Mid-tier

  Render as a 2-column key:value list, 12px, #6B7280 keys, #111827 values

─── SECTION: SIGNAL COVERAGE ──────────────────
  (all-caps label 10px #9CA3AF)

  Platform rows (each row):
    [ Platform name ]  [ thin bar ]  [ bar fill ]
    Instagram          ████░░░░░░
    X / Twitter        ███░░░░░░░
    YouTube            ██░░░░░░░░
    TikTok             █░░░░░░░░░

  Bar: 6px tall, background #F1F2F4, fill #C56B7C at ~20% opacity (very soft)
  Note below: "Relative platform coverage — not absolute reach."  11px italic #9CA3AF

─── ACTIONS ────────────────────────────────────
  (pinned to bottom of panel or below signal coverage)

  [ Add to Watchlist ]   outlined button: border #C56B7C, text #C56B7C, bg white, 36px tall
  [ Compare ]            ghost button: text #6B7280, no border, 36px tall

  8px gap between buttons. Buttons full width of panel content area.
```

**Signal rules:**
- FanScore and FitScore must be visually equal weight, clearly separate — never merged
- Never present either score as a "recommendation" or "best match"
- Confidence is always below and smaller than both score blocks
- Signal coverage bars are clearly labelled as relative, not absolute

---

## Empty / Loading States

- Empty row: pale dashed card outline, "No properties matched this filter." — 13px, #9CA3AF, centered
- Loading card: skeleton shimmer — neutral-100 bg with animated shimmer sweep, card proportions maintained
- No playful illustration in empty states — keep it calm and factual

---

## Interaction Notes for Pencil

Show the design in **two frames** side by side:

**Frame 1 — Default state:**  Full-width explore grid, no panel, 3–4 rows with ~4 cards each visible

**Frame 2 — Selected state:**  Same grid compressed (~60% width), side panel open at right with a Driver property selected (e.g. a racing driver card) — panel showing full detail

---

## Tone Test

Before finalising, check:
- Does it feel like a professional analytical tool? ✓
- Does any element feel like a sports app or leaderboard? → remove it
- Is the accent colour used in more than 3–4 places? → reduce it
- Do the card images add information, or just decoration? → they should show the property type clearly
- Can a first-time user immediately understand FanScore ≠ FitScore? → if not, clarify hierarchy

**Reference vibe:** Bloomberg Terminal meets Pitch.com meets Linear.app
**Not:** ESPN, Sofascore, a betting dashboard, or a growth-hack SaaS tool.

When uncertain — simplify.
