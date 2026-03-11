## 1. SponsorAI_Model_Governance_MASTER.md

Status: Canonical Model Governance Layer 

Applies to: FanScore v1 (Active), FitScore (Future Phase) 

Includes: Model Architecture, Confidence Engine, Versioning, Suppression, Integrity, Enterprise Controls 

---

I. Governance Principles

1. SponsorAI is a decision-support system, not a ranking engine.

2. FanScore and FitScore must remain structurally separate.

3. No universal leaderboard may be produced.

4. All models must be versioned.

5. Confidence must always accompany a score.

6. Suppression is preferable to publishing unreliable outputs.

7. All model changes must be documented and auditable.

---

II. Model Architecture Overview

1. FanScore (Active)

Purpose:

Measures digital fan engagement health.

Does NOT measure:

- ROI

- Brand fit

- Sponsorship value

- Price

Scope:

Digital-only signals (v1).

Core Signal Groups:

- Audience &amp; Reach 

- Engagement Quality 

- Loyalty &amp; Stability 

- Cultural Resonance 

- Integrity Checks 

FanScore must:

- Display model version

- Display confidence band

- Be suppressible

- Never imply “best”

---

2. FitScore (Future Phase)

Status: Not active in MVP.

Purpose:

Measures scenario-specific alignment between property and user-defined criteria.

Hard Rules:

- Private to organisation

- Scenario-bound

- Not exportable as ranking

- Cannot power global ordering

- Must display confidence

FitScore model must be versioned independently when activated.

---

III. Confidence Model Architecture

ConfidenceModel Version: v1.0

Confidence answers:

“How much should this score be trusted given available data?”

Confidence does NOT:

- Predict performance

- Guarantee outcomes

- Act as probability

---

IV. Confidence Components

Confidence is computed from four internal subscores:

C = Completeness 

F = Freshness 

S = Stability 

I = Integrity 

Internal calculation:

CONF = C^wC * F^wF * S^wS * I^wI

Numeric CONF is never user-facing.

---

V. Component Definitions

1. Completeness (C)

Measures availability of required signal groups.

Required groups:

- Audience &amp; Reach 

- Engagement Quality 

- Loyalty &amp; Stability 

- Cultural Resonance 

- Integrity Check 

Minimum rule:

At least 4 of 5 groups must be present.

Integrity must always be present.

If C &lt; 0.6 → suppression candidate.

---

2. Freshness (F)

Measures recency of data.

Freshness windows (v1 policy):

High velocity platforms 

Fresh ≤ 7 days 

Stale ≥ 30 days 

Medium velocity platforms 

Fresh ≤ 14 days 

Stale ≥ 45 days 

Low velocity platforms 

Fresh ≤ 30 days 

Stale ≥ 90 days 

Linear decay applied between Fresh and Stale.

If F &lt; 0.5 → suppression candidate.

---

3. Stability (S)

Primary rolling window: 60 days 

Minimum required history: 45 days 

Volatility and spike detection reduce S.

If history &lt; 45 days → completeness penalty applied.

---

4. Integrity (I)

Integrity starts at 1.0.

Penalty table (v1):

Minor anomaly → -10% 

Moderate anomaly → -25% 

Severe anomaly → -50% 

Penalties stack multiplicatively.

If I &lt; 0.5 → suppression candidate.

Severe anomaly may trigger:

- Manual review

- Temporary suppression

All flags logged and explainable.

---

VI. Suppression Rules

FanScore is suppressed if ANY of:

- Completeness C &lt; 0.6 

- Freshness F &lt; 0.5 

- Integrity I &lt; 0.5 

- Overall CONF &lt; 0.4 

When suppressed:

Display: 

Insufficient Data 

Explanation required.

No partial numeric display permitted.

---

VII. Confidence Bands (User-Facing)

Mapping (v1):

High Confidence → CONF ≥ 0.75 

Moderate Confidence → 0.55 ≤ CONF &lt; 0.75 

Limited Confidence → CONF &lt; 0.55 

Numeric CONF not displayed.

---

VIII. UI Confidence Copy Standards

High Confidence

“This score is based on complete and recent engagement data with stable performance patterns.”

Optional additions:

- All key signal groups available.

- No integrity concerns detected.

---

Moderate Confidence

“This score reflects mostly complete and recent data. Some limitations are noted below.”

Reasons limited to max 3.

---

Limited Confidence

“This score is calculated from limited or unstable data. Interpret with caution.”

Reasons must be specific:

- Missing signal groups

- Stale data

- High volatility

- Integrity adjustment

---

Insufficient Data

“We do not currently have enough reliable information to generate a FanScore.”

Reasons mandatory.

---

IX. Data Governance Requirements

All scoreable properties must maintain:

- Source attribution

- Timestamp logs

- Coverage record

- Version reference

No illegal or ToS-violating data sources permitted.

---

X. API Governance

API must not allow:

- Global ordered extraction

- Leaderboard reconstruction

- Removal of confidence

- Removal of model version

- Bulk unrestricted dataset access

Rate limiting and monitoring required.

---

XI. Versioning Rules

FanScore versioned independently. 

ConfidenceModel versioned independently. 

FitScore versioned independently.

Model update classification:

Minor:

- Weight calibration

- Threshold adjustment

Major:

- New signal group

- Signal removal

- Scope expansion

Major updates require:

- Red-team review

- Founder approval

- Enterprise notification

Historical scores must remain accessible.

---

XII. Audit Requirements

For every score generation event, store:

- C numeric 

- F numeric 

- S numeric 

- I numeric 

- CONF numeric 

- Confidence band 

- Model version 

- ConfidenceModel version 

- Timestamp 

Audit logs must be immutable.

---

XIII. Bias Monitoring

Monthly internal review must assess:

- Confidence band distribution by category

- Geography

- Gender

- Property size cohort

If cohort deviation &gt;20% vs baseline:

Governance review required.

No automatic correction permitted.

---

XIV. Commercial Integrity

No model output may be influenced by:

- Payment

- Partnership

- Federation status

- Commercial agreement

Commercial requests conflicting with constitution require formal escalation and documentation.

---

XV. Liability Boundary

SponsorAI provides structured decision support.

SponsorAI does not:

- Provide investment advice

- Guarantee outcomes

- Guarantee ROI

All exports must include disclaimer language.

---

XVI. Drift Review Checklist

Before shipping model changes:

- Screenshot test 

- Ranking drift test 

- API exposure review 

- Confidence recalibration review 

- Bias review 

- Legal phrasing review 

All documented.

---

End of Model Governance Layer.

