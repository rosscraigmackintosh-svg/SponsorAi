## 1. SponsorAI — Property Graph & Entity Resolution

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (identity integrity)

---

1. Purpose

Defines how SponsorAI:

- uniquely identifies properties 

- links cross-platform identities 

- prevents duplication 

- maintains entity truth over time 

Primary goal:

&gt; One real-world property = one canonical entity in SponsorAI.

---

2. Core Principles

The identity system must be:

- conservative in merges 

- reversible where possible 

- provenance-aware 

- platform-agnostic 

- audit-friendly 

Hard rule:

&gt; False merges are worse than temporary duplicates.

---

3. Canonical Property Model

Each property must have:

- canonical_property_id (stable, permanent) 

- property_type (athlete / team / event / series) 

- sport classification 

- tier classification (internal) 

- status flag (active / dormant / unknown) 

- created_at / updated_at timestamps 

---

4. Handle &amp; Account Mapping

Each property may map to multiple platform identities.

Supported mappings

- Instagram handle 

- X/Twitter handle 

- YouTube channel 

- TikTok account 

- Facebook page 

Each mapping must store:

- platform 

- handle 

- confidence level 

- verification source 

- last validated timestamp 

---

5. Identity Resolution Process

Step 1 — Candidate Discovery

Sources:

- manual curation 

- league feeds 

- web discovery 

- partner ingestion 

---

Step 2 — Matching Heuristics

System may use:

- exact handle match 

- name similarity 

- sport context 

- league association 

- verified links 

---

Step 3 — Confidence Scoring

Each mapping assigned:

- High confidence 

- Moderate confidence 

- Low confidence 

Low-confidence links must not auto-merge.

---

Step 4 — Human Review (when needed)

Trigger review when:

- multiple entities collide 

- confidence is ambiguous 

- high-value property detected 

- major follower discrepancies 

---

6. Duplicate Detection

System should monitor for:

- near-identical names 

- overlapping handles 

- suspicious follower splits 

- league roster conflicts 

When suspected:

- flag internally 

- avoid automatic merge 

- preserve both entities until resolved 

---

7. Historical Integrity

If a mapping changes:

System must:

- preserve historical linkage 

- timestamp the change 

- maintain replayability 

- avoid retroactive distortion 

---

8. Property Lifecycle States

Each entity may be:

- Active 

- Dormant 

- Retired 

- Unknown 

State influences:

- refresh cadence 

- confidence behaviour 

- UI surfacing 

---

9. Future Extensions

May include:

- official verification badges 

- property-claimed profiles 

- automated graph expansion 

- cross-sport identity stitching 

But must always preserve:

- auditability 

- reversibility 

- conservative merging 

---

End of Document

