-- Onelogin identity link (ONESPACE-TODO §1 / E3).
-- A user is identified by Onelogin's `sub`, never by email: emails change and
-- get reused, `sub` is stable for the life of the account.
-- Run once in the Supabase SQL editor BEFORE deploying the callback that reads it.

create table if not exists public.onelogin_link (
  onelogin_sub   text primary key,                -- `sub` from /sso/verify (numeric string)
  user_id        uuid not null unique references auth.users(id) on delete cascade,
  linked_at      timestamptz not null default now()
);
-- RLS on with no policies = only the service role can read/write.
alter table public.onelogin_link enable row level security;

-- Backfill: the previous callback already stored `sub` in user_metadata.
insert into public.onelogin_link (onelogin_sub, user_id)
select raw_user_meta_data->>'sub', id from auth.users
 where raw_user_meta_data->>'sub' is not null
on conflict do nothing;

-- Check: SSO users with no `sub` (they will be refused, not bound by email).
-- select id, email, created_at from auth.users u
--  where not exists (select 1 from public.onelogin_link l where l.user_id = u.id);
