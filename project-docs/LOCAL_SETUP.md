# LOCAL_SETUP.md

SponsorAI — Local Environment Setup

Last updated: 2026-03-13

---

## Purpose

Two files required to run the prototype are intentionally excluded from the repository: the application shell (`app/explore.html`) and the credentials file (`app/config.js`). This document explains what they are, why they are excluded, and how to set up a working local environment.

---

## Why these files are not in the repo

`app/config.js` contains a live Supabase anon key. Committing credentials to a repository, even a private one, is a security risk. It is gitignored permanently.

`app/explore.html` is the application entry point. It is also gitignored because it imports `config.js` directly. Tracking it would require anyone cloning the repo to set up credentials before the file would work correctly, and it would change frequently during development. The JS layer it depends on (`data.js`, `ui.js`, `ai.js`, etc.) is fully tracked.

---

## Step 1 — Create config.js

Copy the tracked example file and fill in real values:

```
cp app/config.example.js app/config.js
```

Then open `app/config.js` and replace the placeholder values:

| Variable | What it is | Where to find it |
|---|---|---|
| `API_URL` | Supabase project REST endpoint | Supabase dashboard → Project Settings → API → Project URL |
| `API_KEY` | Supabase anon (public) key | Supabase dashboard → Project Settings → API → anon public |

The Supabase project is: `kyjpxxyaebxvpprugmof`

The Anthropic API key is **not** stored in `config.js`. AI chat is proxied through the Supabase Edge Function at `supabase/functions/chat/`. The Anthropic key is set as a Supabase secret on the project, not in the browser. You do not need an Anthropic key to run the app locally.

---

## Step 2 — Obtain app/explore.html

`app/explore.html` is not in the repository. It must be obtained from the current maintainer or reconstructed.

The file has the following structure:

```
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <!-- meta, title, <link rel="stylesheet" href="styles.css"> -->
</head>
<body>
  <!-- rendered by layout.js -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="config.js"></script>
  <script src="data.js"></script>
  <script src="images.js"></script>
  <script src="components/card.js"></script>
  <script src="components/layout.js"></script>
  <script src="components/panel.js"></script>
  <script src="ui.js"></script>
  <script src="ai.js"></script>
  <script>
    /* init: compareList, initLayout(), initTheme(), event listeners, init() */
  </script>
</body>
</html>
```

The inline script at the bottom defines `compareList`, calls `initLayout()` and `initTheme()`, attaches document-level event listeners, and calls `init()` to boot the data fetch.

---

## Step 3 — Verify

Open `app/explore.html` in a browser (served via a local server, not `file://` — the Supabase fetch requires CORS-safe headers).

A quick local server:

```
cd /path/to/SponsorAi
npx serve app
```

If the grid loads cards, both config values are correct. If it shows empty or no cards, check the browser console for fetch errors.

---

## Known local-only files (never commit these)

| File | Reason |
|---|---|
| `app/config.js` | Contains live credentials |
| `app/explore.html` | App entry point; imports credentials indirectly |
| `app/explore.html.bak` | Backup of pre-refactor monolith; no longer needed |

---

## Repo state at 2026-03-13

The JS layer is fully extracted and tracked. `explore.html` is the only untracked runtime dependency. The tracked files are:

```
app/
  config.example.js    ← copy this to config.js
  data.js
  images.js
  styles.css
  ui.js
  ai.js
  components/
    card.js
    layout.js
    panel.js
  index.html           ← marketing/nav stub
  compare.html         ← stub
  portfolio.html       ← stub
  watchlist.html       ← stub
  property.html        ← stub
  opportunities.html   ← stub
```
