import type {
  AppGrant,
  AppResource,
  AppRole,
  AppSso,
  PortalApp,
  ResourceLevel,
} from "@/lib/types";

/* Central-identity helpers. Everything an app needs for the SSO + authorization
   model lives embedded on the PortalApp, so the existing saveApp persists it. */

const rand = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 36).toString(36)).join("");

export const genClientId = () => `osp_${rand(20)}`;
export const genClientSecret = () => `sk_live_${rand(40)}`;

export function emptySso(): AppSso {
  return {
    enabled: false,
    clientId: "",
    clientSecret: "",
    redirectUris: [],
    enforceAuthz: false,
  };
}

/** The "เปิดใช้ชุดมาตรฐาน" set — Owner / Administrator / Editor / Viewer. */
export function standardAppRoles(): AppRole[] {
  return [
    { key: "owner", name: "Owner", baseLevel: "manage", overrides: {}, capabilities: [], canShare: true, system: true },
    { key: "admin", name: "Administrator", baseLevel: "manage", overrides: {}, capabilities: [], canShare: true, system: true },
    { key: "editor", name: "Editor", baseLevel: "edit", overrides: {}, capabilities: [], system: true },
    { key: "viewer", name: "Viewer", baseLevel: "view", overrides: {}, capabilities: [], system: true },
  ];
}

/** Fill in the authz shape so editors never read undefined. */
export function withAuthz(app: PortalApp): Required<
  Pick<PortalApp, "sso" | "resources" | "capabilities" | "appRoles" | "grants">
> & PortalApp {
  return {
    ...app,
    sso: app.sso ?? emptySso(),
    resources: app.resources ?? [],
    capabilities: app.capabilities ?? [],
    appRoles: app.appRoles ?? [],
    grants: app.grants ?? [],
  };
}

/** The level a role actually has on a resource: its override, else the base. */
export function effectiveLevel(role: AppRole, resourceKey: string): ResourceLevel {
  return role.overrides[resourceKey] ?? role.baseLevel;
}

const LEVEL_RANK: Record<ResourceLevel, number> = { none: 0, view: 1, edit: 2, manage: 3 };
export const levelRank = (l: ResourceLevel) => LEVEL_RANK[l];

/** Does any role touch a (usually sensitive) resource above "none"? */
export function rolesTouching(roles: AppRole[], resourceKey: string) {
  return roles.filter((r) => levelRank(effectiveLevel(r, resourceKey)) > 0);
}

/** The base level a single grant confers — from its role, or set directly. */
export function grantBaseLevel(app: PortalApp, grant: AppGrant): ResourceLevel {
  if (grant.roleKey) return (app.appRoles ?? []).find((r) => r.key === grant.roleKey)?.baseLevel ?? "none";
  return grant.level ?? "none";
}

/** The level a single grant confers on one resource — role-based or direct. */
export function resolveGrantLevel(app: PortalApp, grant: AppGrant, resourceKey: string): ResourceLevel {
  if (grant.roleKey) {
    const role = (app.appRoles ?? []).find((r) => r.key === grant.roleKey);
    return role ? effectiveLevel(role, resourceKey) : "none";
  }
  return grant.overrides?.[resourceKey] ?? grant.level ?? "none";
}

/** Resolve a person's effective access in an app — the shape /verify returns. */
export function effectiveForUser(app: PortalApp, email: string) {
  const a = withAuthz(app);
  const grants = a.grants.filter((g) => g.email.toLowerCase() === email.toLowerCase());
  const hasAccess = grants.length > 0;

  const maxLevel = (fn: (g: AppGrant) => ResourceLevel) =>
    grants.reduce<ResourceLevel>((top, g) => {
      const l = fn(g);
      return levelRank(l) > levelRank(top) ? l : top;
    }, "none");

  const baseLevel = maxLevel((g) => grantBaseLevel(a, g));
  const resources: Record<string, ResourceLevel> = {};
  for (const res of a.resources) {
    resources[res.key] = maxLevel((g) => resolveGrantLevel(a, g, res.key));
  }
  const capabilities = [
    ...new Set(
      grants.flatMap((g) =>
        g.roleKey ? a.appRoles.find((r) => r.key === g.roleKey)?.capabilities ?? [] : g.capabilities ?? [],
      ),
    ),
  ];
  const canShare = grants.some((g) =>
    g.roleKey ? Boolean(a.appRoles.find((r) => r.key === g.roleKey)?.canShare) : false,
  );

  return {
    hasAccess,
    roles: grants.map((g) => g.roleKey).filter((k): k is string => Boolean(k)),
    baseLevel,
    canShare,
    resources,
    capabilities,
  };
}

export function grantCountForRole(grants: AppGrant[], roleKey: string) {
  return grants.filter((g) => g.roleKey === roleKey).length;
}

export function sensitiveResources(resources: AppResource[]) {
  return resources.filter((r) => r.sensitive);
}
