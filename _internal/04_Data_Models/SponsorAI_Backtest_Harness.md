## 1. SponsorAI — Synthetic Backtest Harness

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (model validation)

---

1. Purpose

Defines the framework for replaying historical data to validate:

- FanScore stability 

- FitScore behaviour 

- weighting changes 

- drift sensitivity 

Primary goal:

&gt; Ensure model changes do not unintentionally distort the landscape.

This is a simulation tool — not a prediction engine.

---

2. Core Principles

The backtest harness must be:

- deterministic 

- reproducible 

- version-aware 

- non-optimising 

It exists to detect distortion, not maximise outcomes.

---

3. Replay Dataset

The harness should operate on:

- timestamped historical social pulls 

- archived property snapshots 

- versioned scoring inputs 

Minimum requirements:

- multi-period coverage (recommended ≥ 90 days) 

- cross-tier representation 

- cross-platform presence 

---

4. Test Scenarios

4.1 Weight Sensitivity Test

Purpose:

Evaluate impact of FanScore weight changes.

Procedure:

- replay baseline 

- apply candidate weights 

- compare percentile shifts 

Flag if:

- large tier reshuffling 

- extreme volatility 

- unintended mid-tier suppression 

---

4.2 Tier Boundary Test

Purpose:

Validate fairness across elite / mid / emerging.

Check:

- distribution spread 

- discovery surface diversity 

- emerging property visibility 

---

4.3 Stability Over Time

Purpose:

Ensure FanScore does not oscillate excessively.

Monitor:

- week-over-week variance 

- anomaly spikes 

- rank churn rate 

---

4.4 Confidence Interaction Test

Purpose:

Verify low-confidence properties behave appropriately.

Check:

- tone softening 

- ranking restraint 

- absence of artificial boosting 

---

5. Acceptance Threshold Philosophy

SponsorAI does not optimise for:

- maximum separation 

- maximum engagement 

- maximum churn 

Instead, it optimises for:

- stability 

- interpretability 

- trust preservation 

---

6. Change Approval Workflow

Before scoring changes ship:

Must pass:

- historical replay 

- percentile stability check 

- tier fairness review 

- anomaly sensitivity review 

Results must be logged.

---

7. Reporting Outputs

Backtest reports should include:

- distribution comparison 

- percentile movement 

- volatility metrics 

- flagged anomalies 

- confidence impacts 

Tone must remain analytical and neutral.

---

8. Guardrails

The harness must never be used to:

- optimise for engagement 

- maximise brand outcomes 

- engineer preferred winners 

Its role is **model safety**, not performance tuning.

---

9. Future Extensions

May include:

- sport-specific backtests 

- platform shock simulations 

- synthetic anomaly injection 

- confidence stress testing 

But must always remain:

- interpretable 

- audit-friendly 

- trust-first 

---

End of Document

