"use client";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { SEED_APPS, SEED_AUDIT, SEED_ROLES, SEED_USERS } from "@/lib/data/seed";
import type { AuditEntry, PortalApp, PortalUser, Role } from "@/lib/types";

export interface PortalSnapshot {
  apps: PortalApp[];
  roles: Role[];
  users: PortalUser[];
  audit: AuditEntry[];
}

const STORE_KEY = "nexus.portal.v1";

/* ────────────────────────── local (demo) driver ────────────────────────── */

function readLocal(): PortalSnapshot {
  if (typeof window === "undefined") {
    return { apps: SEED_APPS, roles: SEED_ROLES, users: SEED_USERS, audit: SEED_AUDIT };
  }
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as PortalSnapshot;
  } catch {
    /* corrupted payload — fall through to seed */
  }
  const seeded: PortalSnapshot = {
    apps: SEED_APPS,
    roles: SEED_ROLES,
    users: SEED_USERS,
    audit: SEED_AUDIT,
  };
  writeLocal(seeded);
  return seeded;
}

function writeLocal(snapshot: PortalSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota exceeded — ignore, state still lives in memory */
  }
}

export function resetLocal(): PortalSnapshot {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORE_KEY);
  return readLocal();
}

/* ───────────────────────── supabase row mapping ────────────────────────── */

// portal_apps.authz holds display-only extras every signed-in user may read.
// The SSO secret, grants and resource model live in portal_app_authz, which
// only app.manage holders can read (supabase/onelogin_roles.sql).
type AppDisplay = Pick<PortalApp, "coverUrl" | "logoShape" | "longDescription" | "maintainer">;
type AppAuthz = Pick<PortalApp, "sso" | "resources" | "capabilities" | "appRoles" | "grants">;

type AppRow = {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
  url: string;
  logo_url: string | null;
  color: string;
  category: PortalApp["category"];
  status: PortalApp["status"];
  roles: string[] | null;
  owner: string | null;
  version: string | null;
  sort_order: number | null;
  created_at: string;
  authz: (AppDisplay & Partial<AppAuthz>) | null;
};

const toApp = (r: AppRow, secret?: Partial<AppAuthz>): PortalApp => {
  // rows written before the split still carry the secret part in portal_apps
  const authz = { ...(r.authz ?? {}), ...(secret ?? {}) };
  return {
    id: r.id,
    name: r.name,
    shortName: r.short_name,
    description: r.description ?? "",
    url: r.url,
    logoUrl: r.logo_url,
    color: r.color,
    category: r.category,
    status: r.status,
    roles: r.roles ?? [],
    owner: r.owner ?? "",
    version: r.version ?? "1.0.0",
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at,
    coverUrl: authz.coverUrl ?? null,
    logoShape: authz.logoShape ?? "rounded",
    longDescription: authz.longDescription ?? "",
    maintainer: authz.maintainer ?? null,
    sso: authz.sso,
    resources: authz.resources,
    capabilities: authz.capabilities,
    appRoles: authz.appRoles,
    grants: authz.grants,
  };
};

const fromApp = (a: PortalApp) => ({
  id: a.id,
  name: a.name,
  short_name: a.shortName,
  description: a.description,
  url: a.url,
  logo_url: a.logoUrl,
  color: a.color,
  category: a.category,
  status: a.status,
  roles: a.roles,
  owner: a.owner,
  version: a.version,
  sort_order: a.sortOrder,
  authz: {
    coverUrl: a.coverUrl ?? null,
    logoShape: a.logoShape ?? "rounded",
    longDescription: a.longDescription ?? "",
    maintainer: a.maintainer ?? null,
  },
});

const fromAppAuthz = (a: PortalApp) => ({
  app_id: a.id,
  authz: {
    sso: a.sso ?? null,
    resources: a.resources ?? [],
    capabilities: a.capabilities ?? [],
    appRoles: a.appRoles ?? [],
    grants: a.grants ?? [],
  },
});

type UserRow = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role_key: string;
  department: string | null;
  status: PortalUser["status"];
  last_login: string | null;
};

const toUser = (r: UserRow): PortalUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  avatarUrl: r.avatar_url,
  roleKey: r.role_key,
  department: r.department ?? "",
  status: r.status,
  lastLogin: r.last_login,
});

const fromUser = (u: PortalUser) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  avatar_url: u.avatarUrl,
  role_key: u.roleKey,
  department: u.department,
  status: u.status,
  last_login: u.lastLogin,
});

type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color: string;
  permissions: Role["permissions"] | null;
  is_system: boolean | null;
};

const toRole = (r: RoleRow): Role => ({
  id: r.id,
  key: r.key,
  name: r.name,
  description: r.description ?? "",
  color: r.color,
  permissions: r.permissions ?? [],
  system: Boolean(r.is_system),
});

const fromRole = (r: Role) => ({
  id: r.id,
  key: r.key,
  name: r.name,
  description: r.description,
  color: r.color,
  permissions: r.permissions,
  is_system: Boolean(r.system),
});

/* ──────────────────────────── public surface ───────────────────────────── */

export const backendName = isSupabaseConfigured ? "supabase" : "demo";

export async function loadSnapshot(): Promise<PortalSnapshot> {
  const sb = getSupabase();
  if (!sb) return readLocal();

  const [apps, secrets, roles, users, audit] = await Promise.all([
    sb.from("portal_apps").select("*").order("sort_order", { ascending: true }),
    // RLS returns rows only to app.manage holders; everyone else gets none
    sb.from("portal_app_authz").select("app_id, authz"),
    sb.from("portal_roles").select("*").order("name", { ascending: true }),
    sb.from("portal_users").select("*").order("name", { ascending: true }),
    sb.from("portal_audit").select("*").order("at", { ascending: false }).limit(1000),
  ]);

  const failure = apps.error || roles.error || users.error || audit.error;
  if (failure) throw new Error(failure.message);

  const secretOf = new Map(
    ((secrets.data ?? []) as { app_id: string; authz: Partial<AppAuthz> }[]).map((r) => [r.app_id, r.authz]),
  );
  return {
    apps: (apps.data as AppRow[]).map((r) => toApp(r, secretOf.get(r.id))),
    roles: (roles.data as RoleRow[]).map(toRole),
    users: (users.data as UserRow[]).map(toUser),
    audit: (audit.data ?? []) as AuditEntry[],
  };
}

/** Throws when the database refuses the write (e.g. RLS: no permission). */
export async function persist(snapshot: PortalSnapshot, changed: keyof PortalSnapshot, row?: unknown) {
  const sb = getSupabase();
  if (!sb) {
    writeLocal(snapshot);
    return;
  }
  if (!row) return;
  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
  };
  if (changed === "apps") {
    check(await sb.from("portal_apps").upsert(fromApp(row as PortalApp)));
    check(await sb.from("portal_app_authz").upsert(fromAppAuthz(row as PortalApp)));
  }
  if (changed === "users") check(await sb.from("portal_users").upsert(fromUser(row as PortalUser)));
  if (changed === "roles") check(await sb.from("portal_roles").upsert(fromRole(row as Role)));
  if (changed === "audit") check(await sb.from("portal_audit").insert(row as AuditEntry));
}

/** Throws when the database refuses the delete. */
export async function remove(snapshot: PortalSnapshot, table: keyof PortalSnapshot, id: string) {
  const sb = getSupabase();
  if (!sb) {
    writeLocal(snapshot);
    return;
  }
  const map: Record<string, string> = {
    apps: "portal_apps",
    users: "portal_users",
    roles: "portal_roles",
    audit: "portal_audit",
  };
  const { error } = await sb.from(map[table]).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function signIn(email: string, password: string): Promise<{ email: string } | null> {
  const sb = getSupabase();
  if (!sb) {
    // Demo mode: any password is accepted for a known address.
    return email.includes("@") ? { email: email.toLowerCase().trim() } : null;
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email) return null;
  return { email: data.user.email };
}

/* ─────────────── second factor for password sign-in (TOTP) ──────────────── */

// Onelogin's ask (8 Oct): the emergency admin's password sign-in needs MFA.
// RLS only grants a password session rights at aal2 (supabase/password_mfa.sql).

/** What a fresh password session still needs: nothing, a code, or setting up an app. */
export async function mfaNeeded(): Promise<"none" | "verify" | "enroll"> {
  const sb = getSupabase();
  if (!sb) return "none";
  const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return "enroll";
  if (data.currentLevel === "aal2") return "none";
  return data.nextLevel === "aal2" ? "verify" : "enroll";
}

/** Start setting up an authenticator app: the QR code and the secret behind it. */
export async function mfaEnroll(): Promise<{ factorId: string; qr: string; secret: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  // half-finished set-ups from an earlier attempt would pile up — drop them
  const { data: listed } = await sb.auth.mfa.listFactors();
  for (const f of listed?.all ?? []) {
    if (f.factor_type === "totp" && f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", issuer: "ONE SPACE", friendlyName: "ONE SPACE" });
  if (error || !data) return null;
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Check a 6-digit code; on success the session is raised to aal2. */
export async function mfaVerify(code: string, factorId?: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  let id = factorId;
  if (!id) {
    const { data } = await sb.auth.mfa.listFactors();
    id = data?.totp.find((f) => f.status === "verified")?.id;
  }
  if (!id) return false;
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: id, code: code.trim() });
  return !error;
}

export async function signOut() {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
}
