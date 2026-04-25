-- ============================================================================
-- LifeTap audit log — run after policies.sql.
--
-- Records who accessed/modified what, from where. Inserts come from the
-- server-side audit helper (service-role bypass). Reads are admin-only.
-- ============================================================================

create table if not exists public.audit_log (
  id                  uuid primary key default gen_random_uuid(),
  actor_personnel_id  uuid references public.personnel(id) on delete set null,
  actor_phone         text,
  actor_role          text,
  action              text not null,
  resource_type       text,
  resource_id         text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists audit_log_actor_idx
  on public.audit_log (actor_personnel_id, created_at desc);

create index if not exists audit_log_resource_idx
  on public.audit_log (resource_type, resource_id, created_at desc);

create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_admin_read" on public.audit_log;

-- Only admins can read the audit log. No one writes via the user-bound
-- client — inserts go through the server-side helper using service-role.
create policy "audit_log_admin_read"
on public.audit_log
for select
to authenticated
using (public.current_role() = 'admin');
