export type Permission =
  | "portal.view"
  | "app.launch"
  | "app.manage"
  | "user.manage"
  | "role.manage"
  | "audit.view"
  | "settings.manage";

export const ALL_PERMISSIONS: Permission[] = [
  "portal.view",
  "app.launch",
  "app.manage",
  "user.manage",
  "role.manage",
  "audit.view",
  "settings.manage",
];

export type AppCategory =
  | "finance"
  | "hr"
  | "supply"
  | "sales"
  | "manufacturing"
  | "analytics"
  | "it";

export const APP_CATEGORIES: AppCategory[] = [
  "finance",
  "hr",
  "supply",
  "sales",
  "manufacturing",
  "analytics",
  "it",
];

export type AppStatus = "active" | "beta" | "maintenance" | "offline";

export interface PortalApp {
  id: string;
  name: string;
  shortName: string;
  description: string;
  url: string;
  logoUrl: string | null;
  color: string;
  category: AppCategory;
  status: AppStatus;
  roles: string[];
  owner: string;
  version: string;
  sortOrder: number;
  createdAt: string;
  /** Central-identity authorization model (SSO + per-app roles/resources). */
  sso?: AppSso;
  resources?: AppResource[];
  capabilities?: AppCapability[];
  appRoles?: AppRole[];
  grants?: AppGrant[];
}

/* ── App authorization model (central-identity style) ──────────────────── */

/** none < view < edit < manage — the ladder a role's base level walks. */
export type ResourceLevel = "none" | "view" | "edit" | "manage";
export const RESOURCE_LEVELS: ResourceLevel[] = ["none", "view", "edit", "manage"];

export type ResourceType = "table" | "page";

/** Something an app declares that permissions can target (a table, a page). */
export interface AppResource {
  key: string;
  name: string;
  rtype: ResourceType;
  sensitive?: boolean;
}

/** An ability a level cannot cover (e.g. "approve leave") — granted explicitly. */
export interface AppCapability {
  key: string;
  name: string;
}

/** A role scoped to one app: a base level, per-resource exceptions, capabilities. */
export interface AppRole {
  key: string;
  name: string;
  baseLevel: ResourceLevel;
  /** resourceKey → level, only where it must differ from baseLevel. */
  overrides: Record<string, ResourceLevel>;
  capabilities: string[];
  canShare?: boolean;
  system?: boolean;
}

/** A person granted a role in an app. */
export interface AppGrant {
  email: string;
  roleKey: string;
}

/** SSO / OIDC connection details for an app (the "identity" layer). */
export interface AppSso {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  /** "บังคับสิทธิ์" — deny anyone without a role in this app at the gate. */
  enforceAuthz: boolean;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string;
  color: string;
  permissions: Permission[];
  system?: boolean;
}

export type UserStatus = "active" | "invited" | "suspended";

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleKey: string;
  department: string;
  status: UserStatus;
  lastLogin: string | null;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export interface Session {
  user: PortalUser;
  role: Role;
}
