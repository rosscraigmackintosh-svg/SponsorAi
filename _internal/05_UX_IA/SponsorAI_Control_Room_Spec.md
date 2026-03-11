## 1. SponsorAI — Control Room Specification

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (internal operations)

---

1. Purpose

Defines the internal Control Room used to monitor:

- model health 

- coverage quality 

- ingestion status 

- confidence distribution 

Tone:

&gt; calm, operational, regulator-readable.

This is not a vanity dashboard.

---

2. Design Principles

The Control Room must feel:

- calm 

- minimal 

- factual 

- audit-friendly 

- non-gamified 

Avoid:

- flashy alerts 

- red panic states 

- leaderboard energy 

---

3. Primary Sections

3.1 Model Health

Shows:

- FanScore stability 

- FitScore distribution 

- drift indicators 

- anomaly rate 

Primary question:

&gt; “Is the model behaving normally?”

---

3.2 Coverage Health

Shows:

- platform coverage 

- stale data rate 

- sport coverage density 

- ingestion success rate 

Primary question:

&gt; “Are we seeing enough of the market?”

---

3.3 Confidence Distribution

Shows:

- % high confidence 

- % moderate 

- % limited 

- trend over time 

Primary question:

&gt; “How trustworthy is the current surface?”

---

3.4 Pipeline Status

Shows:

- ingestion jobs 

- failures 

- latency 

- platform outages 

Primary question:

&gt; “Is the data flowing cleanly?”

---

4. Alert Philosophy

Use tiered calm alerts:

- Informational 

- Watch 

- Investigate 

- Action Required 

Never use:

- alarmist language 

- blinking warnings 

- urgency theatre 

---

5. Degraded Mode Indicator

System should clearly show when operating in:

- Normal 

- Conservative 

- Degraded 

Behaviour must be explicit and auditable.

---

6. Audit &amp; Replay

Control Room must support:

- score replay 

- version inspection 

- ingestion trace 

- mapping review 

Purpose:

&gt; maintain institutional trust.

---

7. Future Extensions

May include:

- sport-level health 

- platform health map 

- anomaly explorer 

- human review queue 

But must remain:

- restrained 

- operational 

- trust-first 

---

End of Document

