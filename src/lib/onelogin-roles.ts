/**
 * Onelogin role keys (app 13) → ONE SPACE portal role keys.
 *
 * Onelogin is the source of truth for what an SSO user may do here
 * (ONESPACE-TODO §2). The same table lives in SQL (sso_portal_roles() in
 * supabase/onelogin_roles.sql) — keep the two in step. A role key not listed
 * here grants nothing; it is never treated as `employee`.
 */
export const ONELOGIN_ROLE_MAP: Record<string, string> = {
  erp_admin: "admin",
  employee: "staff",
  guest: "guest",
};

/** Portal role keys for a list of Onelogin `app.roles`; unknown keys dropped. */
export function portalRoleKeys(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  const keys = roles
    .filter((r): r is string => typeof r === "string")
    .map((r) => ONELOGIN_ROLE_MAP[r])
    .filter((k): k is string => Boolean(k));
  return Array.from(new Set(keys));
}

/** Only `string` entries of `app.roles` — what is stored in app_metadata. */
export function oneloginRoles(app: unknown): string[] {
  const roles = (app as { roles?: unknown } | null)?.roles;
  return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === "string") : [];
}
