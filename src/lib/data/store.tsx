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
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AuditEntry, Permission, PortalApp, PortalUser, Role } from "@/lib/types";
import { uid } from "@/lib/utils";

interface RecentEntry {
  appId: string;
  at: string;
}

interface PortalValue extends PortalSnapshot {
  loading: boolean;
  error: string | null;
  backend: string;
  supabaseReady: boolean;

  currentUser: PortalUser | null;
  currentRole: Role | null;
  can: (permission: Permission) => boolean;
  canOpen: (app: PortalApp) => boolean;

  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;

  favourites: string[];
  toggleFavourite: (appId: string) => void;
  recents: RecentEntry[];
  registerLaunch: (app: PortalApp) => void;
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
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  /* ── boot ─────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snapshot = await loadSnapshot();
        if (alive) setData(snapshot);
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

  const currentUser = useMemo(
    () => data.users.find((u) => u.email.toLowerCase() === sessionEmail?.toLowerCase()) ?? null,
    [data.users, sessionEmail],
  );

  const currentRole = useMemo(
    () => data.roles.find((r) => r.key === currentUser?.roleKey) ?? null,
    [data.roles, currentUser],
  );

  const can = useCallback(
    (permission: Permission) => Boolean(currentRole?.permissions.includes(permission)),
    [currentRole],
  );

  const canOpen = useCallback(
    (app: PortalApp) => {
      if (!currentRole) return false;
      if (currentRole.permissions.includes("app.manage")) return true;
      if (!currentRole.permissions.includes("app.launch")) return false;
      if (!app.roles.length) return true;
      return app.roles.includes(currentRole.key);
    },
    [currentRole],
  );

  /* ── mutations ────────────────────────────────────────── */

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
        void persist(next, "audit", entry);
        return next;
      });
    },
    [currentUser],
  );

  const saveApp = useCallback(
    async (app: PortalApp) => {
      setData((prev) => {
        const exists = prev.apps.some((a) => a.id === app.id);
        const apps = exists
          ? prev.apps.map((a) => (a.id === app.id ? app : a))
          : [...prev.apps, app];
        const next = { ...prev, apps: apps.sort((a, b) => a.sortOrder - b.sortOrder) };
        void persist(next, "apps", app);
        return next;
      });
      log("app.save", app.name);
    },
    [log],
  );

  const deleteApp = useCallback(
    async (id: string) => {
      let name = id;
      setData((prev) => {
        name = prev.apps.find((a) => a.id === id)?.name ?? id;
        const next = { ...prev, apps: prev.apps.filter((a) => a.id !== id) };
        void remove(next, "apps", id);
        return next;
      });
      log("app.delete", name);
    },
    [log],
  );

  const saveUser = useCallback(
    async (user: PortalUser) => {
      setData((prev) => {
        const exists = prev.users.some((u) => u.id === user.id);
        const users = exists
          ? prev.users.map((u) => (u.id === user.id ? user : u))
          : [...prev.users, user];
        const next = { ...prev, users };
        void persist(next, "users", user);
        return next;
      });
      log("user.save", user.email);
    },
    [log],
  );

  const deleteUser = useCallback(
    async (id: string) => {
      let email = id;
      setData((prev) => {
        email = prev.users.find((u) => u.id === id)?.email ?? id;
        const next = { ...prev, users: prev.users.filter((u) => u.id !== id) };
        void remove(next, "users", id);
        return next;
      });
      log("user.delete", email);
    },
    [log],
  );

  const saveRole = useCallback(
    async (role: Role) => {
      setData((prev) => {
        const exists = prev.roles.some((r) => r.id === role.id);
        const roles = exists
          ? prev.roles.map((r) => (r.id === role.id ? role : r))
          : [...prev.roles, role];
        const next = { ...prev, roles };
        void persist(next, "roles", role);
        return next;
      });
      log("role.save", role.key);
    },
    [log],
  );

  const deleteRole = useCallback(
    async (id: string) => {
      let key = id;
      setData((prev) => {
        key = prev.roles.find((r) => r.id === id)?.key ?? id;
        const next = { ...prev, roles: prev.roles.filter((r) => r.id !== id) };
        void remove(next, "roles", id);
        return next;
      });
      log("role.delete", key);
    },
    [log],
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
        void persist(next, "users", stamped);
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
    backend: backendName,
    supabaseReady: isSupabaseConfigured,
    currentUser,
    currentRole,
    can,
    canOpen,
    signIn,
    signOut,
    favourites,
    toggleFavourite,
    recents,
    registerLaunch,
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
