# SponsorAI Code Review
**Date:** 2026-03-10
**Scope:** All code assets — `/07_Prototype/html/`, `/Website/`, `/database/`

---

## Summary

The codebase is well-structured for a prototype at this stage. The scoring model logic is solid, the TypeScript data layer is clean, and the design system is consistently applied. The SQL schema is well-thought-out with good indexing and sensible use of views. The main concerns fall into three buckets: critical security issues that need fixing before any wider sharing, a handful of correctness gaps, and structural maintainability improvements that will matter as the codebase scales.

---

## CRITICAL — Security

These need to be addressed before sharing the prototype more broadly.

### 1. Anthropic API key hardcoded in browser JavaScript
**File:** `07_Prototype/html/sponsorai-explore.html`, line 3226

```javascript
var ANTHROPIC_KEY = 'sk-ant-api03-BPpn2ixHIp-KKdo6oE9UsDz_ag...';
```

This is visible to anyone who opens browser DevTools or Views Source. The key can be extracted and used to run API calls against your Anthropic account at full cost. This key should be rotated immediately if it has been shared with anyone. For the prototype, either proxy the API call through a simple backend function (Supabase Edge Function would work well here) or use environment variables injected at build time.

The file also sets `anthropic-dangerous-direct-browser-access: true`, which Anthropic's own docs describe as only for internal development. This header explicitly flags the request as bypassing their standard security controls.

### 2. Hardcoded Supabase anon key with no RLS
**File:** `07_Prototype/html/sponsorai-explore.html`, lines 2650–2651

```javascript
var API_URL = 'https://kyjpxxyaebxvpprugmof.supabase.co/rest/v1';
var API_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

The anon key is in plain JavaScript. More importantly, `test_plan.sql` explicitly notes: *"These tables were created without row-level security. The anon key has read access to all public tables/views."* Anyone with the key (or who can read the source) can query the entire database directly. Before moving to production or sharing the live prototype with anyone outside your immediate circle, enable RLS on all tables and define appropriate policies.

### 3. Investor portal credentials hardcoded in JavaScript
**File:** `Website/investor-auth.js`, lines 10–11

```javascript
const VALID_USERNAME = 'investor';
const VALID_PASSWORD = 'SponsorAI2026';
```

These are visible in the script file, which is publicly served. The "authentication" is trivially bypassed by anyone who reads the source — or by opening DevTools and typing `localStorage.setItem('sponsorai_investor', '1')`. The file even has a comment noting *"Demo credentials — replace before sharing widely"*, so this is a known risk, but worth flagging clearly. For the investor portal to be meaningful as a gate, it needs a real authentication layer (even a Supabase Auth magic link would be a significant improvement for minimal effort).

---

## HIGH — Correctness

### 4. Scoring model weights ignored at compute time
**File:** `database/001_master_schema.sql`, Section 4b

The `fanscore_models` table has a `weights_json` column and the model is registered with explicit weights:

```json
{"norm_weight": 0.65, "growth_weight": 0.15, "consistency_weight": 0.20}
```

But `compute_fanscore_daily` hardcodes these same values inline in the SQL:

```sql
100.0 * (0.65 * s.norm_val + 0.15 * s.growth_val + 0.20 * s.consistency_val)
```

The function never reads from `weights_json`. This means changing the weights in the model registry has no effect on computed scores — a potentially silent and confusing divergence. The weights should either be read from the table at runtime, or the discrepancy should be documented clearly.

### 5. `v_property_summary_current` column names diverge from master schema
**File:** `database/001_master_schema.sql` vs `database/ui_data_layer.ts`

The view definition in the master schema (lines 575–614) uses column names like `avg_30d`, `trend_30d`, `volatility_30d`. But `ui_data_layer.ts` queries for `avg_score_30d`, `trend_value_30d`, `volatility_value_30d` — which match the test plan's expected column names. The test plan references migration 006 as having fixed this. The master schema script is therefore out of sync with the actual live database state. The master schema should reflect reality, or the migrations should be consolidated into it.

### 6. `compute_fanscore_windows` does not set `suppression_reason`
**File:** `database/001_master_schema.sql`, Section 4c (lines 492–543)

The function computes window stats but never writes to a `suppression_reason` column. The test plan notes this was added in migration 008. The master schema script will produce a broken database if run from scratch — it's missing the suppression logic that the test plan validates.

### 7. MODEL_VERSION hardcoded in TypeScript, bypassing the active model system
**File:** `database/ui_data_layer.ts`, line 27

```typescript
const MODEL_VERSION = 'v1.0'
```

The database has a full model versioning system (`fanscore_models.is_active`, `v_active_model` view). But the TypeScript layer ignores this entirely and always queries for `v1.0`. When a new model version is promoted to active, the UI will still show v1.0 data until someone manually updates this constant and redeployes. The TypeScript layer should query `v_active_model` to pick up the current active version dynamically.

### 8. Typo in interface definition: `isSupressed` (one 'p')
**File:** `database/ui_data_layer.ts`, lines 165 and 254

Both `LatestDailyScore` and `ScorePoint` define `isSupressed: boolean` — missing the second 'p'. This propagates through the entire data layer. Not a functional bug in isolation, but will cause friction when integrating with any future code that spells it correctly.

### 9. Email signup form captures nothing
**File:** `Website/script.js`, line 69

The signup form calls `simulateSuccess(email)` and logs `'[SponsorAI] Signup captured:'` to the console. No data is sent anywhere — every email signup is silently discarded. The comment even says `// TODO: Connect to your email capture backend here`. If you're currently pointing investors at this form, you are losing every lead. This is the most immediately business-impactful fix in this review.

---

## MEDIUM — Performance

### 10. Correlated subqueries in `compute_fanscore_daily`
**File:** `database/001_master_schema.sql`, lines 374–388

The `with_windows` CTE uses three correlated subqueries per row (max_ep_90d, avg_ep_30d, stddev_ep_30d). For the current synthetic dataset of ~120 properties over ~180 days this is fine. With thousands of real properties over multi-year history, this will get slow. Window functions (`MAX(...) OVER (...)`, `AVG(...) OVER (...)`) would be more performant for production-scale data.

### 11. Sequential fetches in `loadGrid()` with large URL parameter
**File:** `07_Prototype/html/sponsorai-explore.html`, lines 2700–2730

The grid loads by first fetching up to 200 property rows, then building a comma-separated ID list and making a second fetch with all IDs in the URL string:

```javascript
'&property_id=in.(' + idList + ')'
```

With 200 UUIDs (each 36 chars), this URL is ~7,500 characters. Most browsers and servers handle this, but it is fragile and will fail silently if the list grows. The two fetches are also sequential — the sparkline load waits for the property load to complete. Consider a single database view that joins sparklines, or use `Promise.all` to run them in parallel once the ID set is known from a local cache.

### 12. Missing index for `suppression_reason IS NOT NULL` filter
**File:** `database/test_plan.sql`, noted in GAPS section

Already acknowledged in the test plan, but worth confirming: if the UI ever adds a "show suppressed only" global query without filtering by `property_id`, it will seq-scan the entire `fanscore_daily` table. The note says this is acceptable for demo. Fine for now, but worth adding before any production query uses this pattern.

---

## LOW — Maintainability

### 13. `sponsorai-explore.html` is a 3,699-line monolithic file
The entire application — HTML structure, ~2,600 lines of CSS, and ~1,100 lines of JavaScript — lives in a single file. This is understandable for a fast-moving prototype, but it makes diffs hard to read, search difficult, and collaboration error-prone. As the prototype matures, splitting into separate CSS and JS files would pay dividends quickly.

### 14. CSS variable forward references in `:root`
**File:** `07_Prototype/html/sponsorai-explore.html`, lines 24–28

Some variables reference others defined further down in the same `:root` block:
```css
--text-1: var(--color-gray-700);  /* defined 73 lines later */
--accent: var(--color-purple-600);  /* defined ~180 lines later */
```

CSS custom property resolution is lazy so this works in all modern browsers, but it is easy to miss when editing. Grouping primitives before semantic tokens would make the token hierarchy clearer and reduce the risk of accidental circular references.

### 15. Inline `onclick` handlers in dynamically built HTML strings
**File:** `07_Prototype/html/sponsorai-explore.html`, multiple locations (e.g., lines 3006–3008, 3113, 3143)

Actions like `onclick="dpAction('watch','id')"` and `onclick="selectCard('id')"` are injected into HTML strings assembled with string concatenation. Event delegation on the panel container would be cleaner, more testable, and avoids the need to ensure function names remain globally scoped.

### 16. `escHtml` defined after it is first used
**File:** `07_Prototype/html/sponsorai-explore.html`, line 3236 vs usage starting at line 2957

The `escHtml` function is defined well after its first call in `populateDetail`. This works in JavaScript due to function hoisting, but only because it is a `function` declaration not a `var` expression. The inconsistency could cause confusion. Utilities like this are best gathered at the top.

### 17. Action buttons in detail panel are non-functional stubs
**File:** `07_Prototype/html/sponsorai-explore.html`, line 3211

```javascript
function dpAction(action, id) {
  /* Placeholder — future implementation */
  console.log('[SponsorAI] panel action:', action, id);
}
```

The Watch, Portfolio, and Compare buttons in the detail panel all call this stub. The Compare button even has a `disabled` class and a tooltip saying "Select another property first". These should either be removed visually until implemented, or the panel should clearly indicate they are coming soon rather than appearing interactive.

### 18. Old prototype files not archived
**Directory:** `07_Prototype/Old/`

There are 14 HTML files in the Old folder. These contain earlier versions of the app with their own hardcoded values and potentially older CSS. Having them present in the working directory creates the risk of accidentally sharing or continuing to build on stale versions. Consider moving them to `99_Archive` or deleting them if you have confidence they are superseded.

### 19. `console.log` leaks in production-facing code
Multiple files log user-facing data to the console:
- `Website/script.js` line 85: `console.log('[SponsorAI] Signup captured:', email)`
- `Website/investor-auth.js` line 132: `console.log('[SponsorAI] Investor signup:', email)`
- `07_Prototype/html/sponsorai-explore.html` lines 3211, 3377–3383: various debug logs including card IDs and command states

These are visible to any investor or user who opens DevTools. For a trust-first product, leaking internal debug state feels inconsistent with the brand positioning.

### 20. Master schema is not the source of truth
**File:** `database/001_master_schema.sql`

The master schema script as written will not produce a working database when run from scratch — at minimum migrations 006, 007, and 008 need to be folded in. The test plan documents the gaps. As the database evolves, keeping the master schema current (or having a consolidated migration file that includes all deltas) will save significant time during any future environment setup.

---

## What's Working Well

To be clear about what is solid:

- The scoring model logic is well-reasoned. The component separation (norm, growth, consistency, integrity multiplier) is clean and explainable, which matters for the trust-first positioning.
- `ui_data_layer.ts` is well-structured. The `toNum`, `toWin`, and `assertData` helpers are correct, the interface definitions are clear, and the Supabase query patterns are sensible.
- The SQL indexing strategy is good. The indexes cover the key UI query patterns and the EXPLAIN notes in the test plan are a healthy sign of performance awareness.
- The design system token discipline is strong. The CSS variable system is comprehensive and consistent across prototype files.
- The chat assistant system prompt is well-written. The guardrails, mode definitions, and formatting rules are clear and appropriately cautious about not presenting scores as predictions.
- Error handling in `ui_data_layer.ts` is generally correct — null checks are present, errors are labelled by function name, and suppression state is handled consistently.

---

*Review complete. No changes were made to any files.*
