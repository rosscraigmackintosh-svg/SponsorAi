## 1. SponsorAI — Property Coverage & Data Ingestion Specification

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (data integrity)

---

1. Purpose

Defines how SponsorAI:

- discovers properties 

- ingests data 

- maintains coverage quality 

- handles gaps and uncertainty 

Primary goal:

&gt; Deliver honest, reproducible market visibility without overstating coverage.

---

2. System Principles (Non-Negotiable)

SponsorAI data ingestion must be:

- transparent in scope 

- conservative in claims 

- resilient to partial coverage 

- respectful of platform limits 

- version-aware and replayable 

The system must always prefer:

&gt; incomplete but honest 

over 

&gt; complete but unreliable

---

3. Property Universe Definition

3.1 Supported Property Types (v1)

- Athletes 

- Teams 

- Events 

- Series / Championships 

Each property must have:

- stable canonical ID 

- sport classification 

- property type flag 

- source provenance record 

---

3.2 Initial Market Focus

Priority vertical:

- Motorsport (mid-tier emphasis)

Rationale:

- dense sponsorship activity 

- fragmented visibility 

- strong early wedge 

Expansion to other sports is permitted but must be explicitly logged.

---

4. Data Source Categories

4.1 Primary Signals (v1 strength)

Social platforms:

- Instagram 

- X / Twitter 

- YouTube 

- TikTok 

- Facebook (where reliable)

Purpose:

&gt; measure digital attention layer (FanScore inputs)

---

4.2 Secondary Signals (future expansion)

May include:

- broadcast exposure 

- attendance data 

- media coverage 

- sponsorship rosters 

These are **not required for v1 FanScore validity**.

---

5. Ingestion Pipeline (High-Level)

Step 1 — Property Discovery

Sources may include:

- manual curation 

- league lists 

- public directories 

- partner feeds 

Each property must pass identity validation.

---

Step 2 — Identity Resolution

System must:

- match official handles 

- deduplicate entities 

- confirm platform ownership where possible 

- maintain alias mapping 

Hard rule:

&gt; No merged identities without high confidence.

---

Step 3 — Signal Collection

For each platform:

- pull follower counts 

- collect engagement metrics 

- capture posting cadence 

- timestamp all pulls 

All raw pulls must be time-versioned.

---

Step 4 — Normalisation

Signals must be normalised by:

- platform 

- sport 

- tier 

- property type 

Purpose:

&gt; preserve cross-ecosystem comparability.

---

Step 5 — Quality Checks

Before scoring, system should run:

- anomaly detection 

- minimum activity thresholds 

- stale account detection 

- bot suspicion heuristics (lightweight)

Failures should reduce confidence, not silently discard.

---

Step 6 — Score Calculation

FanScore and FitScore computed using:

- current spec weights 

- tier-aware model 

- confidence framework 

Scores must be reproducible from stored inputs.

---

6. Coverage Transparency Rules

SponsorAI must never imply full market coverage.

System should internally track:

- platform coverage completeness 

- known missing channels 

- sport-level coverage density 

Where relevant, language should reflect:

&gt; “based on available data”

---

7. Update Cadence

7.1 Recommended Refresh Windows

- High-activity properties: frequent refresh 

- Mid-tier: periodic refresh 

- Low-activity: opportunistic refresh 

Exact cadence is implementation-defined but must be:

- documented 

- monitorable 

- versioned 

---

7.2 Staleness Handling

If data age exceeds threshold:

System should:

- reduce freshness confidence 

- soften language 

- optionally flag stale state internally 

---

8. Missing Data Behaviour

When platform data is missing:

System must:

- avoid zero-imputation where misleading 

- reduce confidence appropriately 

- maintain FanScore stability where possible 

Hard rule:

&gt; absence of data ≠ absence of audience.

---

9. Anomaly Handling

System should detect:

- sudden follower spikes 

- abnormal engagement bursts 

- long dormancy periods 

- suspicious ratio patterns 

When anomalies detected:

- reduce stability confidence 

- avoid overreacting in FanScore 

- never label publicly as fraudulent in v1 

Tone must remain neutral.

---

10. Data Versioning &amp; Replayability

Each score must be reproducible from:

- timestamped raw pulls 

- versioned weighting model 

- recorded normalisation logic 

Purpose:

&gt; maintain analytical auditability.

---

11. Known Limitations (v1 Reality)

Current constraints:

- social-first visibility 

- uneven platform usage by sport 

- limited broadcast integration 

- potential lag in growth signals 

System behaviour must remain honest about these limits.

---

12. Future Expansion Guardrails

When adding new data sources:

Must pass:

- trust impact review 

- coverage consistency check 

- cross-signal contamination check 

- reproducibility test 

New signals must not silently change historical interpretation.

---

13. Observability Requirements

Platform should internally monitor:

- ingestion success rates 

- coverage gaps 

- stale data rates 

- anomaly frequency 

- platform reliability 

Purpose:

&gt; maintain system health over time.

---

End of Document

