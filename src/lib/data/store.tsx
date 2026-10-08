"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  backendName,
  loadSnapshot,
  persist,
  remove,
  resetLocal,
  signIn as repoSignIn,
  signOut as repoSignOut,
  type PortalSnapshot,
} from "@/lib/data/repository";
import { loadAssignments, pickDefaultAssignment } from "@/lib/assignments";
import { portalRoleKeys } from "@/lib/onelogin-roles";
import { checkSsoSession } from "@/lib/sso-session";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Assignment, AuditEntry, Permission, PortalApp, PortalUser, Role } from "@/lib/types";
import { uid } from "@/lib/utils";

/** Who the Supabase session says this is, when it came through Onelogin SSO. */
interface SsoIdentity {
  email: string;
  name: string;
  avatarUrl: string | null;
  department: string;
  /** portal role keys mapped from Onelogin app.roles */
  roleKeys: string[];
}

async function loadSsoIdentity(): Promise<SsoIdentity | null> {
  const sb = getSupabase();
  if (!sb) return null;
  // getUser() asks the server, so app_metadata is current, not a cached copy
  const { data } = await sb.auth.getUser();
  const user = data.user;
  const roles = user?.app_metadata?.onelogin_roles;
  if (!user?.email || !Array.isArray(roles)) return null;
  const meta = user.user_metadata ?? {};
  const profile = (meta.profile ?? {}) as { avatar_url?: string; department?: string };
  return {
    email: user.email.toLowerCase(),
    name: String(meta.name || user.email),
    avatarUrl: profile.avatar_url ?? null,
    department: profile.department ?? "",
    roleKeys: portalRoleKeys(roles),
  };
}

interface RecentEntry {
  appId: string;
  at: string;
}

interface PortalValue extends PortalSnapshot {
  loading: boolean;
  error: string | null;
  /** last write the database refused (e.g. no permission) — shown as a banner */
  writeError: string | null;
  dismissWriteError: () => void;
  backend: string;
  supabaseReady: boolean;

  currentUser: PortalUser | null;
  currentRole: Role | null;
  /** The person's hats (ใบสังกัด). Fewer than two = nothing to switch. */
  assignments: Assignment[];
  activeAssignment: Assignment | null;
  switchAssignment: (id: string) => void;
  can: (permission: Permission) => boolean;
  canOpen: (app: PortalApp) => boolean;

  /** Re-read rights after Onelogin changed them (session check said "changed"). */
  reloadRights: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;

  favourites: string[];
  toggleFavourite: (appId: string) => void;
  recents: RecentEntry[];
  registerLaunch: (app: PortalApp) => void;
  registerUsage: (app: PortalApp, seconds: number) => void;
  clearRecents: () => void;

  saveApp: (app: PortalApp) => Promise<void>;
  deleteApp: (id: string) => Promise<void>;
  saveUser: (user: PortalUser) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveRole: (role: Role) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;

  resetDemo: () => void;
}

const PortalContext = createContext<PortalValue | null>(null);

const empty: PortalSnapshot = { apps: [], roles: [], users: [], audit: [] };

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PortalSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [sso, setSso] = useState<SsoIdentity | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  /* ── boot ─────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [snapshot, identity] = await Promise.all([loadSnapshot(), loadSsoIdentity().catch(() => null)]);
        if (alive) {
          setData(snapshot);
          setSso(identity);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unable to load portal data");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    setSessionEmail(window.localStorage.getItem("nexus.session"));
    try {
      setFavourites(JSON.parse(window.localStorage.getItem("nexus.favourites") ?? "[]"));
      setRecents(JSON.parse(window.localStorage.getItem("nexus.recents") ?? "[]"));
    } catch {
      /* ignore malformed prefs */
    }
    return () => {
      alive = false;
    };
  }, []);

  // An SSO user needs no portal_users row — Onelogin vouches for them — but one
  // may exist (name, department edited by an admin); rights never come from it.
  const currentUser = useMemo((): PortalUser | null => {
    const email = sessionEmail?.toLowerCase();
    if (!email) return null;
    const row = data.users.find((u) => u.email.toLowerCase() === email) ?? null;
    if (!sso || sso.email !== email) return row;
    if (!sso.roleKeys.length) return null;
    return {
      id: row?.id ?? `sso:${email}`,
      name: row?.name ?? sso.name,
      email: row?.email ?? sso.email,
      avatarUrl: row?.avatarUrl ?? sso.avatarUrl,
      roleKey: sso.roleKeys[0],
      department: row?.department || sso.department,
      status: "active",
      lastLogin: row?.lastLogin ?? null,
    };
  }, [data.users, sessionEmail, sso]);

  /* ── hats ─────────────────────────────────────────────── */
  const sessionUserEmail = currentUser?.email.toLowerCase() ?? null;
  useEffect(() => {
    setAssignments([]);
    setActiveAssignmentId(null);
    if (!sessionUserEmail) return;
    let alive = true;
    (async () => {
      const list = await loadAssignments(sessionUserEmail).catch(() => []);
      if (!alive) return;
      const lastUsed = window.localStorage.getItem(`nexus.hat.${sessionUserEmail}`);
      setAssignments(list);
      setActiveAssignmentId(pickDefaultAssignment(list, lastUsed)?.id ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [sessionUserEmail]);

  const activeAssignment = useMemo(
    () => assignments.find((a) => a.id === activeAssignmentId) ?? null,
    [assignments, activeAssignmentId],
  );

  // Rights come from the hat being worn only (plan "แบบ ข") — never the union of
  // every hat, so a request raised in one hat can't be approved from another.
  // Without hats, the person's single portal role applies as before.
  // SSO users hold every role Onelogin gave them (mapped to portal roles).
  const activeRoleKeys = useMemo(
    () =>
      activeAssignment?.roles ??
      (!currentUser ? [] : sso?.email === currentUser.email.toLowerCase() ? sso.roleKeys : [currentUser.roleKey]),
    [activeAssignment, currentUser, sso],
  );

  const currentRole = useMemo(() => {
    const held = data.roles.filter((r) => activeRoleKeys.includes(r.key));
    if (held.length <= 1) return held[0] ?? null;
    // a hat carrying several roles applies all of them at once
    return {
      ...held[0],
      name: held.map((r) => r.name).join(" + "),
      permissions: Array.from(new Set(held.flatMap((r) => r.permissions))),
    };
  }, [data.roles, activeRoleKeys]);

  const can = useCallback(
    (permission: Permission) => Boolean(currentRole?.permissions.includes(permission)),
    [currentRole],
  );

  const canOpen = useCallback(
    (app: PortalApp) => {
      if (!currentRole) return false;
      if (currentRole.permissions.includes("app.manage")) return true;
      if (!currentRole.permissions.includes("app.launch")) return false;
      // empty = everyone on staff; a guest (คนนอก) only opens apps that name "guest"
      if (!app.roles.length) return activeRoleKeys.some((key) => key !== "guest");
      return app.roles.some((key) => activeRoleKeys.includes(key));
    },
    [currentRole, activeRoleKeys],
  );

  /* ── mutations ────────────────────────────────────────── */

  const reloadRights = useCallback(async () => {
    const [identity, snapshot] = await Promise.all([
      loadSsoIdentity().catch(() => null),
      loadSnapshot().catch(() => null),
    ]);
    setSso(identity);
    if (snapshot) setData(snapshot);
  }, []);

  // Changing apps, people or roles is risky (TODO §3): ask Onelogin live first
  // instead of trusting rights that may be up to a minute old.
  const liveCheck = useCallback(async () => {
    const status = await checkSsoSession();
    if (status === "inactive" || status === "noaccess") {
      await repoSignOut();
      window.localStorage.removeItem("nexus.session");
      window.location.replace(status === "inactive" ? "/login?sso=ended" : "/no-access");
      return false;
    }
    if (status === "changed") await reloadRights();
    return true;
  }, [reloadRights]);

  // The UI updates first; if the database refuses (RLS = no permission), say so
  // and reload the real data so the screen doesn't show a change that never saved.
  const writeFailed = useCallback((e: unknown) => {
    console.error("[portal] write refused", e);
    setWriteError(e instanceof Error ? e.message : String(e));
    loadSnapshot()
      .then(setData)
      .catch(() => {});
  }, []);

  const log = useCallback(
    (action: string, target: string) => {
      const entry: AuditEntry = {
        id: uid("aud"),
        actor: currentUser?.name ?? "System",
        action,
        target,
        at: new Date().toISOString(),
      };
      setData((prev) => {
        const next = { ...prev, audit: [entry, ...prev.audit].slice(0, 200) };
        persist(next, "audit", entry).catch(() => {}); // best effort
        return next;
      });
    },
    [currentUser],
  );

  const switchAssignment = useCallback(
    (id: string) => {
      const next = assignments.find((a) => a.id === id);
      if (!next || !sessionUserEmail || next.id === activeAssignmentId) return;
      setActiveAssignmentId(next.id);
      window.localStorage.setItem(`nexus.hat.${sessionUserEmail}`, next.id);
      log("assignment.switch", next.label);
    },
    [assignments, activeAssignmentId, sessionUserEmail, log],
  );

  const saveApp = useCallback(
    async (app: PortalApp) => {
      if (!(await liveCheck())) return;
      setData((prev) => {
        const exists = prev.apps.some((a) => a.id === app.id);
        const apps = exists
          ? prev.apps.map((a) => (a.id === app.id ? app : a))
          : [...prev.apps, app];
        const next = { ...prev, apps: apps.sort((a, b) => a.sortOrder - b.sortOrder) };
        persist(next, "apps", app).catch(writeFailed);
        return next;
      });
      log("app.save", app.name);
    },
    [log, writeFailed, liveCheck],
  );

  const deleteApp = useCallback(
    async (id: string) => {
      if (!(await liveCheck())) return;
      let name = id;
      setData((prev) => {
        name = prev.apps.find((a) => a.id === id)?.name ?? id;
        const next = { ...prev, apps: prev.apps.filter((a) => a.id !== id) };
        remove(next, "apps", id).catch(writeFailed);
        return next;
      });
      log("app.delete", name);
    },
    [log, writeFailed, liveCheck],
  );

  const saveUser = useCallback(
    async (user: PortalUser) => {
      if (!(await liveCheck())) return;
      setData((prev) => {
        const exists = prev.users.some((u) => u.id === user.id);
        const users = exists
          ? prev.users.map((u) => (u.id === user.id ? user : u))
          : [...prev.users, user];
        const next = { ...prev, users };
        persist(next, "users", user).catch(writeFailed);
        return next;
      });
      log("user.save", user.email);
    },
    [log, writeFailed, liveCheck],
  );

  const deleteUser = useCallback(
    async (id: string) => {
      if (!(await liveCheck())) return;
      let email = id;
      setData((prev) => {
        email = prev.users.find((u) => u.id === id)?.email ?? id;
        const next = { ...prev, users: prev.users.filter((u) => u.id !== id) };
        remove(next, "users", id).catch(writeFailed);
        return next;
      });
      log("user.delete", email);
    },
    [log, writeFailed, liveCheck],
  );

  const saveRole = useCallback(
    async (role: Role) => {
      if (!(await liveCheck())) return;
      setData((prev) => {
        const exists = prev.roles.some((r) => r.id === role.id);
        const roles = exists
          ? prev.roles.map((r) => (r.id === role.id ? role : r))
          : [...prev.roles, role];
        const next = { ...prev, roles };
        persist(next, "roles", role).catch(writeFailed);
        return next;
      });
      log("role.save", role.key);
    },
    [log, writeFailed, liveCheck],
  );

  const deleteRole = useCallback(
    async (id: string) => {
      if (!(await liveCheck())) return;
      let key = id;
      setData((prev) => {
        key = prev.roles.find((r) => r.id === id)?.key ?? id;
        const next = { ...prev, roles: prev.roles.filter((r) => r.id !== id) };
        remove(next, "roles", id).catch(writeFailed);
        return next;
      });
      log("role.delete", key);
    },
    [log, writeFailed, liveCheck],
  );

  /* ── session ──────────────────────────────────────────── */

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await repoSignIn(email, password);
      if (!result) return false;

      // With Supabase + row level security the catalogue is only readable once
      // authenticated, so the anonymous boot snapshot is empty. Now that we hold
      // a session, reload it before looking the signed-in user up.
      let snapshot = data;
      if (isSupabaseConfigured) {
        try {
          snapshot = await loadSnapshot();
          setData(snapshot);
        } catch {
          /* keep whatever we already have */
        }
      }

      const known = snapshot.users.find(
        (u) => u.email.toLowerCase() === result.email.toLowerCase(),
      );
      if (!known || known.status === "suspended") return false;
      window.localStorage.setItem("nexus.session", known.email);
      setSessionEmail(known.email);
      const stamped = { ...known, lastLogin: new Date().toISOString() };
      setData((prev) => {
        const next = {
          ...prev,
          users: prev.users.map((u) => (u.id === known.id ? stamped : u)),
        };
        persist(next, "users", stamped).catch(() => {}); // only admins may write portal_users
        return next;
      });
      return true;
    },
    [data],
  );

  const signOut = useCallback(async () => {
    await repoSignOut();
    window.localStorage.removeItem("nexus.session");
    setSessionEmail(null);
    setSso(null);
  }, []);

  /* ── personalisation ──────────────────────────────────── */

  const toggleFavourite = useCallback((appId: string) => {
    setFavourites((prev) => {
      const next = prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId];
      window.localStorage.setItem("nexus.favourites", JSON.stringify(next));
      return next;
    });
  }, []);

  const registerLaunch = useCallback(
    (app: PortalApp) => {
      setRecents((prev) => {
        const next = [{ appId: app.id, at: new Date().toISOString() }, ...prev.filter((r) => r.appId !== app.id)].slice(0, 8);
        window.localStorage.setItem("nexus.recents", JSON.stringify(next));
        return next;
      });
      log("app.launch", app.name);
    },
    [log],
  );

  // Record how long a session in an app lasted — as an audit row whose action
  // carries the seconds ("app.usage:<sec>"), so the Performance page can add
  // durations up per app / day / user without a new table.
  const registerUsage = useCallback(
    (app: PortalApp, seconds: number) => {
      const s = Math.round(seconds);
      if (s < 3) return; // ignore accidental blips
      log(`app.usage:${s}`, app.name);
    },
    [log],
  );

  const clearRecents = useCallback(() => {
    setRecents([]);
    window.localStorage.removeItem("nexus.recents");
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = resetLocal();
    setData(fresh);
    setFavourites([]);
    setRecents([]);
    window.localStorage.removeItem("nexus.favourites");
    window.localStorage.removeItem("nexus.recents");
  }, []);

  const value: PortalValue = {
    ...data,
    loading,
    error,
    writeError,
    dismissWriteError: () => setWriteError(null),
    backend: backendName,
    supabaseReady: isSupabaseConfigured,
    currentUser,
    currentRole,
    assignments,
    activeAssignment,
    switchAssignment,
    can,
    canOpen,
    reloadRights,
    signIn,
    signOut,
    favourites,
    toggleFavourite,
    recents,
    registerLaunch,
    registerUsage,
    clearRecents,
    saveApp,
    deleteApp,
    saveUser,
    deleteUser,
    saveRole,
    deleteRole,
    resetDemo,
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used inside <PortalProvider>");
  return ctx;
}
