# ADR-002: Multi-Platform Social Ingestion Architecture

**Status:** Accepted
**Date:** 2026-03-17
**Scope:** Social data ingestion — X, Instagram, TikTok, YouTube

---

## Context

SponsorAI v1 built a social ingestion pipeline exclusively for X (Twitter), using the X API v2 to collect daily follower snapshots. The schema was designed for a single platform: `property_social_accounts` had a hardcoded `CHECK (platform IN ('x'))`, and `social_account_snapshots` stored X-specific fields (`tweet_count`, `listed_count`, `verified_type`) with no traceability metadata.

Expanding to Instagram, TikTok, and YouTube requires:
- A unified account registry across platforms
- A shared snapshot table with platform-generic field names
- Mandatory traceability (data_source, source_detail, ingested_at) on every row
- Support for both API-based (X, YouTube) and scraper-based (Instagram, TikTok) ingestion

The constraint is that each platform has a different data access model:
- **X** — fully documented API; stable numeric user IDs; batch endpoint
- **YouTube** — documented API (YouTube Data API v3); channel ID as stable identifier
- **Instagram** — no public API without business account; scraper required
- **TikTok** — no public API for profile data; scraper required

---

## Decision

### 1. Single canonical account table

`property_social_accounts` is the single source of truth for all platform account links. Platform constraint expanded to `('x', 'instagram', 'tiktok', 'youtube')`.

New fields added:
- `profile_url` — direct profile URL; used for display and as scrape target
- `link_confidence` — `confirmed | high | medium | unverified`; tracks how certain we are the account is correct
- `link_method` — `manual | api | discovered`; how the link was established
- `last_verified_at` — when the account was last confirmed active against the platform

### 2. Shared snapshot table with traceability columns

`social_account_snapshots` is extended rather than duplicated. Platform-specific fields are handled with nullable generic columns:
- `posts_count` — tweets (X), posts (Instagram), videos (TikTok/YouTube)
- `likes_count` — total likes (TikTok heart count; null for others)
- `views_count` — total channel views (YouTube; null for others)
- `platform` — denormalized from `property_social_accounts` for query efficiency

Every row must include:
- `data_source` — `api` or `scraper`
- `source_detail` — specific endpoint or scraper name (e.g. `x-api-v2-users-batch`, `instagram-web-profile-info-v1`, `tiktok-public-html-v1`, `youtube-data-api-v3-channels`)
- `ingested_at` — wall-clock time the row was written
- `completeness_pct` — 0–100; percentage of expected fields that were successfully populated

### 3. Platform-specific ingest functions

One edge function per platform. Each is independently scheduled, fails gracefully, and updates account status on repeated failure. Naming: `ingest-{platform}-daily`.

| Function | Auth model | Batch size |
|---|---|---|
| `ingest-x-profile-daily` | API — X Bearer Token | 100 per API call |
| `ingest-youtube-daily` | API — YouTube Data API v3 key | 50 per API call |
| `ingest-instagram-daily` | Scraper — public web endpoint | 1 per request |
| `ingest-tiktok-daily` | Scraper — public page parse | 1 per request |

### 4. Scraper design constraints

Instagram and TikTok scrapers operate on public, unauthenticated endpoints only:
- Instagram: `i.instagram.com/api/v1/users/web_profile_info/?username={handle}` — semi-public internal API used by the Instagram web client
- TikTok: public profile HTML page — parses `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON block

Both scrapers:
- Run at low frequency (once per day maximum)
- Set `completeness_pct` based on how many expected fields were populated
- Mark `data_source = 'scraper'` so UI can display appropriate caveats
- Update `status = 'error'` on failure; revert to `active` on next success

---

## Options Considered

### Option A: Separate tables per platform

Create `instagram_account_snapshots`, `tiktok_account_snapshots`, etc.

| Dimension | Assessment |
|---|---|
| Schema clarity | High — no nullable cross-platform fields |
| Query cost | High — every aggregation requires UNION |
| Rollup function | Must be cloned per platform |
| Traceability | Harder to enforce uniformly |

Rejected: maintenance overhead grows O(n) with platforms.

### Option B: Unified table with JSONB for platform extras (chosen basis)

Single `social_account_snapshots` with nullable columns for platform-specific fields plus a `raw_data jsonb` escape hatch.

| Dimension | Assessment |
|---|---|
| Schema clarity | Medium — nullable columns are self-documenting |
| Query cost | Low — single table for all rollup computation |
| Flexibility | High — raw_data covers unanticipated fields |
| Traceability | Enforced at table level (NOT NULL on data_source) |

Chosen with modification: `raw_data` column deferred; all expected fields are named columns to preserve explainability.

---

## Consequences

Easier:
- Rollup logic applies to all platforms uniformly once snapshots are in the table
- Sources tab can show a consistent traceability row regardless of platform
- Adding a fifth platform (LinkedIn, Twitch, etc.) requires only a new ingest function and `CHECK` constraint update

Harder:
- Scraper-based ingestion is inherently fragile; Instagram and TikTok may block requests without warning
- `completeness_pct` requires discipline from each ingest function to set accurately
- Instagram and TikTok accounts must be monitored for `error` status; no automated re-resolution

Future work:
- A `resolve-instagram-account` function (once Meta Graph API access is confirmed)
- A unified `compute-social-rollups-daily` that runs after all platform ingests complete
- `consecutive_failures` counter on `property_social_accounts` to auto-suspend accounts

---

## Action Items

- [x] Apply migration `20260318000000_social_ingestion_multi_platform.sql`
- [x] Deploy `ingest-youtube-daily`
- [x] Deploy `ingest-instagram-daily`
- [x] Deploy `ingest-tiktok-daily`
- [x] Update `ingest-x-profile-daily` to write traceability fields
- [ ] Set `YOUTUBE_API_KEY` secret in Supabase
- [ ] Insert YouTube, Instagram, TikTok accounts into `property_social_accounts` for first cohort
- [ ] Monitor scraper success rate after first week; adjust headers if blocked
