-- ── X Social Ingestion v1 ─────────────────────────────────────────────────
-- Applied: 2026-03-17
-- Tables:  property_social_accounts, social_account_snapshots
--
-- Design notes:
--   property_social_accounts — one row per (property × platform) linking a
--     property to its verified social account. Stores the stable platform_user_id
--     (X numeric ID) alongside the mutable username (@handle). Status tracks
--     account health so the daily ingest can skip dead accounts.
--
--   social_account_snapshots — append-only daily profile snapshot. One row per
--     (account × date). Stores only account-level public_metrics fields.
--     Post-level data is out of scope for v1.
--
--   This schema is deliberately independent of the existing `accounts` table.
--   The accounts table holds manually curated handles; these tables hold
--   API-resolved records with a stable platform_user_id and daily history.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── property_social_accounts ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_social_accounts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  platform         text        NOT NULL CHECK (platform IN ('x')),
  platform_user_id text        NOT NULL,       -- stable numeric X user ID
  username         text        NOT NULL,       -- @handle, without the @; may change
  display_name     text,
  resolved_at      timestamptz NOT NULL DEFAULT now(),
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'suspended', 'not_found', 'error')),
  status_detail    text,                       -- free-text context for non-active status
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- One X account per property; one property_user_id per platform
  UNIQUE (property_id, platform),
  UNIQUE (platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS psa_property_id_idx ON public.property_social_accounts (property_id);
CREATE INDEX IF NOT EXISTS psa_platform_idx    ON public.property_social_accounts (platform);
CREATE INDEX IF NOT EXISTS psa_status_idx      ON public.property_social_accounts (status);

COMMENT ON TABLE public.property_social_accounts IS
  'One row per resolved property-to-platform account mapping. '
  'platform_user_id is the stable numeric X user ID; username is the @handle '
  '(may change). status gates the daily ingest — only active rows are fetched.';

-- ── social_account_snapshots ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.social_account_snapshots (
  id                  bigserial   PRIMARY KEY,
  social_account_id   uuid        NOT NULL
                                  REFERENCES public.property_social_accounts(id)
                                  ON DELETE CASCADE,
  snapshot_date       date        NOT NULL,

  -- Core public_metrics from X API v2
  followers_count     bigint,
  following_count     bigint,
  tweet_count         bigint,
  listed_count        bigint,

  -- Account meta fields (change infrequently; stored for drift detection)
  verified            boolean,
  verified_type       text,           -- 'blue' | 'business' | 'government' | null
  protected           boolean,
  profile_image_url   text,
  description         text,

  collected_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (social_account_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS sas_account_date_idx
  ON public.social_account_snapshots (social_account_id, snapshot_date DESC);

COMMENT ON TABLE public.social_account_snapshots IS
  'Append-only daily profile snapshot per social account. '
  'One row per (social_account_id, snapshot_date). '
  'Supports audience growth tracking from follower count history. '
  'Post-level data is out of v1 scope.';
