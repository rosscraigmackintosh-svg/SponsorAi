## 1. SponsorAI — System Architecture Map

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (system orientation)

---

1. Purpose

Provides a top-level structural map of the SponsorAI platform, showing how:

- data flows 

- signals are computed 

- experience surfaces are generated 

- governance layers apply 

Primary goal:

&gt; Make the full SponsorAI system legible at a glance.

This document complements (not replaces) the detailed technical specs.

---

2. High-Level System View

SponsorAI consists of five major layers:

1. Source Data Layer 

2. Ingestion &amp; Normalisation 

3. Scoring &amp; Intelligence Engine 

4. Experience Surfaces 

5. Governance &amp; Trust Layer 

Each layer has clearly defined responsibilities.

---

============================================

## 2. LAYER 1 — SOURCE DATA# ============================================

### 2.1. 3. External Signal Sources

Primary inputs include:

- Instagram metrics 

- X / Twitter metrics 

- YouTube metrics 

- TikTok metrics 

- property-declared data (limited) 

Characteristics:

- largely public signals 

- platform-dependent 

- variable freshness 

- uneven coverage 

Known constraint:

&gt; SponsorAI is currently social-first, not full media valuation.

---

============================================

## 3. LAYER 2 — INGESTION & NORMALISATION# ============================================

### 3.1. 4. Ingestion Pipeline

Responsibilities:

- pull platform metrics 

- validate payloads 

- timestamp snapshots 

- detect anomalies 

- queue recalculation 

Key properties:

- idempotent 

- observable 

- retry-safe 

- source-attributed 

---

5. Identity Resolution

Handled via the Property Graph.

Responsibilities:

- map handles to canonical_property_id 

- detect duplicates 

- maintain confidence levels 

- preserve historical integrity 

Hard rule:

&gt; One real-world property → one canonical entity.

---

6. Normalisation Layer

Prepares data for scoring by:

- smoothing volatility 

- handling platform differences 

- adjusting for tier effects 

- validating freshness 

Purpose:

&gt; ensure FanScore comparability across the ecosystem.

---

============================================

## 4. LAYER 3 — SCORING & INTELLIGENCE# ============================================

### 4.1. 7. FanScore Engine

Computes attention gravity using:

- audience scale 

- engagement quality 

- growth momentum 

Key guardrails:

- no ROI implication 

- no commercial weighting 

- confidence-aware 

- versioned 

---

8. FitScore Engine

Computes contextual alignment using:

- geography 

- category 

- budget compatibility 

Key guardrails:

- no outcome prediction 

- no popularity influence 

- lens, not verdict 

---

9. Confidence Framework

Overlays:

- data coverage 

- freshness 

- stability 

Purpose:

&gt; communicate analytical certainty honestly.

---

============================================

## 5. LAYER 4 — EXPERIENCE SURFACES# ============================================

### 5.1. 10. Explore

Primary discovery interface.

Characteristics:

- row-based 

- deterministic 

- market-led 

- lightly personalisable 

---

11. Property Page

Canonical entity surface.

Displays:

- FanScore 

- context signals 

- opportunities 

- descriptive metadata 

---

12. Watchlist / Compare / Portfolio

User workflow layer.

Purpose:

- structured evaluation 

- not optimisation 

- not recommendation engine 

---

13. Opportunities Surface

Structured availability layer.

Governed by:

- Opportunities Qualification spec 

- neutrality rules 

- freshness logic 

---

============================================

## 6. LAYER 5 — GOVERNANCE & TRUST# ============================================

### 6.1. 14. Commercial Guardrails

Ensure revenue does not influence:

- FanScore 

- FitScore 

- Explore ordering 

- opportunity visibility 

---

15. Personalisation Policy

Constrains:

- feed manipulation 

- hidden ranking 

- behavioural targeting 

Maintains:

&gt; market-first discovery.

---

16. Property Portal Controls

Protect against:

- score gaming 

- data manipulation 

- pay-to-play dynamics 

---

17. Ethical &amp; Regulatory Posture

Cross-cutting layer ensuring:

- explainability 

- neutrality 

- transparency 

- auditability 

---

============================================

## 7. CROSS-CUTTING SYSTEM PROPERTIES# ============================================

### 7.1. 18. Versioning

All major components are:

- versioned 

- replayable 

- auditable 

---

19. Observability

System monitors:

- drift 

- anomalies 

- coverage gaps 

- pipeline health 

---

20. Human Oversight

Required for:

- taxonomy changes 

- major model updates 

- disputes 

- anomaly review 

SponsorAI remains human-supervised intelligence.

---

============================================

## 8. MENTAL MODEL SUMMARY# ============================================

SponsorAI can be mentally modelled as:

External Signals 

→ Structured Attention (FanScore) 

→ Contextual Alignment (FitScore) 

→ Market Visibility (Explore) 

→ User Judgement (human decision)

Hard principle:

&gt; SponsorAI clarifies the landscape — it does not choose the sponsor.

---

End of Document

