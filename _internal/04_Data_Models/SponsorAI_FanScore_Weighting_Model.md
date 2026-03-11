## 1. SponsorAI — FanScore Weighting Deep Model

Version: v1.0 

Last updated: 2026-02-23 

Authority: High

---

1. Purpose

Defines how FanScore weighting adapts across property scale tiers to preserve fair comparability between:

- elite properties 

- mid-tier properties 

- emerging properties 

Goal:

&gt; Prevent large accounts from structurally dominating discovery.

---

2. Tier Classification (Internal)

Properties are internally classified into attention bands:

- Tier A — Elite scale 

- Tier B — Established mid-tier 

- Tier C — Emerging 

Classification is based on rolling audience scale percentiles within sport.

This classification is **not user-facing**.

---

3. Weight Adaptation by Tier

Tier A — Elite Properties

Risk: raw scale dominates.

**Recommended weights**

- Audience Scale: 0.35 

- Engagement Quality: 0.40 

- Momentum: 0.25 

Rationale:

- slightly dampen pure scale 

- reward active audience depth

---

Tier B — Mid-Tier (Default Focus)

**Recommended weights**

- Audience Scale: 0.40 

- Engagement Quality: 0.35 

- Momentum: 0.25 

Rationale:

- balanced visibility model 

- supports current motorsport wedge

---

Tier C — Emerging Properties

Risk: small but fast-growing properties get buried.

**Recommended weights**

- Audience Scale: 0.30 

- Engagement Quality: 0.35 

- Momentum: 0.35 

Rationale:

- reward upward movement 

- surface rising assets earlier

---

4. Momentum Safeguard

To prevent volatility spikes:

- growth must be sustained across ≥2 intervals 

- anomaly detection must suppress sudden spikes 

- minimum activity threshold required 

---

5. Cross-Sport Normalisation

FanScore must always be normalised within:

- sport 

- property type 

- tier band 

Purpose:

&gt; Enable fair discovery across fragmented ecosystems.

---

6. Guardrails

The weighting model must never:

- artificially equalise elite and grassroots 

- create “underdog boosting” 

- imply future performance 

- imply sponsorship value

---

7. Version Control

Any weight adjustment must:

- be version logged 

- be replay-testable 

- maintain historical explainability 

---

End of Document

