## 1. SponsorAI — Scoring Technical Specification

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (analytical integrity)

---

1. Purpose

This document defines the technical construction, inputs, constraints, and guardrails for:

- FanScore (Attention)

- FitScore (Alignment)

These signals are intentionally independent and must never be merged into a single master score.

---

2. System Principles (Non-Negotiable)

- Signals remain structurally separate.

- No composite “best sponsorship” score is permitted.

- Scores are directional indicators, not predictions.

- Confidence and data coverage must be respected.

- Budget is never part of scoring logic.

- All outputs must avoid false precision.

---

============================================

## 2. PART A — FANSCORE# ============================================

### 2.1. 3. FanScore Definition

FanScore measures **digital attention gravity** around a property.

It is designed to answer:

&gt; “How much audience attention is this property currently generating?”

It does NOT measure:

- commercial value

- sponsorship ROI

- audience quality

- brand fit

- performance success

---

4. FanScore Inputs

4.1 Core Components

FanScore is derived from three weighted vectors:

1. Audience Scale 

2. Engagement Quality 

3. Momentum (Growth)

---

4.2 Input Metrics

Audience Scale

Examples:

- total followers (cross-platform)

- subscriber counts where available

Purpose:

- establishes attention ceiling

---

Engagement Quality

Examples:

- average engagement per post

- engagement rate

- interaction depth (likes, comments, shares weighted)

Purpose:

- measures active audience participation

---

Momentum (Growth)

Examples:

- follower growth rate (30d / 90d)

- engagement trend delta

- posting consistency signals

Purpose:

- captures directional movement

---

5. FanScore Calculation Model (Reference)

High-level structure:

FanScore_raw =

(W1 × AudienceScale_norm)

-  (W2 × Engagement_norm) 
-  (W3 × Growth_norm) 

Where:

- W1 + W2 + W3 = 1.0

- All inputs are normalised within tier/context

- Final score scaled to SponsorAI range

---

6. Recommended Default Weights (v1)

Initial balanced model:

- Audience Scale: 0.40 

- Engagement Quality: 0.35 

- Momentum: 0.25 

Rationale:

- scale matters but does not dominate 

- engagement signals real attention 

- growth captures forward movement 

Weights may evolve but must remain documented and versioned.

---

7. Normalisation Rules

FanScore must be normalised by:

- sport

- tier

- property type (athlete / team / event / series)

Purpose:

Prevent elite properties from structurally overwhelming mid-tier discovery.

---

8. Confidence Handling

Each FanScore should internally track:

- data completeness

- platform coverage

- signal freshness

Where confidence is weak, the system should:

- soften language

- avoid strong comparative framing

- surface coverage notes where appropriate

---

============================================

## 3. PART B — FITSCORE# ============================================

### 3.1. 9. FitScore Definition

FitScore measures **brand–property alignment**.

It is designed to answer:

&gt; “How contextually aligned is this property with the brand’s profile?”

It does NOT measure:

- popularity

- attention scale

- sponsorship performance

- ROI potential

---

10. FitScore Inputs

10.1 Core Alignment Dimensions

FitScore is derived from:

1. Geographic alignment 

2. Category alignment 

3. Budget compatibility 

4. Optional contextual signals (future)

---

11. FitScore Calculation Model (Reference)

High-level structure:

FitScore_raw =

(A × GeoMatch)

-  (B × CategoryMatch) 
-  (C × BudgetCompatibility) 

Where:

- A + B + C = 1.0

- Each component is bounded and explainable

- Budget acts primarily as a gating factor

---

12. Budget Handling (Critical Rule)

Budget must:

- primarily act as a filter

- never inflate alignment artificially

- never be used to rank properties globally

Acceptable behaviour:

- eligibility gating

- compatibility signalling

Prohibited behaviour:

- boosting FanScore

- boosting global ordering

- acting as value proxy

---

13. FitScore Behaviour in UI

FitScore is used to:

- re-rank within filtered views

- surface contextual alignment

- support exploration

It must NOT:

- produce a single “best sponsorship”

- override FanScore visibility layer

- imply expected performance

---

============================================

## 4. PART C — PRESENTATION GUARDRAILS# ============================================

### 4.1. 14. Language Requirements

Scores must be framed as:

- directional

- indicative

- context-dependent

Avoid:

- deterministic claims

- outcome promises

- optimisation language

---

15. Cross-Signal Protection

Hard rule:

FanScore, FitScore, and Budget must never be collapsed into:

- one master score

- one ranking axis

- one recommendation engine

If future features attempt this, they must be flagged.

---

16. Versioning

Any change to:

- weights

- inputs

- normalisation logic

- scaling

must:

- increment spec version

- be logged in Working Memory

- maintain backward explainability where possible

---

17. Known Limitations (v1 Reality)

Current constraints include:

- heavy reliance on social data

- limited broadcast visibility

- uneven platform coverage by sport

- potential lag in growth signals

System behaviour must remain honest about these limits.

---

End of Specification

