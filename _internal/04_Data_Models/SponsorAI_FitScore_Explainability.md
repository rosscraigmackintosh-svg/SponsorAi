## 1. SponsorAI — FitScore Explainability Layer

Version: v1.0 

Last updated: 2026-02-23 

Authority: High

---

1. Purpose

Defines how FitScore must be explained to users in a transparent, non-prescriptive manner.

Goal:

&gt; Make alignment understandable without implying recommendation.

---

2. Core Principle

FitScore must always answer:

&gt; "Why might this be contextually aligned?"

NOT:

&gt; "You should sponsor this."

---

3. Explainability Components

Each FitScore should be internally decomposable into:

- Geographic alignment signal 

- Category alignment signal 

- Budget compatibility signal 

UI may surface these as:

- alignment tags 

- match indicators 

- contextual notes 

---

4. Required User-Facing Language Pattern

Preferred framing:

- “Strong geographic overlap”

- “Category alignment present”

- “Within stated budget range”

- “Contextually aligned”

Avoid:

- “Best fit”

- “Recommended”

- “High-performing sponsorship”

- “You should consider”

---

5. Partial Alignment Handling

When signals conflict:

System should surface nuance.

Example patterns:

- “Strong geographic overlap, limited category alignment”

- “Budget compatible but audience context differs”

Purpose:

&gt; preserve analytical honesty.

---

6. UI Behaviour Rules

FitScore may:

- reorder filtered results 

- highlight alignment dimensions 

- support comparison views 

FitScore must NOT:

- dominate Explore ordering 

- override FanScore visibility layer 

- create a single “top match” outcome 

---

7. Confidence Interaction

Where alignment data is incomplete:

System should soften language:

- “Indicative geographic overlap”

- “Limited category data available”

---

8. Future Extension Guardrail

If machine learning is introduced:

- explanations must remain human-readable 

- black-box alignment is prohibited 

- feature importance must remain inspectable 

---

End of Document

