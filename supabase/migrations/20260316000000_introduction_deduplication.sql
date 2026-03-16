-- ── Introduction Request Deduplication — V1 ────────────────────────────────
-- Applied: 2026-03-16
-- Prevents a brand from creating multiple concurrent active introduction
-- requests to the same property.
--
-- "Active" statuses: submitted, pending_property_claim, sent, nudged
-- "Terminal" statuses (re-request allowed): accepted, declined,
--   intro_completed, closed_no_response
--
-- This partial unique index acts as a belt-and-braces DB-level safety net.
-- The primary enforcement point is the application-layer check added to the
-- introduction-request edge function (step 3), which returns HTTP 409 with a
-- human-readable error message before an insert is attempted.
-- This index catches any bypass (direct API calls, migrations, future
-- edge functions) that skips the application check.

CREATE UNIQUE INDEX IF NOT EXISTS intro_req_active_dedupe_uix
  ON public.introduction_requests (from_profile_id, to_property_slug)
  WHERE status IN ('submitted', 'pending_property_claim', 'sent', 'nudged');

-- ── Live DB instructions ───────────────────────────────────────────────────
-- On a fresh build the above CREATE INDEX statement runs as-is.
-- On a live DB that already has the introduction_requests table, run:
--
-- CREATE UNIQUE INDEX IF NOT EXISTS intro_req_active_dedupe_uix
--   ON public.introduction_requests (from_profile_id, to_property_slug)
--   WHERE status IN ('submitted', 'pending_property_claim', 'sent', 'nudged');
--
-- No data migration is required. If duplicate active rows already exist in the
-- live DB, the index creation will fail. Resolve by auditing and closing/merging
-- duplicates first, then rerun.
