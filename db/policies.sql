-- ============================================================================
-- LifeTap RLS policies — run in Supabase SQL editor.
--
-- Access model:
--   admin     → full read/write on users, personnel, reports across all cities
--   medic     → read users + personnel + reports in their assigned city;
--               file reports in their city; update their own personnel row
--   responder → same as medic
--
-- The civilian-facing app writes to public.users via the service-role
-- client (or its own RLS scoped to auth.uid()) — this file does not define
-- write policies on users from the dashboard side.
-- ============================================================================

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- Phone as stored in personnel ("+639…"), derived from the JWT's phone claim
-- (Supabase stores the phone digits-only, so we re-prefix with "+").
create or replace function public.current_phone()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (auth.jwt() ->> 'phone') is null then null
    when (auth.jwt() ->> 'phone') like '+%' then (auth.jwt() ->> 'phone')
    else '+' || (auth.jwt() ->> 'phone')
  end
$$;

create or replace function public.current_personnel()
returns public.personnel
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.personnel p
  where p.phone = public.current_phone()
    and p.is_active = true
  limit 1
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.current_personnel()
$$;

create or replace function public.current_city()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select city from public.current_personnel()
$$;

-- ── Enable RLS ──────────────────────────────────────────────────────────────

alter table public.users     enable row level security;
alter table public.personnel enable row level security;
alter table public.reports   enable row level security;

-- ── Drop existing policies (idempotent re-runs) ─────────────────────────────

drop policy if exists "users_select_scoped"     on public.users;
drop policy if exists "personnel_select_scoped" on public.personnel;
drop policy if exists "personnel_update_self"   on public.personnel;
drop policy if exists "personnel_admin_write"   on public.personnel;
drop policy if exists "reports_select_scoped"   on public.reports;
drop policy if exists "reports_insert_in_city"  on public.reports;
drop policy if exists "reports_admin_write"     on public.reports;

-- ── users ───────────────────────────────────────────────────────────────────
-- Admins read everything. Medics/responders read only users whose city
-- prefix matches their assigned city (user.cty is "City, Province").

create policy "users_select_scoped"
on public.users
for select
to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role() in ('medic', 'responder')
    and public.current_city() is not null
    and cty ilike public.current_city() || '%'
  )
);

-- ── personnel ───────────────────────────────────────────────────────────────
-- Admins read everything. Others read personnel in their own city, and
-- always their own row (so the dashboard can resolve "me").

create policy "personnel_select_scoped"
on public.personnel
for select
to authenticated
using (
  public.current_role() = 'admin'
  or phone = public.current_phone()
  or (
    public.current_role() in ('medic', 'responder')
    and public.current_city() is not null
    and city = public.current_city()
  )
);

-- Personnel — only the active personnel themselves may update their own row
-- (e.g. last_login). Admins may insert/update/delete any personnel row.

create policy "personnel_update_self"
on public.personnel
for update
to authenticated
using (phone = public.current_phone())
with check (phone = public.current_phone());

create policy "personnel_admin_write"
on public.personnel
for all
to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

-- ── reports ─────────────────────────────────────────────────────────────────
-- Admins read everything. Medics/responders read reports filed in their city.

create policy "reports_select_scoped"
on public.reports
for select
to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role() in ('medic', 'responder')
    and public.current_city() is not null
    and city = public.current_city()
  )
);

-- Any active personnel can file a report, but only for their own city.
create policy "reports_insert_in_city"
on public.reports
for insert
to authenticated
with check (
  public.current_role() in ('admin', 'medic', 'responder')
  and (
    public.current_role() = 'admin'
    or city = public.current_city()
  )
);

-- Updates and deletes on reports: admin only.
create policy "reports_admin_write"
on public.reports
for all
to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');
