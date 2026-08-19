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

/** Resolve a person's effective access in an app — the shape /verify returns. */
export function effectiveForUser(app: PortalApp, email: string) {
  const a = withAuthz(app);
  const roleKeys = a.grants.filter((g) => g.email.toLowerCase() === email.toLowerCase()).map((g) => g.roleKey);
  const roles = a.appRoles.filter((r) => roleKeys.includes(r.key));
  const hasAccess = roles.length > 0;

  const baseLevel = roles.reduce<ResourceLevel>(
    (top, r) => (levelRank(r.baseLevel) > levelRank(top) ? r.baseLevel : top),
    "none",
  );
  const resources: Record<string, ResourceLevel> = {};
  for (const res of a.resources) {
    const lvl = roles.reduce<ResourceLevel>(
      (top, r) => {
        const l = effectiveLevel(r, res.key);
        return levelRank(l) > levelRank(top) ? l : top;
      },
      "none",
    );
    resources[res.key] = lvl;
  }
  const capabilities = [...new Set(roles.flatMap((r) => r.capabilities))];
  const canShare = roles.some((r) => r.canShare);

  return { hasAccess, roles: roleKeys, baseLevel, canShare, resources, capabilities };
}

export function grantCountForRole(grants: AppGrant[], roleKey: string) {
  return grants.filter((g) => g.roleKey === roleKey).length;
}

export function sensitiveResources(resources: AppResource[]) {
  return resources.filter((r) => r.sensitive);
}
