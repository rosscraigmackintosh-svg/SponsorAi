## 1. Confidence_Model_Policy_v1.md

Status: Operational Default 

Applies to: FanScore v1 (Digital) 

ConfidenceModel Version: v1.0 

---

I. Default Window Sizes (v1 Lock)

These are policy defaults. 

Any change requires a version bump.

1. Stability Window

Primary rolling window: 60 days 

Minimum historical requirement: 45 days 

If historical data &lt; 45 days → Completeness penalty applied.

---

2. Freshness Windows

Platform data freshness thresholds:

High-velocity social (TikTok, Instagram) 

Fresh ≤ 7 days 

Stale ≥ 30 days 

Medium velocity (YouTube, LinkedIn) 

Fresh ≤ 14 days 

Stale ≥ 45 days 

Low velocity / aggregate 

Fresh ≤ 30 days 

Stale ≥ 90 days 

Between Fresh and Stale → linear decay.

---

3. Completeness Threshold

Required signal groups:

- Audience &amp; Reach 

- Engagement Quality 

- Loyalty &amp; Stability 

- Cultural Resonance 

- Integrity Check 

Minimum rule:

- At least 4 of 5 groups must be present 

- Integrity must always be present 

If fewer than 4 groups available → suppression candidate.

---

II. Subscore Minimums (Suppression Logic)

Suppression triggers if ANY of the following:

- Completeness C &lt; 0.6 

- Freshness F &lt; 0.5 

- Integrity I &lt; 0.5 

- Overall CONF &lt; 0.4 

If triggered:

FanScore not shown. 

Display: **Insufficient Data**

---

III. Confidence Band Mapping (v1)

Internal CONF score maps to:

High Confidence → CONF ≥ 0.75 

Moderate Confidence → 0.55 ≤ CONF &lt; 0.75 

Limited Confidence → CONF &lt; 0.55 

Numeric CONF is not user-facing.

---

IV. Integrity Penalty Defaults (v1)

Integrity flags apply multiplicative penalties.

Minor anomaly → -10% 

Moderate anomaly → -25% 

Severe anomaly → -50% 

Penalties stack multiplicatively.

Severe anomaly may trigger:

- Manual review flag 

- Temporary suppression 

All penalties logged.

---

V. Bias Monitoring Hook

Monthly internal report must track:

- Confidence band distribution by sport category 

- Gender category 

- Geography 

- Property size cohort 

Flag condition:

If one cohort has &gt;20% higher Limited Confidence rate vs baseline.

No automatic score adjustments permitted. 

Governance review required.

---

VI. UI Microcopy Templates

High Confidence

Display:

High Confidence 

This score is based on complete and recent engagement data with stable performance patterns.

Optional dynamic additions:

- All key signal groups available. 

- No integrity concerns detected.

---

Moderate Confidence

Display:

Moderate Confidence 

This score reflects mostly complete and recent data. Some limitations are noted below.

Dynamic reasons (max 3):

- Engagement data on one platform is outdated. 

- Recent volatility detected in the last 30 days. 

- Coverage is limited on emerging platforms.

---

Limited Confidence

Display:

Limited Confidence 

This score is calculated from limited or unstable data. Interpret with caution.

Dynamic reasons:

- Two key signal groups are unavailable. 

- Recent activity shows unusually high volatility. 

- Unusual growth patterns detected and adjusted. 

- Data coverage is limited in this category.

---

Insufficient Data (Suppression)

Display:

Insufficient Data 

We do not currently have enough reliable information to generate a FanScore.

Reason examples:

- Fewer than four required signal groups available. 

- Data is significantly outdated. 

- Integrity review pending.

---

VII. Export Requirements

Every export must include:

- Confidence band 

- Top 2–4 explanation reasons 

- Model version 

- Confidence model version 

- Timestamp 

Mandatory disclaimer:

Confidence reflects data completeness, freshness, stability, and integrity checks. It does not predict sponsorship performance or ROI.

---

VIII. Audit Log Structure

For each score generation event, store:

- Completeness (C) numeric 

- Freshness (F) numeric 

- Stability (S) numeric 

- Integrity (I) numeric 

- Overall CONF numeric 

- Confidence band 

- Threshold version 

- Model version 

- Timestamp 

Audit logs must be immutable.

---

IX. Governance Rule

Confidence model must be versioned independently from FanScore.

Example:

FanScore v1.2 

ConfidenceModel v1.0 

Any threshold change requires version increment.

