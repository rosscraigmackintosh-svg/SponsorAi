#  Confidence_Model_Spec.md (or append to FanScore_Model_Spec.md)

## 1. Confidence Model Specification

Status: Canonical Draft

Applies to: FanScore v1 (Digital) and FitScore (Future Phase)

User-facing output: Confidence Band + Reasons (not numbers)

# 1. Purpose

Confidence answers one thing:

**“How much should you trust this score given the data we have and how stable it is?”**

Confidence does **not**:

-  predict sponsorship success 
-  estimate ROI 
-  act as a probability of “being correct” 

# 2. Components

Confidence is computed from four components already defined in your docs:

1.  **Completeness** 
2.  **Freshness** 
3.  **Stability** 
4.  **Integrity** (anomaly / bot risk) 

Each component produces a **0.0–1.0 internal subscore** and a set of **explanations**.

User sees:

-  High / Moderate / Limited 
-  Reasons (plain English) 
-  What’s missing, and why it matters 

# 3. Inputs Required

For each property, for each platform / signal group:

-  Coverage presence (is the signal available?) 
-  Update timestamp (how recent?) 
-  Time series values (enough history to assess stability) 
-  Integrity flags (anomaly triggers, if any) 

Uncertainty Flag:

Exact platform list and signal group definitions are assumed to exist in the data schema but are not locked in these markdown files yet.

# 4. Subscore Definitions

## 1. 4.1 Completeness Subscore (C)

**Goal:** Are we missing key signal groups?

Compute:

-  Define required signal groups for FanScore: Audience &amp; Reach, Engagement Quality, Loyalty &amp; Stability, Cultural Resonance, Integrity Signals 

For each group g, compute:

-  present_g = 1 if data exists and passes minimum requirements, else 0 
-  weight_g = internal weight (not user-facing) 

Then:

C = (Σ(weight_g * present_g)) / (Σ(weight_g))

Also store missing groups list for explainability.

Notes:

-  Integrity group can be “present” even if it only has “no flags” state. The goal is to know whether integrity checks were actually run. 

## 2. 4.2 Freshness Subscore (F)

**Goal:** Is the data recent enough to represent current reality?

For each signal group or platform p:

-  age_p = now - last_update_p in days 
-  Define freshness windows (internal policy):  fresh_days  stale_days  

Map age to score using a simple piecewise rule:

-  if age_p &lt;= fresh_days then f_p = 1.0 
-  if age_p &gt;= stale_days then f_p = 0.0 
-  else linearly interpolate between 1 and 0 

Then aggregate across platforms:

F = weighted_mean(f_p, weight_p)

Explainability stores:

-  “Data is X days old on Platform Y” 
-  “Some platforms are stale” 

Uncertainty Flag:

fresh_days / stale_days need to be set per platform because social platforms decay differently.

## 3. 4.3 Stability Subscore (S)

**Goal:** Is the signal stable, or is it too noisy / spike-driven?

For each major time-series signal t:

-  compute rolling volatility and trend consistency 

A minimal approach Gonzalo can implement quickly:

-  Let vol_t = normalized volatility over a defined window 
-  Let spike_t = spike indicator (viral distortion detection) 

Convert to a stability score:

S_t = clamp(1 - (α * vol_t + β * spike_t), 0, 1)

Aggregate:

S = weighted_mean(S_t, weight_t)

Explainability stores:

-  “High volatility over the last N weeks” 
-  “Spike-driven week detected, score smoothed” 
-  “Seasonal inconsistency flagged” (only if you already have that signal) 

Uncertainty Flag:

window sizes (e.g., 30/60/90 days) are not locked. Pick one consistent default for v1 and version it.

## 4. 4.4 Integrity Subscore (I)

**Goal:** Are there integrity concerns that reduce trust in the data?

Integrity is the “penalty” component.

Start with I = 1.0.

If anomalies are detected, apply penalty factors.

Example:

-  I = I * (1 - penalty_k) for each active integrity flag k 

Penalties should be:

-  deterministic 
-  versioned 
-  explainable 

Explainability stores:

-  Which flag triggered 
-  What adjustment was applied (descriptive, not numeric) 
-  Whether manual review is pending 

Hard rule:

Integrity flags also reduce confidence band even if FanScore is computed.

# 5. Overall Confidence Score

Internal score:

CONF = C^wC * F^wF * S^wS * I^wI

Why multiplicative?

-  If any core factor is weak (eg. missing data), confidence should drop sharply. 
-  It prevents “good freshness” from hiding “missing completeness”. 

Weights (wC, wF, wS, wI) are internal and versioned.

User never sees CONF numeric.

# 6. Confidence Bands

Map CONF to a band:

-  **High Confidence** 
-  **Moderate Confidence** 
-  **Limited Confidence** 

Band thresholds are internal policy and must be versioned.

Example mapping (placeholders):

-  High: CONF &gt;= T_high 
-  Moderate: T_low &lt;= CONF &lt; T_high 
-  Limited: CONF &lt; T_low 

Uncertainty Flag:

T_high and T_low not set yet. Needs calibration on real dataset distribution.

# 7. Suppression Rule

If confidence is below the minimum publication threshold:

-  FanScore is withheld 
-  UI displays: **Insufficient Data** 
-  Explain exactly why (missing groups, stale inputs, extreme volatility, integrity unresolved) 

Rule:

If C &lt; C_min OR F &lt; F_min OR CONF &lt; T_suppress then suppress.

This prevents showing a “number with vibes.”

# 8. Explanation Generator

Confidence must ship with reasons in plain English.

Generate reasons from the component diagnostics:

### 0.1. Reason Types

-  Missing coverage 
-  Stale data 
-  High volatility 
-  Integrity concerns 
-  Narrow platform footprint (optional if already a concept) 

### 0.2. Example Outputs

-  “Limited confidence because engagement data is missing on 2 key platforms.” 
-  “Moderate confidence because most signals are current, but the last 30 days show high volatility.” 
-  “Limited confidence due to unusual growth patterns detected and adjusted.” 

Hard rule:

Never imply intent (“fake followers”), only describe patterns (“unusual activity detected”).

# 9. Audit & Export Requirements

Every exported score must include:

-  Confidence band 
-  The top 2–4 reasons 
-  Model version and confidence-model version 
-  Timestamp 

Enterprise audit logs must store:

-  Component subscores (C, F, S, I) 
-  Final CONF numeric (internal) 
-  Band mapping thresholds version 
-  Reasons list 

# 10. Bias Safety Hooks

Confidence can unintentionally penalise:

-  emerging sports 
-  women’s sport 
-  niche properties with limited platform data 

So add two guardrails:

1.  **Coverage-aware explanation** If confidence is limited due to coverage scarcity, say so explicitly. 
2.  **Cohort monitoring** Track confidence band distribution by category/region to detect systemic disadvantage. 

Hard rule:

Do not “boost” confidence artificially. Be transparent instead.

# 11. Versioning

Confidence model must be versioned separately from FanScore:

-  FanScore v1.x 
-  ConfidenceModel v1.x 

Any threshold change is a version bump (at least minor).

