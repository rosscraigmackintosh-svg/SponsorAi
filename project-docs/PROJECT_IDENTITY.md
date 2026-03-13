# PROJECT_IDENTITY.md

SponsorAI — Engineering Orientation

Last updated: 2026-03-12

---

## Repository

- Name: SponsorAi
- GitHub remote: https://github.com/rosscraigmackintosh-svg/SponsorAi.git
- Default branch: main
- Owner: Ross Mackintosh (rosscraigmackintosh@gmail.com)

---

## What SponsorAI Is

A decision-support platform for sponsorship evaluation. It surfaces structured intelligence about sports properties — FanScore (digital attention) and FitScore (strategic alignment) — to help sponsors make more informed decisions.

It is not a marketplace. It does not rank winners. It does not predict outcomes.

For product-level detail, see: `_internal/00_Core_Truth/SponsorAI_Bible_Lean.md`

---

## Development Stage

Current phase: proof of concept and model validation.

- Core philosophy: stable
- Data model: evolving
- UX patterns: stabilising
- FitScore: not yet rendered
- Authentication: not yet implemented

See `PRODUCT_STATUS.md` at the repository root for the live status indicator.

---

## Architecture at a Glance

SponsorAI is currently a vanilla HTML/CSS/JavaScript prototype. There is no framework, no build step, no bundler, and no module system.

The frontend communicates directly with a Supabase REST API. An AI chat layer makes direct browser-side calls to the Anthropic API.

For the full five-layer architecture (Source Data, Ingestion, Scoring Engine, Experience Surfaces, Governance), see:
`_internal/00_Core_Truth/SponsorAI_System_Architecture_Map.md`

---

## Repository Structure

```
/app              Frontend application HTML pages (prototype)
/website          Marketing and investor-facing static site (Vercel)
/database         SQL schema, test plan, TypeScript data layer
/_internal        Full product documentation corpus
/project-docs     Engineering-facing operational documentation (this folder)
CLAUDE.md         AI instruction file — mandatory read before any UI work
PRODUCT_STATUS.md Current phase and strategic focus
```

---

## Deployment

- Website (`/website`): deployed on Vercel. `vercel.json` lives inside the website folder and governs cache headers for HTML, CSS, and JS assets.
- App (`/app`): not deployed. Local prototype only.
- `/project-docs`: not deployed or served. Documentation only.

---

## Key External Dependencies

- Supabase: database and REST API
- Anthropic API: in-prototype AI chat (claude-haiku-4-5-20251001)
- Google Fonts: Inter and DM Mono
- Lucide icons: loaded via unpkg CDN

---

## AI Instruction File

`CLAUDE.md` at the repository root is the authoritative AI instruction file. It must be read before any UI generation work. It defines the Design System load order, enforcement rules, and conflict resolution hierarchy.
