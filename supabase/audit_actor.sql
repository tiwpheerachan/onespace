-- Audit rows can't be forged (ONESPACE-TODO follow-up).
-- Any signed-in user may add an audit row (the browser logs launches/usage),
-- but the database — not the browser — now decides WHO and WHEN:
--   actor = name the SSO callback put in app_metadata (users can't edit it),
--           else the portal_users name, else the login email.
-- Rows written by the service role (no user in the JWT) are left as sent.
-- Safe to run any time, before or after deploying.

create or replace function public.stamp_audit_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if jwt_email = '' then
    return new;
  end if;
  new.actor := coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'name', ''),
    (select u.name from public.portal_users u where lower(u.email) = jwt_email limit 1),
    jwt_email
  );
  new.at := now();
  return new;
end;
$$;

drop trigger if exists portal_audit_stamp_actor on public.portal_audit;
create trigger portal_audit_stamp_actor
  before insert on public.portal_audit
  for each row execute function public.stamp_audit_actor();
