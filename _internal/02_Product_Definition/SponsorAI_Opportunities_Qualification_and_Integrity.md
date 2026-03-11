## 1. SponsorAI — Opportunities Qualification & Integrity

Version: v1.0 

Last updated: 2026-02-23 

Authority: High (marketplace boundary protection)

---

1. Purpose

Defines the rules governing how sponsorship Opportunities are:

- created 

- qualified 

- surfaced 

- maintained 

- retired 

Primary goal:

&gt; Surface credible sponsorship openings without turning SponsorAI into a marketplace or lead-generation engine.

This document is a structural safeguard for neutrality and trust.

---

2. Core Principles (Non-Negotiable)

Opportunities must remain:

- factual 

- structured 

- time-bounded 

- neutral in tone 

- non-optimised 

Opportunities must NOT become:

- recommendations 

- ranked “best deals” 

- lead funnels 

- pay-to-play inventory 

- brokerage mechanisms 

Hard rule:

&gt; Opportunities expose availability — they do not prescribe action.

---

3. Definition of a Valid Opportunity

A valid Opportunity represents:

&gt; A declared sponsorship opening from a property with sufficient minimum information to support structured evaluation.

It must reflect a **real commercial availability**, not a speculative placeholder.

---

4. Minimum Qualification Requirements

An Opportunity must include, at minimum:

Required Fields

- property_id (linked to canonical entity) 

- opportunity_title 

- opportunity_type (e.g., title sponsor, partner, etc.) 

- minimum_investment (or declared range) 

- geography scope 

- category openness (if restricted) 

- status (open / limited / closed) 

- last_updated timestamp 

If any required field is missing → the Opportunity must not be published.

---

5. Opportunity Freshness Rules

Each Opportunity must carry a freshness signal.

Recommended lifecycle

- Active — recently confirmed 

- Aging — no recent confirmation 

- Stale — beyond freshness threshold 

- Closed — no longer available 

System behaviour:

- stale opportunities must be visually softened 

- closed opportunities must be removed from active discovery 

- aging opportunities may remain visible but flagged internally 

Hard rule:

&gt; Silent staleness is not permitted.

---

6. Verification Tiers (Forward-Compatible)

Opportunities may carry internal verification states:

- Verified — confirmed by property or trusted source 

- Declared — property-submitted but unverified 

- Inferred (future use only, not v1 default) 

UI exposure of tiers is optional but internal tracking is required.

---

7. Duplicate &amp; Conflict Handling

System must monitor for:

- duplicate opportunities from same property 

- conflicting minimum investments 

- overlapping inventory claims 

When detected:

- flag internally 

- avoid automatic merge 

- prefer most recently verified record 

- maintain audit trail 

---

8. Neutral Presentation Rules

Opportunities must be displayed in a way that preserves SponsorAI’s intelligence stance.

Must avoid

- “Best opportunity” language 

- urgency manipulation 

- conversion pressure 

- deal countdown theatrics 

- performance implication 

Preferred framing

- “Sponsorship opening” 

- “Minimum investment from…” 

- “Currently available” 

- “Based on property disclosure” 

---

9. Ordering Behaviour

Opportunities may be:

- filtered by budget 

- filtered by FitScore 

- filtered by geography 

- filtered by category 

But must NOT be globally ranked by:

- commercial attractiveness 

- expected return 

- SponsorAI endorsement 

FitScore may influence contextual ordering within filtered views only.

---

10. Property Eligibility Rules

Not all properties should automatically publish Opportunities.

Eligibility checks may include:

- valid canonical identity 

- minimum data completeness 

- active status 

- no known duplication conflicts 

This prevents low-quality inventory flooding.

---

11. Abuse &amp; Spam Safeguards

System should monitor for:

- unrealistic minimums 

- excessive opportunity volume 

- repetitive inventory spam 

- suspicious edits 

When detected:

- reduce visibility 

- flag for review 

- preserve neutrality in tone 

Public accusation is not permitted in v1.

---

12. Expiry &amp; Retirement

Opportunities must not persist indefinitely.

Recommended behaviour:

- require periodic confirmation 

- auto-age when not refreshed 

- retire when explicitly closed 

- archive with timestamp 

Purpose:

&gt; Maintain market credibility over time.

---

13. Separation from Commercial Model

Hard structural rule:

- paying customers must not gain ranking advantage 

- paid tiers must not boost opportunity visibility 

- commercial relationships must not influence ordering 

If monetisation touches Opportunities, it must pass the Constitution test.

---

14. Auditability

Each Opportunity record must retain:

- source 

- creation timestamp 

- last verification timestamp 

- change history 

Purpose:

&gt; Preserve institutional trust and traceability.

---

15. Future Extensions (Guarded)

Possible future enhancements:

- structured inventory taxonomy 

- property-side editing 

- confidence overlays 

- demand signalling 

But any extension must pass:

- neutrality check 

- marketplace boundary check 

- trust impact review 

---

End of Document

