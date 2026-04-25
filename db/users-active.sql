-- ============================================================================
-- LifeTap — add is_active flag to public.users
--
-- Distinct from consent_withdrawn_at (civilian-initiated right-to-erasure).
-- is_active is an LGU admin-controlled flag for administratively deactivating
-- a profile (e.g. duplicate record, data entry error, deceased person).
-- Inactive profiles are hidden from all list queries but preserved for audit.
-- ============================================================================

alter table public.users
  add column if not exists is_active boolean not null default true;

comment on column public.users.is_active is
  'Admin-controlled flag. false = profile hidden from dashboard lists. '
  'Distinct from consent_withdrawn_at which tracks civilian DPA erasure requests.';

-- Index for filtering active profiles (the common case in all list queries).
create index if not exists users_is_active_idx
  on public.users (is_active)
  where is_active = true;
