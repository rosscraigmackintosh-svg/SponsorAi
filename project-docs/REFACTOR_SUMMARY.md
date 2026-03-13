# REFACTOR_SUMMARY.md

SponsorAI — Structural Refactor Record

Completed: 2026-03-13

---

## Overview

`app/explore.html` was a 3,699-line monolithic file containing all CSS, HTML, JavaScript, and live API credentials in a single document. This refactor split it into layered files without changing any application behaviour, logic, or output.

The entry file remains `app/explore.html`. No filenames were changed. No module system, bundler, or framework was introduced. All files use plain `var` declarations shared through global scope via sequential `<script>` tags.

---

## Before: Original Structure

Single file: `app/explore.html` — 3,699 lines, ~176 KB

Contents (all inline):
- Lines 11-2095: all CSS, including five-layer design token cascade and component styles
- Lines 2096-2684: full HTML structure (nav, chat panel, card grid, detail panel)
- Lines 2685-3699: one large inline `<script>` block containing:
  - Supabase URL and anon key
  - Anthropic API key
  - All data-fetching logic
  - Card rendering and HERO_ICONS
  - Masonry layout engine
  - Detail panel (populateDetail, all dp* helpers, selectCard)
  - All UI/menu/theme/grid state
  - Full AI chat engine (escHtml, addMsg, sendChat, buildSystemPrompt, etc.)
  - Init IIFEs and event listeners

---

## After: Final File Structure

```
app/
  explore.html          392 lines   Entry file. HTML structure + script tags + minimal inline script (see below).
  styles.css           2085 lines   All CSS verbatim from original lines 11-2095.
  config.js              11 lines   Live credentials only. Gitignored.
  data.js                84 lines   Supabase fetch, type config, data utilities, loadGrid().
  ui.js                 221 lines   Theme, menus, chat open/close, grid render, filter, masonry reflow.
  ai.js                 436 lines   Anthropic API chat engine, escHtml, CMD processing, system prompt.
  components/
    card.js              74 lines   HERO_ICONS, renderCard().
    layout.js           133 lines   activeLayout, layoutMasonry(), clearMasonryPositions(), setLayout().
    panel.js            304 lines   Detail panel: openDetail(), closeDetail(), populateDetail(), all dp* helpers, selectCard().
```

Total across split files: approximately 3,740 lines (net increase reflects added comment headers; no logic was added).

---

## Script Load Order in explore.html

```html
<script src="https://unpkg.com/lucide@latest"></script>   <!-- head: icon library -->

<!-- body, end -->
<script src="config.js"></script>
<script src="data.js"></script>
<script src="components/card.js"></script>
<script src="components/layout.js"></script>
<script src="components/panel.js"></script>
<script src="ui.js"></script>
<script src="ai.js"></script>
<script>
  <!-- inline block: see below -->
</script>
```

Load order is significant. Each file depends on globals declared in earlier files. `config.js` must be first so `API_URL`, `API_KEY`, and `ANTHROPIC_KEY` are in scope before any fetch or AI call.

---

## Where Keys Now Live

| Credential | File | Gitignored |
|---|---|---|
| Supabase REST base URL (`API_URL`) | `app/config.js` | Yes |
| Supabase anon key (`API_KEY`) | `app/config.js` | Yes |
| Anthropic API key (`ANTHROPIC_KEY`) | `app/config.js` | Yes |

`app/config.js` is listed in `.gitignore` alongside `app/explore.html`. Neither file is committed to the repository. Keys are still visible in browser DevTools to anyone with local file access — backend proxying remains the correct long-term resolution (see DEVELOPMENT_LEDGER.md issues 1 and 2).

---

## What Remains Inline in explore.html

The inline `<script>` block at the bottom of `app/explore.html` contains exactly five things:

**1. `initLayout` IIFE**
Reads `sai-layout` from localStorage and calls `setLayout()` (defined in `layout.js`). Runs at parse time — must execute after `layout.js` has loaded, which it does.

**2. `initTheme` IIFE**
Reads `sai-theme` from localStorage, detects system preference, calls `applyTheme()` (defined in `ui.js`). Runs at parse time.

**3. Outside-click listener** (`document.addEventListener('click', ...)`)
Closes nav menu and profile menu when the user clicks outside them. References `navMenuOpen`, `closeNavMenu`, `profileMenuOpen`, `closeProfileMenu` — all defined in `ui.js`.

**4. Escape-key listener** (`document.addEventListener('keydown', ...)`)
Closes all open panels on Escape. References `detailOpen`, `closeDetail` (`panel.js`) and `chatOpen`, `closeChat`, `navMenuOpen`, `closeNavMenu`, `profileMenuOpen`, `closeProfileMenu` (`ui.js`). This listener spans two layers.

**5. `init` IIFE**
Calls `loadGrid()`, `renderGrid()`, `openChat()`, wires up card button toggling, scroll fade behaviour, and masonry resize handler.

---

## Why Those Blocks Were Left Inline

**Init IIFEs (`initLayout`, `initTheme`):** These read from the DOM and localStorage at parse time. They are correct exactly where they are: after all external scripts have loaded and before the page becomes interactive. Moving them to a file would not reduce coupling and would make the boot sequence harder to read at a glance.

**Outside-click listener:** References only `ui.js` globals and could in principle move to `ui.js`. Left inline per explicit instruction to defer that decision.

**Escape-key listener:** References globals from both `panel.js` and `ui.js` — a cross-layer dependency. Moving it into either file would introduce an implicit coupling to the other layer. Left inline in the neutral entry file where both layers are already in scope. This is the correct long-term placement absent a shared event-bus.

**`init` IIFE:** Orchestrates the boot sequence: data fetch, grid render, chat open, and DOM wiring. It references globals from `data.js`, `ui.js`, `layout.js`, and `panel.js`. This is appropriate as entry-point coordination logic and belongs in the entry file, not in any single layer.

---

## Remaining Risks and Follow-up Recommendations

**1. Keys still in browser JS**
`config.js` resolves the git exposure risk but not the DevTools visibility risk. The Anthropic key in particular should be proxied through a backend function (Supabase Edge Function is the lowest-effort path given existing infrastructure) before the prototype is shared with anyone outside the immediate team.

**2. Supabase RLS not active**
The anon key grants unrestricted database read access. Row-Level Security should be enabled on all tables before wider sharing regardless of key management improvements.

**3. Detail panel action buttons are stubs**
`dpAction()` in `panel.js` currently only logs to the console. The watchlist, compare, and portfolio buttons appear functional but do nothing. This is a UX trust risk — users clicking them receive no feedback.

**4. Escape-key listener is a cross-layer listener**
Currently left inline in `explore.html`. If a future refactor introduces a module system or moves to a component model, this listener and the outside-click listener are the logical first candidates to revisit. In the current vanilla-global architecture, their inline placement is intentional and correct.

**5. Sparklines fetched but never rendered**
`c.sparks` is populated for all cards on load. The rendering step was deferred. This is low-effort to complete and high-value for communicating trend shape.

**6. `escHtml` defined in `ai.js`, used in `panel.js`**
`panel.js` loads before `ai.js` but calls `escHtml()` only at user-interaction time (never at parse time), so the forward reference is safe in the current vanilla-global model. This dependency direction (panel depending on ai) is worth resolving if the files are ever used outside this load order — `escHtml` could move to `data.js` or a `utils.js` as a clean utility with no dependencies.
