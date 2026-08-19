-- ════════════════════════════════════════════════════════════════════════
--  NEXUS Enterprise Portal — Supabase / Postgres schema
--  Run this in the Supabase SQL editor (or `supabase db push`).
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Roles ──────────────────────────────────────────────────────────────
create table if not exists public.portal_roles (
  id          text primary key default gen_random_uuid()::text,
  key         text not null unique,
  name        text not null,
  description text default '',
  color       text not null default '#1f43e6',
  permissions text[] not null default '{}',
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Users (mirrors auth.users, keyed by email) ─────────────────────────
create table if not exists public.portal_users (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  email      text not null unique,
  avatar_url text,
  role_key   text not null references public.portal_roles(key) on update cascade,
  department text default '',
  status     text not null default 'active'
             check (status in ('active','invited','suspended')),
  last_login timestamptz,
  created_at timestamptz not null default now()
);

-- ── Applications (the tiles on the portal) ─────────────────────────────
create table if not exists public.portal_apps (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  short_name  text not null default '',
  description text default '',
  url         text not null,
  logo_url    text,
  color       text not null default '#1f43e6',
  category    text not null default 'it'
              check (category in ('finance','hr','supply','sales','manufacturing','analytics','it')),
  status      text not null default 'active'
              check (status in ('active','beta','maintenance','offline')),
  roles       text[] not null default '{}',   -- empty array = everyone
  owner       text default '',
  version     text default '1.0.0',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Audit trail ────────────────────────────────────────────────────────
create table if not exists public.portal_audit (
  id     text primary key default gen_random_uuid()::text,
  actor  text not null,
  action text not null,
  target text not null,
  at     timestamptz not null default now()
);

create index if not exists portal_apps_sort_idx  on public.portal_apps (sort_order);
create index if not exists portal_audit_at_idx   on public.portal_audit (at desc);
create index if not exists portal_users_role_idx on public.portal_users (role_key);

-- ════════════════════════════════════════════════════════════════════════
--  Helper: does the signed-in user hold a permission?
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_users u
    join public.portal_roles r on r.key = u.role_key
    where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and u.status = 'active'
      and perm = any (r.permissions)
  );
$$;

-- ════════════════════════════════════════════════════════════════════════
--  Row level security
-- ════════════════════════════════════════════════════════════════════════
alter table public.portal_roles enable row level security;
alter table public.portal_users enable row level security;
alter table public.portal_apps  enable row level security;
alter table public.portal_audit enable row level security;

-- Everyone signed in may read the catalogue; the client filters by role,
-- and `roles` on each row is the authoritative allow-list.
drop policy if exists apps_read on public.portal_apps;
create policy apps_read on public.portal_apps
  for select to authenticated using (true);

drop policy if exists apps_write on public.portal_apps;
create policy apps_write on public.portal_apps
  for all to authenticated
  using (public.has_permission('app.manage'))
  with check (public.has_permission('app.manage'));

drop policy if exists roles_read on public.portal_roles;
create policy roles_read on public.portal_roles
  for select to authenticated using (true);

drop policy if exists roles_write on public.portal_roles;
create policy roles_write on public.portal_roles
  for all to authenticated
  using (public.has_permission('role.manage'))
  with check (public.has_permission('role.manage'));

drop policy if exists users_read on public.portal_users;
create policy users_read on public.portal_users
  for select to authenticated
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email',''))
    or public.has_permission('user.manage')
  );

drop policy if exists users_write on public.portal_users;
create policy users_write on public.portal_users
  for all to authenticated
  using (public.has_permission('user.manage'))
  with check (public.has_permission('user.manage'));

drop policy if exists audit_read on public.portal_audit;
create policy audit_read on public.portal_audit
  for select to authenticated using (public.has_permission('audit.view'));

drop policy if exists audit_insert on public.portal_audit;
create policy audit_insert on public.portal_audit
  for insert to authenticated with check (true);

-- ════════════════════════════════════════════════════════════════════════
--  Seed data
-- ════════════════════════════════════════════════════════════════════════
insert into public.portal_roles (id, key, name, description, color, permissions, is_system) values
  ('role-admin','admin','System Administrator','Full control of the portal, applications, users and roles.','#1f43e6',
   '{portal.view,app.launch,app.manage,user.manage,role.manage,audit.view,settings.manage}', true),
  ('role-manager','manager','Department Manager','Opens every operational system and reviews the audit trail.','#0d9488',
   '{portal.view,app.launch,audit.view}', true),
  ('role-finance','finance','Finance Officer','Access limited to finance, analytics and procurement systems.','#d09b3e',
   '{portal.view,app.launch}', false),
  ('role-staff','staff','Staff','Day-to-day access to shared workplace systems.','#64748b',
   '{portal.view,app.launch}', true)
on conflict (key) do nothing;

insert into public.portal_users (id, name, email, role_key, department, status) values
  ('u-1','Rice Suwan','admin@shd-technology.co.th','admin','Corporate IT','active'),
  ('u-2','Nichada P.','manager@shd-technology.co.th','manager','Operations','active'),
  ('u-3','Kittipong R.','finance@shd-technology.co.th','finance','Finance & Accounting','active'),
  ('u-4','Wei Chen','staff@shd-technology.co.th','staff','Warehouse','active')
on conflict (email) do nothing;

insert into public.portal_apps (id, name, short_name, description, url, color, category, status, roles, owner, version, sort_order) values
  ('app-fin','FinCore Accounting','FC','General ledger, AR/AP, tax filing and multi-company consolidation.','https://fincore.example.com','#1f43e6','finance','active','{admin,manager,finance}','Finance IT','4.2.1',1),
  ('app-hr','PeopleHub HRIS','PH','Payroll, leave, shift planning and employee self-service.','https://peoplehub.example.com','#0d9488','hr','active','{}','HR Systems','3.8.0',2),
  ('app-wms','StockFlow WMS','SF','Warehouse movements, barcode picking and cycle counting.','https://stockflow.example.com','#7c3aed','supply','active','{admin,manager,staff}','Logistics','2.14.3',3),
  ('app-crm','PipelineCRM','PC','Leads, quotations, sales orders and customer service tickets.','https://pipeline.example.com','#e11d48','sales','active','{}','Commercial','5.0.2',4),
  ('app-mes','ShopFloor MES','SM','Work orders, machine OEE and real-time production tracking.','https://shopfloor.example.com','#ea580c','manufacturing','maintenance','{admin,manager}','Plant Engineering','1.9.7',5),
  ('app-bi','InsightBoard BI','IB','Executive dashboards, KPI trees and scheduled report delivery.','https://insight.example.com','#0284c7','analytics','active','{admin,manager,finance}','Data Team','2.3.0',6),
  ('app-proc','SourceDesk Procurement','SD','Purchase requisitions, vendor scoring and e-bidding.','https://sourcedesk.example.com','#059669','supply','beta','{admin,finance,manager}','Procurement','0.9.4',7),
  ('app-asset','AssetTrack CMMS','AT','Asset register, preventive maintenance and spare parts.','https://assettrack.example.com','#4f46e5','manufacturing','active','{}','Maintenance','3.1.5',8),
  ('app-doc','DocVault DMS','DV','Contract repository, e-signature workflow and retention rules.','https://docvault.example.com','#475569','it','active','{}','Corporate IT','6.0.0',9),
  ('app-idp','IdentityGate SSO','IG','Directory sync, MFA policy and application client registry.','https://identity.example.com','#0f172a','it','active','{admin}','Security','1.4.2',10)
on conflict (id) do nothing;
