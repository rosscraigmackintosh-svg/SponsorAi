-- ── Introduction System V1 ────────────────────────────────────────────────
-- Applied: 2026-03-15
-- Tables: profiles, introduction_requests, introduction_events

-- ── profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type      text        NOT NULL CHECK (profile_type IN ('brand', 'property')),
  entity_slug       text,
  organisation_name text,
  contact_name      text        NOT NULL,
  email             text        NOT NULL,
  website           text,
  linkedin          text,
  country           text,
  interests         text,
  intro_note        text,
  status            text        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'complete', 'verified')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_email_idx       ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_entity_slug_idx ON public.profiles (entity_slug);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_type_uix ON public.profiles (email, profile_type);

-- ── introduction_requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.introduction_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id  uuid        REFERENCES public.profiles (id),
  to_profile_id    uuid        REFERENCES public.profiles (id),
  to_property_slug text        NOT NULL,
  direction        text        NOT NULL DEFAULT 'brand_to_property'
                              CHECK (direction IN ('brand_to_property', 'property_to_brand')),
  message          text,
  status           text        NOT NULL DEFAULT 'submitted'
                              CHECK (status IN (
                                'submitted',
                                'pending_property_claim',
                                'sent',
                                'nudged',
                                'accepted',
                                'declined',
                                'intro_completed',
                                'closed_no_response'
                              )),
  response_token   uuid        UNIQUE DEFAULT gen_random_uuid(),
  nudged_at        timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intro_req_from_profile_idx       ON public.introduction_requests (from_profile_id);
CREATE INDEX IF NOT EXISTS intro_req_to_property_slug_idx   ON public.introduction_requests (to_property_slug);
CREATE INDEX IF NOT EXISTS intro_req_response_token_idx     ON public.introduction_requests (response_token);
CREATE INDEX IF NOT EXISTS intro_req_status_idx             ON public.introduction_requests (status);

-- ── introduction_events (append-only log) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.introduction_events (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_request_id uuid        NOT NULL
                          REFERENCES public.introduction_requests (id) ON DELETE CASCADE,
  event_type              text        NOT NULL,
  actor_type              text,
  actor_profile_id        uuid        REFERENCES public.profiles (id),
  meta                    jsonb,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intro_events_request_id_idx ON public.introduction_events (introduction_request_id);

-- ── updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'introduction_requests_updated_at') THEN
    CREATE TRIGGER introduction_requests_updated_at
      BEFORE UPDATE ON public.introduction_requests
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── Introduction reminder / no-response handling (applied 2026-03-15) ────────
-- Adds nudged_at + closed_at columns and expands the status CHECK constraint.
-- On a fresh DB build these are already included in the CREATE TABLE above.
-- On a live DB that was created before this patch, run the following:
--
-- ALTER TABLE public.introduction_requests
--   ADD COLUMN IF NOT EXISTS nudged_at  timestamptz,
--   ADD COLUMN IF NOT EXISTS closed_at  timestamptz;
--
-- ALTER TABLE public.introduction_requests
--   DROP CONSTRAINT IF EXISTS introduction_requests_status_check;
--
-- ALTER TABLE public.introduction_requests
--   ADD CONSTRAINT introduction_requests_status_check
--   CHECK (status IN (
--     'submitted', 'pending_property_claim', 'sent', 'nudged',
--     'accepted', 'declined', 'intro_completed', 'closed_no_response'
--   ));
