-- MFA for password sign-in (Onelogin's ask, 8 Oct).
-- A session that signed in with an email + password (the emergency admin)
-- gets rights only after a second factor — the JWT's `aal` claim is "aal2".
-- SSO sessions are unchanged: Onelogin already verified the person.
--
-- Run AFTER deploying the code with the MFA step: from then on a password
-- session without a verified authenticator sees nothing until it sets one up
-- (the login page walks the admin through it).

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
    -- password session: the portal's own role, and only after a second factor
    else coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' and exists (
      select 1
      from public.portal_users u
      join public.portal_roles r on r.key = u.role_key
      where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and u.status = 'active'
        and perm = any (r.permissions)
    )
  end;
$$;
