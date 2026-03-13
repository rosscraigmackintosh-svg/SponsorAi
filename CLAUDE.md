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

## Claude Working Modes

Every task on this project belongs to one of five modes. The active mode determines how Claude should behave.

**Declare the mode at the start of any prompt if it is not obvious from context.**

| Mode | When to use | Primary behaviour |
|---|---|---|
| **Build** | Implementing features or fixes | Act as senior engineer. Prefer simple, robust solutions. Avoid breaking existing behaviour. Automate safe steps. Include DB changes explicitly if required. |
| **Review** | After implementation | Act as paranoid senior reviewer. Look for bugs, regressions, broken assumptions, edge cases. Explain issues clearly. Do not rewrite unnecessarily. |
| **Audit** | Data completeness, ingestion validation, duplicate detection, image and FanScore coverage | Verify entities, relationships, presentation data, scoreability. Distinguish intentional suppression from broken ingestion. Report exact failure points. Prefer diagnosis before repair. |
| **Architecture** | System design and future planning | Focus on scalability, automation, maintainability, multi-sport expansion. Evaluate tradeoffs. Recommend structure before implementation. |
| **Documentation** | Syncing ledgers, roadmap, system state, contracts, setup docs | Update docs without changing app code. Keep roadmap, backlog, and working context aligned. Capture future ideas separately from active build scope. |

For full mode detail, prompt templates, and workflow sequences, see `project-docs/AI_ENGINEERING_PLAYBOOK.md` Section 11.

---

## Automation and Human-in-the-Loop

**Default rule:** If anything can be safely automated instead of manual, automate it.

**Balancing rule:** Where ambiguity or risk exists, keep a human in the loop rather than faking automation. Do not simulate success. Do not paper over gaps with optimistic defaults.

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