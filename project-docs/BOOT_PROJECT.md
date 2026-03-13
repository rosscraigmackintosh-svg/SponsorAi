# BOOT_PROJECT.md

SponsorAI — AI Agent Orientation

Last updated: 2026-03-12

---

## Authority Notice

**CLAUDE.md is the authoritative AI instruction file.**

`BOOT_PROJECT.md` is a supplementary orientation document. It provides situational context. It does not override or supersede `CLAUDE.md`.

If there is any conflict between this file and `CLAUDE.md`, follow `CLAUDE.md`.

---

## What This Repository Contains

SponsorAI is a decision-support platform for sponsorship evaluation. The repository contains a working frontend prototype, a marketing website, a database schema, and a large product documentation corpus.

The platform is governed by strict neutrality and trust-first principles. Before making any change, understand the rules.

---

## Step 1 — Read the Instruction File First

Before any UI work, read `CLAUDE.md` at the repository root.

It defines:
- Mandatory Design System load order (11 files must be read before any UI generation)
- Enforcement rules for tokens, scoring separation, and accessibility
- Conflict resolution hierarchy

This is not optional.

---

## Step 2 — Understand the Gitignored Prototype

The main working application is `app/explore.html`.

**This file is gitignored.** It does not exist in the repository. It lives only on the local machine.

If you cannot read `app/explore.html`, stop. Do not attempt to reconstruct it from memory or prior context. Ask for the file to be confirmed present.

All other `/app` pages (compare, portfolio, watchlist, property, opportunities) are stub HTML files with no live functionality.

---

## Step 3 — Know Where Things Live

For a full repository map, see: `project-docs/SYSTEM_REFERENCE.md`

Quick orientation:

```
/app              Frontend prototype pages (explore.html is the active one)
/website          Marketing and investor site — deployed on Vercel
/database         Supabase schema, test plan, TypeScript data layer
/_internal        All product documentation — authoritative knowledge base
/project-docs     Engineering documentation — this folder
CLAUDE.md         AI instruction file — START HERE for UI work
PRODUCT_STATUS.md Current phase
```

---

## Step 4 — Know the Documentation Hierarchy

`_internal` is the authoritative product knowledge base. It contains the Constitution, design system, data model specs, architecture map, scoring specifications, and governance documents.

Do not duplicate or rewrite content from `_internal`. If a question has an answer in `_internal`, point to that file rather than restating it.

The document authority hierarchy (highest to lowest):
1. `_internal/00_Core_Truth/SponsorAI_Constitution.md`
2. `_internal/00_Core_Truth/SponsorAI_Ethical_and_Regulatory_Posture.md`
3. `_internal/02_Product_Definition/SponsorAI_Commercial_Model_Guardrails.md`
4. Core data and scoring specs (`_internal/04_Data_Models/`)
5. Design system (`_internal/03_Design_System/`)
6. Working memory (`_internal/01_Working_Memory/`)

Governance source: `_internal/00_Core_Truth/SponsorAI_Documentation_Governance_and_Query_Guide.md`

---

## Step 5 — Know the Key Constraints

For the full engineering constraint summary, see: `project-docs/PRODUCT_GUARDRAILS.md`
For safe coding patterns, see: `project-docs/AI_ENGINEERING_PLAYBOOK.md`
For the current build state, see: `project-docs/DEVELOPMENT_LEDGER.md`

Core rules that must never be violated:

- FanScore and FitScore must remain visually and computationally separate
- No composite or merged scores
- No pay-to-rank, no leaderboard patterns, no rank numbers
- No hardcoded hex values — use design tokens only
- Suppressed cards must render `--` not the actual score
- AI language must remain calm, analytical, confidence-aware

---

## Step 6 — Check the Current State Before Acting

The codebase is a proof-of-concept prototype with known issues. Before making changes:

1. Check `project-docs/DEVELOPMENT_LEDGER.md` for the current build state and known issues
2. Confirm `app/explore.html` is present if your task involves the prototype
3. Confirm whether the task touches a gitignored file, a stub file, or the marketing site — these are different codebases with different constraints

---

## Quick Reference

| Task | Start here |
|---|---|
| Any UI generation | Read `CLAUDE.md` first, then the Design System files |
| Understanding the prototype | `_internal/prototype-archive/HANDOVER.md` |
| Known issues | `_internal/06_Experiments/SponsorAI_Code_Review.md` |
| Platform rules | `_internal/00_Core_Truth/SponsorAI_Constitution.md` |
| Term definitions | `_internal/00_Core_Truth/SponsorAI_Canonical_Glossary.md` |
| Architecture overview | `_internal/00_Core_Truth/SponsorAI_System_Architecture_Map.md` |
| Current build state | `project-docs/DEVELOPMENT_LEDGER.md` |
| Repository map | `project-docs/SYSTEM_REFERENCE.md` |
| Safe extension patterns | `project-docs/AI_ENGINEERING_PLAYBOOK.md` |
