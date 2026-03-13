# SYSTEM_REFERENCE.md

SponsorAI — Repository Map

Last updated: 2026-03-12

---

## Purpose

A quick-reference map of where things live in the repository. For architecture depth, see the authoritative source:
`_internal/00_Core_Truth/SponsorAI_System_Architecture_Map.md`

---

## Repository Root

```
SponsorAi/
  /app              Frontend prototype pages
  /website          Marketing and investor-facing site
  /database         Database schema and data layer
  /_internal        Full product documentation corpus
  /project-docs     Engineering documentation (this folder)
  CLAUDE.md         AI instruction file — must be read before any UI work
  PRODUCT_STATUS.md Current phase and strategic focus
  pencil-prompt.md          Design direction prompt v1 for Explore screen
  pencil-prompt-v2.md       Design direction prompt v2 for Explore screen
```

---

## /app — Frontend Prototype

All files are vanilla HTML with inline CSS and JS. No framework. No build step.

| File | Lines | Status |
|---|---|---|
| `index.html` | 132 | Nav hub — links to all views |
| `explore.html` | 3,699 | **GITIGNORED** — active working prototype, local only |
| `property.html` | 400 | Stub |
| `opportunities.html` | 248 | Stub |
| `compare.html` | 216 | Stub |
| `portfolio.html` | 234 | Stub |
| `watchlist.html` | 185 | Stub |

Note: `explore.html` is explicitly excluded from source control via `.gitignore`. It contains hardcoded API keys. It exists only on the local machine.

---

## /website — Marketing Site

Deployed on Vercel. Static HTML/CSS/JS with no framework.

| File | Purpose |
|---|---|
| `index.html` | Public landing page |
| `hub.html` | Product hub page |
| `investor-login.html` | Investor portal login |
| `investor-portal.html` | Investor portal content |
| `investor-auth.js` | Client-side auth (known security issue — see Code Review) |
| `investor-login.css` | Investor portal styles |
| `investor-portal.css` | Investor portal styles |
| `style.css` | Main website styles (741 lines) |
| `script.js` | Website JS (email capture stub — currently non-functional) |
| `email-welcome.html` | Welcome email template |
| `vercel.json` | Vercel cache-control headers |
| `images/` | Site imagery and logos |

---

## /database — Data Layer

| File | Lines | Purpose |
|---|---|---|
| `001_master_schema.sql` | 979 | Base SQL schema — not current with live database (see Code Review) |
| `test_plan.sql` | 443 | Test suite — documents live database state and gaps |
| `ui_data_layer.ts` | 408 | Typed TypeScript data access layer — intended production pattern |

The live Supabase database has three additional migrations (006, 007, 008) applied that are not reflected in the master schema file.

---

## /_internal — Product Documentation Corpus

The authoritative product knowledge base. Governed by:
`_internal/00_Core_Truth/SponsorAI_Documentation_Governance_and_Query_Guide.md`

| Subfolder | Contents |
|---|---|
| `00_Core_Truth/` | Constitution, Bible, Canonical Glossary, System Architecture Map, Documentation Governance, Ethical Posture, Onboarding Guide |
| `01_Working_Memory/` | Master working memory + index for AI orientation |
| `02_Product_Definition/` | ~20 files: commercial model, competitive positioning, constitution amendments, coverage strategy, enterprise annex, investor materials, methodology, model governance, neutrality engine, opportunities spec, personalisation policy, property portal governance, refusal playbook, scoring spec |
| `03_Design_System/` | Tokens (core, semantic, component, theme, charts), component specs, layout rules, accessibility, copy and tone, generation rules for Claude, responsive grid |
| `04_Data_Models/` | FanScore spec, FitScore spec, Confidence spec and policy, scoring spec, taxonomy, data ingestion, model health and drift, property graph, backtest harness, data readiness checklist |
| `05_UX_IA/` | Control Room spec, Explore ranking philosophy, visual system diagram |
| `06_Experiments/` | Code review (March 2026) |
| `99_Archive/` | Reserved archive folder (empty) |
| `prototype-archive/` | Versioned Explore HTML snapshots, legacy prototype files, HANDOVER.md |

---

## /project-docs — Engineering Documentation

This folder. Engineering-facing operational layer. Does not replace or duplicate `_internal`.

| File | Purpose |
|---|---|
| `PROJECT_IDENTITY.md` | Repository orientation for engineers |
| `PRODUCT_GUARDRAILS.md` | Constitutional rules relevant to development decisions |
| `AI_ENGINEERING_PLAYBOOK.md` | How to safely work in the codebase (the main technical guide) |
| `SYSTEM_REFERENCE.md` | This file — repository map |
| `DEVELOPMENT_LEDGER.md` | Current build state, known issues, next tasks |
| `BOOT_PROJECT.md` | Orientation entry point for AI agents |

---

## Key Cross-References

| Need | Go to |
|---|---|
| Platform architecture | `_internal/00_Core_Truth/SponsorAI_System_Architecture_Map.md` |
| Constitution and core rules | `_internal/00_Core_Truth/SponsorAI_Constitution.md` |
| Term definitions | `_internal/00_Core_Truth/SponsorAI_Canonical_Glossary.md` |
| Design tokens | `_internal/03_Design_System/Tokens/` |
| FanScore spec | `_internal/04_Data_Models/FanScore_Model_Spec.md` |
| FitScore spec | `_internal/04_Data_Models/FitScore_Model_Spec.md` |
| Prototype internals | `_internal/prototype-archive/HANDOVER.md` |
| Known code issues | `_internal/06_Experiments/SponsorAI_Code_Review.md` |
| AI UI generation rules | `CLAUDE.md` |
| Engineering safe patterns | `project-docs/AI_ENGINEERING_PLAYBOOK.md` |
