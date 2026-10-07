-- Onelogin roles drive access (ONESPACE-TODO §2).
--
-- PART 1 — run BEFORE deploying the code that uses it. Safe with the old code.
--
--   • SSO users get permissions from Onelogin `app.roles`, which the SSO
--     callback stores in the JWT's app_metadata.onelogin_roles (users can't
--     edit app_metadata themselves). Other users (email login) keep using
--     portal_users.role_key as before.
--   • Each app's SSO client secret / grants / resource model move to
--     portal_app_authz, which only `app.manage` holders can read.

-- Guest = คนนอก: only apps that list "guest" in portal_apps.roles.
insert into public.portal_roles (id, key, name, description, color, permissions, is_system) values
  ('role-guest','guest','Guest','External person (Onelogin guest) — opens only apps that list the guest role.','#94a3b8',
   '{portal.view,app.launch}', true)
on conflict (key) do nothing;

-- Onelogin role key → portal role key. Same table as src/lib/onelogin-roles.ts;
-- an unknown Onelogin role maps to nothing.
create or replace function public.sso_portal_roles()
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(distinct m.key), '{}')
  from jsonb_array_elements_text(
         coalesce(auth.jwt() -> 'app_metadata' -> 'onelogin_roles', '[]'::jsonb)) as r(role)
  join (values ('erp_admin','admin'), ('employee','staff'), ('guest','guest')) as m(role, key)
    using (role);
$$;

create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- SSO session: Onelogin decides (portal_users.role_key is ignored)
    when auth.jwt() -> 'app_metadata' ? 'onelogin_roles' then exists (
      select 1
      from public.portal_roles r
      where r.key = any (public.sso_portal_roles())
        and perm = any (r.permissions)
    )
    -- email / password session: the portal's own role, as before
    else exists (
      select 1
      from public.portal_users u
      join public.portal_roles r on r.key = u.role_key
      where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and u.status = 'active'
        and perm = any (r.permissions)
    )
  end;
$$;

create table if not exists public.portal_app_authz (
  app_id text primary key references public.portal_apps(id) on delete cascade,
  authz  jsonb not null default '{}'
);
alter table public.portal_app_authz enable row level security;

drop policy if exists app_authz_manage on public.portal_app_authz;
create policy app_authz_manage on public.portal_app_authz
  for all to authenticated
  using (public.has_permission('app.manage'))
  with check (public.has_permission('app.manage'));

insert into public.portal_app_authz (app_id, authz)
select id, jsonb_strip_nulls(jsonb_build_object(
         'sso', authz -> 'sso',
         'resources', authz -> 'resources',
         'capabilities', authz -> 'capabilities',
         'appRoles', authz -> 'appRoles',
         'grants', authz -> 'grants'))
from public.portal_apps
where authz is not null
on conflict (app_id) do nothing;


-- PART 2 — run AFTER the new code is live (Render deploy finished).
-- Removes the secrets from portal_apps, which every signed-in user can read.
-- Run as its own query.
--
-- update public.portal_apps
--    set authz = authz - 'sso' - 'resources' - 'capabilities' - 'appRoles' - 'grants'
--  where authz is not null;
