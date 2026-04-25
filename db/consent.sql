-- ============================================================================
-- LifeTap consent tracking — run after policies.sql and audit.sql.
--
-- Adds consent fields to public.users so the LGU can demonstrate that each
-- civilian profile was registered with informed consent (DPA requirement).
--
-- consent_given_at  — timestamp the user accepted the data-collection terms
-- consent_version   — which version of the privacy notice they accepted
--                     (increment this string when the notice materially changes
--                      so you can identify users who accepted an old version)
-- consent_withdrawn_at — if the user later withdrew consent; soft-deletes
--                        their access without destroying the audit record
-- ============================================================================

alter table public.users
  add column if not exists consent_given_at    timestamptz,
  add column if not exists consent_version     text,
  add column if not exists consent_withdrawn_at timestamptz;

comment on column public.users.consent_given_at     is 'Timestamp the user accepted the active privacy notice.';
comment on column public.users.consent_version      is 'Version identifier of the privacy notice accepted, e.g. "2024-v1".';
comment on column public.users.consent_withdrawn_at is 'Set when the user requests data deletion / consent withdrawal.';

-- Index for quickly finding profiles that accepted a specific version
-- (needed when you update the privacy notice and must re-obtain consent).
create index if not exists users_consent_version_idx
  on public.users (consent_version)
  where consent_version is not null;

-- Index for finding profiles with withdrawn consent (pending deletion queue).
create index if not exists users_consent_withdrawn_idx
  on public.users (consent_withdrawn_at)
  where consent_withdrawn_at is not null;
