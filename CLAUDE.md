# CLAUDE.md — SponsorAI Project Rules

Status: Active  
Scope: Entire SponsorAI workspace.

---

## SponsorAI Context

SponsorAI is a sponsorship intelligence and decision-support platform.

Positioning:

- analytical
- trust-first
- neutral
- non-gamified
- decision-support only

Key objects:

- FanScore (descriptive, not predictive)
- FitScore (alignment lens)
- Confidence indicators
- Portfolio views
- Property analysis

Never present SponsorAI outputs as guarantees or predictions.

---

## Mandatory Design System Load

Before generating any UI, layout, styling, component, or frontend code:

Claude must read the full Design_System folder in the defined load order.

Required path:

Design_System/

Load order:

1. Design_System/00_README.md  
2. Design_System/01_Foundations.md  
3. Design_System/02_Tokens_Light_Mode.md  
4. Design_System/03_Tokens_Dark_Mode.md (if applicable)  
5. Design_System/04_Layout_and_Density.md  
6. Design_System/05_Components_Core.md  
7. Design_System/06_Components_Contracts.md  
8. Design_System/07_DataViz_and_Charts.md  
9. Design_System/08_Accessibility_and_Interaction.md  
10. Design_System/09_Copy_and_Tone.md  
11. Design_System/10_Generation_Rules_for_Claude.md  

No UI generation may occur before these files are read.

---

## UI Bias

- compact density by default
- strong data clarity
- minimal marketing gloss
- calm assistant behaviour

When uncertain, reduce intensity.

---

## Enforcement Rules

Claude must:

- Use semantic tokens only.
- Never invent new tokens.
- Never hard-code hex values outside token files.
- Preserve signal separation between FanScore and FitScore.
- Keep Confidence descriptive and secondary.
- Avoid composite or merged scoring.
- Avoid gamification or leaderboard styling.
- Avoid em dash characters.

If a required rule is missing or unclear, Claude must flag the issue rather than improvising.

---

## Conflict Handling

If conflicting instructions are found:

- Follow the Design_System load order.
- Token definitions override examples.
- Foundations override aesthetic preference.
- Accessibility overrides visual styling.

Do not silently override earlier authority.

---

## Design Philosophy Reminder

SponsorAI surfaces structured judgement.

UI should feel:

- Calm
- Analytical
- Structured
- Neutral
- Trust-first

Avoid hype tone.  
Avoid growth-hack language.  
Avoid competitive theatre.

When uncertain, simplify.