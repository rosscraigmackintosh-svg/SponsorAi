## 1. SponsorAI — Taxonomy & Classification System

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (data consistency &amp; FitScore integrity)

---

1. Purpose

Defines the canonical classification framework used across SponsorAI to ensure:

- consistent property grouping 

- reliable FitScore behaviour 

- scalable multi-sport expansion 

- clean filtering and discovery 

Primary goal:

&gt; One shared structural language across the entire platform.

---

2. Core Design Principles

The taxonomy must be:

- hierarchical 

- extensible 

- deterministic 

- human-readable 

- machine-friendly 

- versioned 

Hard rule:

&gt; Classification drift is a systemic risk and must be tightly controlled.

---

3. Primary Classification Axes

SponsorAI classifies entities across five primary axes:

1. Sport 

2. Discipline / Series 

3. Property Type 

4. Geography 

5. Commercial Category (for FitScore)

Each axis serves a distinct analytical purpose.

---

============================================

## 2. AXIS A — SPORT HIERARCHY# ============================================

### 2.1. 4. Sport Layer

The top-level grouping.

Examples:

- Motorsport 

- Rugby 

- Cycling 

- Combat Sports 

- Esports 

Rules:

- must remain mutually exclusive 

- must remain stable 

- additions require taxonomy review 

---

5. Discipline / Series Layer

Defines structured sub-groupings within a sport.

Examples (Motorsport):

- Formula series 

- GT racing 

- Endurance racing 

- Rally 

Purpose:

- enable meaningful peer comparison 

- support tier normalisation 

- improve discovery relevance 

---

6. Tier Classification (Internal)

Properties may be internally banded by attention scale.

Purpose:

- normalisation 

- discovery fairness 

- FanScore weighting 

Tier labels remain:

- internal 

- non-promotional 

- non-judgemental 

---

============================================

## 3. AXIS B — PROPERTY TYPE# ============================================

### 3.1. 7. Canonical Property Types

SponsorAI currently supports:

- Athlete / Driver 

- Team 

- Event 

- Series / Championship 

Each type has distinct behaviour in:

- FanScore calculation 

- FitScore interpretation 

- Explore surfacing 

- Opportunities logic 

---

8. Property Type Guardrails

Property type must:

- be singular and canonical 

- not be user-editable 

- be determined by SponsorAI logic 

- remain historically stable 

Misclassification is a high-impact error.

---

============================================

## 4. AXIS C — GEOGRAPHY MODEL# ============================================

### 4.1. 9. Geographic Anchors

Each property may have:

- primary country 

- optional regional scope 

- optional global flag 

Purpose:

- support FitScore geography matching 

- enable market filtering 

- support regional discovery 

---

10. Geographic Matching Rules

FitScore geography alignment should consider:

- country overlap 

- regional relevance 

- global reach signals 

But must avoid:

- over-precision 

- false localisation 

- forced matches 

---

============================================

## 5. AXIS D — COMMERCIAL CATEGORY SYSTEM# ============================================

### 5.1. 11. Category Purpose

Commercial categories support FitScore alignment.

They represent:

&gt; areas of brand–property compatibility.

They do NOT represent:

- audience demographics 

- sponsorship success 

- FanScore influence 

---

12. Category Structure

Categories should be:

- hierarchical 

- finite 

- clearly defined 

- version-controlled 

Example top-level groups:

- Automotive 

- Financial Services 

- Technology 

- Consumer Goods 

- Energy 

- Travel &amp; Hospitality 

---

13. Category Assignment Rules

Properties may declare:

- primary categories 

- secondary categories 

But SponsorAI retains authority to:

- validate 

- normalise 

- override clearly incorrect mappings 

---

============================================

## 6. AXIS E — STATUS & LIFECYCLE# ============================================

### 6.1. 14. Property Status States

Each property may be:

- Active 

- Dormant 

- Retired 

- Unknown 

Status influences:

- refresh cadence 

- Explore eligibility 

- confidence behaviour 

---

15. Opportunity Status

Opportunities maintain separate lifecycle states:

- Active 

- Aging 

- Stale 

- Closed 

These must never be conflated with property status.

---

============================================

## 7. GOVERNANCE & CHANGE CONTROL# ============================================

### 7.1. 16. Taxonomy Change Management

Any structural taxonomy change must:

- be versioned 

- be documented 

- be backward reviewed 

- pass FitScore impact review 

- pass Explore impact review 

Uncontrolled taxonomy edits are prohibited.

---

17. Extension Rules

When adding new sports or categories:

Must evaluate:

- signal availability 

- classification clarity 

- peer group density 

- FitScore implications 

If unclear → delay expansion.

---

18. Observability

SponsorAI should monitor for:

- orphaned classifications 

- category overgrowth 

- sport imbalance 

- FitScore distortion from taxonomy changes 

Purpose:

&gt; maintain long-term structural health.

---

19. Future Evolution

The taxonomy is expected to evolve carefully over time.

However, changes must always preserve:

- interpretability 

- historical comparability 

- cross-sport fairness 

- FitScore stability 

---

End of Document

