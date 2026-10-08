-- Resigning staff: the clearing phase (ONESPACE-TODO §4).
-- Onelogin sends employment.phase; the SSO callback / session check put it in
-- the JWT's app_metadata.onelogin_phase. While "clearing", a person keeps
-- read-only rights (look around, open apps, read the audit trail) but can't
-- create, change or approve anything. "ended" never gets this far — the app
-- sends them to /no-access. null (unknown) changes nothing.
-- Safe to run before or after deploying.

create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- clearing work before leaving: read-only
    when auth.jwt() -> 'app_metadata' ->> 'onelogin_phase' = 'clearing'
         and perm not in ('portal.view', 'app.launch', 'audit.view') then false
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
