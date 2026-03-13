# PRODUCT_GUARDRAILS.md

SponsorAI — Engineering-Relevant Product Constraints

Last updated: 2026-03-12

---

## Purpose

This document summarises the constitutional rules that directly affect engineering and AI development decisions. It does not replace or restate the source documents. Every rule here derives from an authoritative document in `_internal`.

When a rule conflicts with a feature request or shortcut, the rule wins.

---

## Authoritative Source

The primary authority document is:
`_internal/00_Core_Truth/SponsorAI_Constitution.md`

The commercial guardrail layer is:
`_internal/02_Product_Definition/SponsorAI_Commercial_Model_Guardrails.md`

The neutrality governance document is:
`_internal/02_Product_Definition/SponsorAI_Neutrality_Safe_Growth_Engine.md`

---

## 1. Signal Separation — Non-Negotiable

FanScore and FitScore must remain visually and computationally separate at all times.

FanScore = digital attention only. It does not imply value, ROI, or quality.
FitScore = strategic alignment only. It does not imply popularity or performance.

Do not:
- Merge them into a composite score
- Combine them into a single bar, ring, or color treatment
- Allow one to influence the other in the UI
- Present them together in a way that implies a ranking verdict

Source: `_internal/00_Core_Truth/SponsorAI_Constitution.md`, Section 3

---

## 2. No Pay-to-Rank

Revenue relationships must never influence analytical outputs.

Do not:
- Adjust FanScore or FitScore based on commercial status
- Surface paying properties higher in Explore without disclosure
- Add any "featured" or "promoted" treatment that implies analytical superiority
- Create hidden boosts of any kind

Source: `_internal/00_Core_Truth/SponsorAI_Constitution.md`, Section 9

---

## 3. No Leaderboard Patterns

SponsorAI is a visibility platform, not a competition.

Do not add:
- Numeric rank indicators (1st, 2nd, #3, etc.)
- Medal or trophy iconography
- Tier labels based on score level (Top Tier, Elite, etc.)
- "Best" or "Top" labels applied to any property
- Score-based color gradients implying high = good, low = bad

The current default sort (FanScore descending) is a convenience, not an endorsement. Do not add visual language that endorses it as a ranking.

Source: `_internal/00_Core_Truth/SponsorAI_Constitution.md`, Sections 3, 6
Source: `_internal/05_UX_IA/SponsorAI_Explore_Ranking_Philosophy.md`

---

## 4. Confidence Must Remain Secondary

Confidence indicators exist to acknowledge uncertainty, not to elevate or suppress properties.

Do not:
- Promote confidence to a primary visual position
- Color confidence bands with accent, positive, or negative colors
- Use confidence to rank or filter properties by default
- Remove suppressed cards from the grid (show them with `--` notation instead)

Source: `_internal/04_Data_Models/Confidence_Model_Policy_v1.md`
Source: `_internal/04_Data_Models/SponsorAI_Confidence_Framework.md`

---

## 5. Language Guardrails

The platform tone is calm, analytical, and intelligence-first.

Prohibited in any user-facing text or AI-generated copy:
- "best sponsorship"
- "guaranteed ROI"
- "top performing property"
- "recommended for you" (in a prescriptive sense)
- Hype language, betting-style framing, growth-hack patterns

Preferred framing:
- "Here is what the data shows"
- Directional language where data is incomplete
- Explicit acknowledgment of confidence limits

Source: `_internal/00_Core_Truth/SponsorAI_Constitution.md`, Sections 5, 7
Source: `_internal/03_Design_System/Rules/11_Copy_and_Tone.md`

---

## 6. Data Honesty Rule

Where coverage is incomplete, the system must say so.

Do not:
- Render a FanScore when `suppression_reason` is not null — show `--` instead
- Imply precision the data does not support
- Present partial data as if it were complete

Source: `_internal/00_Core_Truth/SponsorAI_Constitution.md`, Section 8
Source: `_internal/04_Data_Models/SponsorAI_Scoring_Spec.md`

---

## 7. Feature Admission Test

Before shipping any significant feature, verify it passes all five questions from the Constitution:

1. Does this preserve trust?
2. Does this avoid optimisation creep?
3. Does this maintain signal separation?
4. Does this keep SponsorAI out of marketplace territory?
5. Does the tone remain calm and analytical?

If any answer is uncertain, escalate before building.

Source: `_internal/00_Core_Truth/SponsorAI_Constitution.md`, Section 11

---

## 8. Design System Integrity

The design system is governed and token-based. No UI change should introduce hardcoded hex values.

See the full design system at: `_internal/03_Design_System/`

The load order for AI-assisted UI work is defined in: `CLAUDE.md`
