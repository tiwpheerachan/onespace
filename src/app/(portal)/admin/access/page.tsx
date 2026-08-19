"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Layers,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccessTabs } from "@/components/AccessTabs";
import { AppLogo } from "@/components/AppLogo";
import { Confirm } from "@/components/Confirm";
import { PageHeader } from "@/components/PageHeader";
import { PersonSearch } from "@/components/PersonSearch";
import { Avatar, EmptyState, Field, Modal } from "@/components/ui";
import {
  effectiveLevel,
  grantBaseLevel,
  grantCountForRole,
  resolveGrantLevel,
  standardAppRoles,
  withAuthz,
} from "@/lib/authz";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import {
  RESOURCE_LEVELS,
  type AppGrant,
  type AppRole,
  type PortalApp,
  type ResourceLevel,
} from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const directoryEnabled = process.env.NEXT_PUBLIC_DIRECTORY_ENABLED === "1";

const LEVEL_STYLE: Record<ResourceLevel, string> = {
  none: "bg-canvas text-ink-mute",
  view: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  edit: "bg-rose-500/20 text-rose-700 dark:text-rose-200",
  manage: "bg-rose-600 text-white",
};

/** Four-step ordinal control for a resource/base level. */
function LevelSegmented({
  value,
  onChange,
  labels,
  size = "md",
}: {
  value: ResourceLevel;
  onChange: (l: ResourceLevel) => void;
  labels: Record<ResourceLevel, string>;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-canvas/60 p-0.5">
      {RESOURCE_LEVELS.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={cn(
            "rounded-md font-semibold transition",
            size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-[12px]",
            value === l ? LEVEL_STYLE[l] : "text-ink-mute hover:text-ink-soft",
            value === l && l === "none" && "bg-surface text-ink shadow-sm",
          )}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}

export default function AccessPage() {
  const { t } = usePrefs();
  const { apps, users, saveApp, can } = usePortal();

  const [viewMode, setViewMode] = useState<"app" | "person">("person");
  const [appId, setAppId] = useState<string | null>(null);
  const [personEmail, setPersonEmail] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftRole, setDraftRole] = useState<AppRole | null>(null);
  const [pendingDeleteRole, setPendingDeleteRole] = useState<AppRole | null>(null);
  const [grantEmails, setGrantEmails] = useState("");
  const [grantRoleKey, setGrantRoleKey] = useState("");

  // default to the first app that already has a permission model, else the first app
  useEffect(() => {
    if (appId || !apps.length) return;
    const withModel = apps.find((a) => (a.appRoles?.length ?? 0) > 0);
    setAppId((withModel ?? apps[0]).id);
  }, [apps, appId]);

  useEffect(() => {
    if (personEmail || !users.length) return;
    setPersonEmail(users[0].email.toLowerCase());
  }, [users, personEmail]);

  useEffect(() => {
    const close = () => setPickerOpen(false);
    if (pickerOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [pickerOpen]);

  const app = useMemo(() => apps.find((a) => a.id === appId) ?? null, [apps, appId]);
  const a = app ? withAuthz(app) : null;

  // keep a sensible default role picked in the grant bar
  useEffect(() => {
    if (!app) return;
    const roles = app.appRoles ?? [];
    if (!grantRoleKey || !roles.some((r) => r.key === grantRoleKey)) {
      setGrantRoleKey(roles.length ? roles[roles.length - 1].key : "");
    }
  }, [app, grantRoleKey]);

  const labels = useMemo(
    () => ({ none: t.access.lvNone, view: t.access.lvView, edit: t.access.lvEdit, manage: t.access.lvManage }) as Record<ResourceLevel, string>,
    [t],
  );

  if (!can("app.manage")) {
    return (
      <>
        <PageHeader title={t.access.title} subtitle={t.access.subtitle} />
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t.dash.locked} body={t.dash.lockedHint} />
      </>
    );
  }

  const setRoles = (roles: AppRole[]) => app && saveApp({ ...app, appRoles: roles });
  const setGrants = (grants: AppGrant[]) => app && saveApp({ ...app, grants });
  const patchRole = (key: string, p: Partial<AppRole>) =>
    a && setRoles(a.appRoles.map((r) => (r.key === key ? { ...r, ...p } : r)));

  // The simple person-first flow writes DIRECT grants (a level, optional per-page
  // overrides) — no role needed. Editing an existing role-based grant converts it
  // to a direct one, preserving the levels it currently confers.
  const directOf = (targetApp: PortalApp, grant?: AppGrant): { level: ResourceLevel; overrides: Record<string, ResourceLevel> } => {
    if (!grant) return { level: "none", overrides: {} };
    if (grant.roleKey) {
      const role = (targetApp.appRoles ?? []).find((r) => r.key === grant.roleKey);
      return { level: role?.baseLevel ?? "none", overrides: { ...(role?.overrides ?? {}) } };
    }
    return { level: grant.level ?? "none", overrides: { ...(grant.overrides ?? {}) } };
  };

  const setPersonLevel = (targetApp: PortalApp, email: string, level: ResourceLevel) => {
    const others = (targetApp.grants ?? []).filter((g) => g.email.toLowerCase() !== email);
    // overall level resets the per-page detail — "everything at this level"
    saveApp({ ...targetApp, grants: level === "none" ? others : [...others, { email, level }] });
  };

  const setPersonOverride = (targetApp: PortalApp, email: string, resourceKey: string, level: ResourceLevel) => {
    const grants = targetApp.grants ?? [];
    const current = grants.find((g) => g.email.toLowerCase() === email);
    const { level: base, overrides } = directOf(targetApp, current);
    const next = { ...overrides };
    if (level === base) delete next[resourceKey];
    else next[resourceKey] = level;
    const others = grants.filter((g) => g.email.toLowerCase() !== email);
    saveApp({ ...targetApp, grants: [...others, { email, level: base === "none" ? "view" : base, overrides: next }] });
  };

  const selectedUser = users.find((u) => u.email.toLowerCase() === personEmail);

  // grant one person a role in this app (replaces any existing grant for them)
  const grantPerson = (email: string, roleKey: string) => {
    if (!a || !roleKey) return;
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) return;
    const others = a.grants.filter((g) => g.email.toLowerCase() !== e);
    setGrants([...others, { email: e, roleKey }]);
    setGrantEmails("");
  };
  const changeGrantRole = (index: number, roleKey: string) =>
    a && setGrants(a.grants.map((g, i) => (i === index ? { email: g.email, roleKey } : g)));

  const saveDraftRole = () => {
    if (!a || !draftRole || !draftRole.name.trim()) return;
    const exists = a.appRoles.some((r) => r.key === draftRole.key);
    setRoles(exists ? a.appRoles.map((r) => (r.key === draftRole.key ? draftRole : r)) : [...a.appRoles, draftRole]);
    setDraftRole(null);
  };

  return (
    <>
      <PageHeader
        title={t.access.title}
        subtitle={t.access.subtitle}
        action={
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* ── view mode: by app / by person ── */}
            <div className="flex rounded-xl border border-line bg-canvas/60 p-1">
              {(["app", "person"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setViewMode(m);
                    setPickerOpen(false);
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition",
                    viewMode === m ? "bg-surface text-ink shadow-sm" : "text-ink-mute hover:text-ink-soft",
                  )}
                >
                  {m === "app" ? t.access.byApp : t.access.byPerson}
                </button>
              ))}
            </div>

            {/* ── picker (app or person) ── */}
            <div className="relative">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="flex h-10 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition hover:border-rose-300"
              >
                {viewMode === "app" ? (
                  app ? <AppLogo app={app} size={22} radius={7} /> : <Layers className="h-4 w-4 text-ink-mute" />
                ) : selectedUser ? (
                  <Avatar name={selectedUser.name} src={selectedUser.avatarUrl} size={22} />
                ) : (
                  <UsersIcon className="h-4 w-4 text-ink-mute" />
                )}
                <span className="max-w-[180px] truncate">
                  {viewMode === "app"
                    ? app?.name ?? t.access.pickApp
                    : selectedUser?.name ?? t.access.pickPerson}
                </span>
                <ChevronDown className="h-4 w-4 text-ink-mute" />
              </button>
              <AnimatePresence>
                {pickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 z-40 mt-2 max-h-[360px] w-64 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lift"
                  >
                    {viewMode === "app"
                      ? apps.map((ap) => (
                          <button
                            key={ap.id}
                            onClick={() => {
                              setAppId(ap.id);
                              setPickerOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-canvas",
                              ap.id === appId && "bg-canvas",
                            )}
                          >
                            <AppLogo app={ap} size={22} radius={7} />
                            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{ap.name}</span>
                            {(ap.appRoles?.length ?? 0) > 0 && (
                              <span className="font-mono text-[10.5px] tabular-nums text-ink-mute">
                                {ap.appRoles?.length}
                              </span>
                            )}
                          </button>
                        ))
                      : users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setPersonEmail(u.email.toLowerCase());
                              setPickerOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-canvas",
                              u.email.toLowerCase() === personEmail && "bg-canvas",
                            )}
                          >
                            <Avatar name={u.name} src={u.avatarUrl} size={22} />
                            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{u.name}</span>
                          </button>
                        ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        }
      />

      <AccessTabs />

      {viewMode === "person" ? (
        <div className="space-y-5">
          {/* ── 1. find a person ── */}
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            {directoryEnabled && (
              <div className="mb-3">
                <PersonSearch onPick={(email) => setPersonEmail(email.toLowerCase())} />
              </div>
            )}
            <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-mute">{t.access.usersList}</p>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const active = u.email.toLowerCase() === personEmail;
                return (
                  <button
                    key={u.id}
                    onClick={() => setPersonEmail(u.email.toLowerCase())}
                    className={cn(
                      "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition",
                      active
                        ? "border-rose-400 bg-rose-50/70 dark:bg-rose-500/10"
                        : "border-line hover:border-rose-300",
                    )}
                  >
                    <Avatar name={u.name} src={u.avatarUrl} size={24} />
                    <span className="text-[12.5px] font-medium text-ink">{u.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!personEmail ? (
            <EmptyState icon={<UsersIcon className="h-6 w-6" />} title={t.access.searchOrPick} />
          ) : (
            <>
              {/* selected person */}
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
                <Avatar name={selectedUser?.name ?? personEmail} src={selectedUser?.avatarUrl} size={44} />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{selectedUser?.name ?? personEmail}</p>
                  <p className="font-mono text-[11.5px] text-ink-mute">
                    {personEmail} ·{" "}
                    {apps.filter((ap) => (ap.grants ?? []).some((g) => g.email.toLowerCase() === personEmail)).length}{" "}
                    {t.access.appsGranted}
                  </p>
                </div>
              </div>

              {/* ── 2. set a level per app, expand for per-page detail ── */}
              {apps.map((ap) => {
                const aa = withAuthz(ap);
                const grant = aa.grants.find((g) => g.email.toLowerCase() === personEmail);
                const base = grant ? grantBaseLevel(ap, grant) : "none";
                const expanded = expandedApp === ap.id;
                return (
                  <div key={ap.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AppLogo app={ap} size={38} radius={11} />
                        <div>
                          <p className="text-[13.5px] font-semibold text-ink">{ap.name}</p>
                          <p className="font-mono text-[11px] text-ink-mute">
                            {aa.resources.length} {t.schema.resources}
                          </p>
                        </div>
                      </div>
                      <LevelSegmented
                        value={base}
                        onChange={(l) => setPersonLevel(ap, personEmail, l)}
                        labels={labels}
                      />
                    </div>

                    {base !== "none" && aa.resources.length > 0 && (
                      <div className="mt-3 border-t border-line pt-3">
                        <button
                          onClick={() => setExpandedApp(expanded ? null : ap.id)}
                          className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft transition hover:text-ink"
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                          {t.access.setDetail} · {aa.resources.length}
                        </button>
                        {expanded && (
                          <div className="mt-3 space-y-2">
                            {aa.resources.map((res) => {
                              const lvl = grant ? resolveGrantLevel(ap, grant, res.key) : base;
                              return (
                                <div
                                  key={res.key}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-canvas/40 p-2.5"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-[12.5px] font-medium text-ink">{res.name}</span>
                                    {res.sensitive && <Lock className="h-3 w-3 shrink-0 text-amber-500" />}
                                  </span>
                                  <LevelSegmented
                                    value={lvl}
                                    onChange={(l) => setPersonOverride(ap, personEmail, res.key, l)}
                                    labels={labels}
                                    size="sm"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      ) : !app || !a ? (
        <EmptyState icon={<Layers className="h-6 w-6" />} title={t.access.noApp} />
      ) : (
        <div className="space-y-6">
          {/* ── app authz status ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-center gap-3">
              <AppLogo app={app} size={40} radius={12} />
              <div>
                <p className="text-[14px] font-semibold text-ink">{app.name}</p>
                <p className="font-mono text-[11.5px] text-ink-mute">
                  {a.resources.length} resources · {a.capabilities.length} capabilities · {a.grants.length} {t.access.members}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                a.sso.enforceAuthz
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
              )}
            >
              {a.sso.enforceAuthz ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {a.sso.enforceAuthz ? t.access.enforceOn : t.access.enforceOff}
            </span>
          </div>

          {a.appRoles.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-mute">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="heading text-[15px] text-ink">{t.access.noModel}</p>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-mute">{t.access.standardHint}</p>
              </div>
              <button onClick={() => setRoles(standardAppRoles())} className="btn-primary btn-sm">
                <Plus className="h-4 w-4" />
                {t.access.enableStandard}
              </button>
            </div>
          ) : (
            <>
              {/* ── role cards ── */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="heading text-[15px] text-ink">{t.roles.title}</h2>
                  <button
                    onClick={() =>
                      setDraftRole({ key: uid("ar"), name: "", baseLevel: "view", overrides: {}, capabilities: [] })
                    }
                    className="btn-ghost btn-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.access.addRole}
                  </button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line bg-canvas/60 text-[10.5px] font-bold uppercase tracking-wide text-ink-mute">
                        <th className="sticky left-0 z-10 bg-canvas/60 px-4 py-3">{t.roles.title}</th>
                        <th className="whitespace-nowrap px-3 py-3">{t.access.baseLevel}</th>
                        {a.resources.map((res) => (
                          <th key={res.key} className="whitespace-nowrap px-3 py-3 text-center">
                            <span className="inline-flex items-center gap-1">
                              {res.sensitive && <Lock className="h-3 w-3 text-amber-500" />}
                              {res.name}
                            </span>
                          </th>
                        ))}
                        {a.capabilities.map((cap) => (
                          <th key={cap.key} className="whitespace-nowrap px-3 py-3 text-center">{cap.name}</th>
                        ))}
                        <th className="px-3 py-3 text-center">{t.access.members}</th>
                        <th className="px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {a.appRoles.map((role) => (
                        <tr key={role.key} className="border-b border-line last:border-0 hover:bg-canvas/40">
                          <td className="sticky left-0 z-10 bg-surface px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300">
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold text-ink">{role.name}</span>
                                <span className="block truncate font-mono text-[10px] text-ink-mute">{role.key}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={role.baseLevel}
                              onChange={(e) => patchRole(role.key, { baseLevel: e.target.value as ResourceLevel })}
                              className="h-8 rounded-lg border border-line bg-surface px-2 text-[12px] font-medium text-ink outline-none focus:border-rose-400"
                            >
                              {RESOURCE_LEVELS.map((l) => (
                                <option key={l} value={l}>{labels[l]}</option>
                              ))}
                            </select>
                          </td>
                          {a.resources.map((res) => {
                            const overridden = role.overrides[res.key] !== undefined;
                            const lvl = effectiveLevel(role, res.key);
                            return (
                              <td key={res.key} className="px-3 py-2.5 text-center">
                                <select
                                  value={overridden ? lvl : ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const overrides = { ...role.overrides };
                                    if (!v) delete overrides[res.key];
                                    else overrides[res.key] = v as ResourceLevel;
                                    patchRole(role.key, { overrides });
                                  }}
                                  className={cn(
                                    "h-8 rounded-lg border px-2 text-[12px] font-medium outline-none focus:border-rose-400",
                                    overridden
                                      ? "border-rose-400 bg-rose-50/60 text-ink dark:bg-rose-500/10"
                                      : "border-line bg-surface text-ink-mute",
                                  )}
                                >
                                  <option value="">· {labels[role.baseLevel]}</option>
                                  {RESOURCE_LEVELS.map((l) => (
                                    <option key={l} value={l}>{labels[l]}</option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                          {a.capabilities.map((cap) => {
                            const on = role.capabilities.includes(cap.key);
                            return (
                              <td key={cap.key} className="px-3 py-2.5 text-center">
                                <button
                                  onClick={() =>
                                    patchRole(role.key, {
                                      capabilities: on
                                        ? role.capabilities.filter((k) => k !== cap.key)
                                        : [...role.capabilities, cap.key],
                                    })
                                  }
                                  className={cn(
                                    "mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition",
                                    on ? "border-transparent bg-rose-600 text-white" : "border-line hover:border-rose-300",
                                  )}
                                >
                                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 text-center font-mono text-[12px] tabular-nums text-ink-soft">
                            {grantCountForRole(a.grants, role.key)}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => setDraftRole({ ...role, overrides: { ...role.overrides } })}
                                className="rounded-lg p-1.5 text-ink-mute transition hover:bg-canvas hover:text-ink"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {!role.system && (
                                <button
                                  onClick={() => setPendingDeleteRole(role)}
                                  className="rounded-lg p-1.5 text-ink-mute transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11.5px] text-ink-mute">{t.access.overridesHint}</p>
              </section>

              {/* ── grant access — search a person, pick a role ── */}
              <section>
                <h2 className="heading mb-3 text-[15px] text-ink">{t.access.grants}</h2>
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={grantRoleKey}
                      onChange={(e) => setGrantRoleKey(e.target.value)}
                      className="input h-11 font-semibold sm:w-52"
                    >
                      {a.appRoles.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex-1">
                      {directoryEnabled ? (
                        <PersonSearch onPick={(email) => grantPerson(email, grantRoleKey)} />
                      ) : (
                        <div className="flex gap-2">
                          <input
                            value={grantEmails}
                            onChange={(e) => setGrantEmails(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && grantEmails.trim()) grantPerson(grantEmails, grantRoleKey);
                            }}
                            placeholder="name@company.co.th"
                            className="input h-11 flex-1"
                          />
                          <button
                            onClick={() => grantPerson(grantEmails, grantRoleKey)}
                            disabled={!grantEmails.trim()}
                            className="btn-primary btn-sm h-11 shrink-0"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-mute">
                    {directoryEnabled ? t.access.searchOrPick : t.access.grantHint}
                  </p>

                  {/* current grants — inline role change */}
                  <div className="mt-4 border-t border-line">
                    {a.grants.length === 0 ? (
                      <p className="py-8 text-center text-[12.5px] text-ink-mute">
                        {a.sso.enforceAuthz ? t.access.noModel : t.access.everyone}
                      </p>
                    ) : (
                      a.grants.map((g, i) => {
                        const user = users.find((u) => u.email.toLowerCase() === g.email.toLowerCase());
                        return (
                          <div
                            key={`${g.email}-${i}`}
                            className="flex items-center gap-3 border-b border-line py-2.5 last:border-0"
                          >
                            <Avatar name={user?.name ?? g.email} src={user?.avatarUrl} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-ink">{user?.name ?? g.email}</p>
                              <p className="truncate text-[11.5px] text-ink-mute">{g.email}</p>
                            </div>
                            <select
                              value={g.roleKey ?? ""}
                              onChange={(e) => changeGrantRole(i, e.target.value)}
                              className="h-8 rounded-lg border border-line bg-surface px-2 text-[12px] font-medium text-ink outline-none focus:border-rose-400"
                            >
                              {!g.roleKey && <option value="">{t.access.noAccessOpt}</option>}
                              {a.appRoles.map((r) => (
                                <option key={r.key} value={r.key}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setGrants(a.grants.filter((_, idx) => idx !== i))}
                              className="rounded-lg p-1.5 text-ink-mute transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ── role editor ── */}
      <Modal
        open={Boolean(draftRole)}
        onClose={() => setDraftRole(null)}
        title={t.roles.edit}
        subtitle={draftRole?.name || undefined}
        width="max-w-2xl"
        footer={
          <>
            <button onClick={() => setDraftRole(null)} className="btn-ghost btn-sm">
              {t.common.cancel}
            </button>
            <button onClick={saveDraftRole} className="btn-primary btn-sm">
              {t.common.saveChanges}
            </button>
          </>
        }
      >
        {draftRole && a && (
          <div className="space-y-5">
            <Field label={t.access.roleName}>
              <input
                className="input"
                value={draftRole.name}
                onChange={(e) => setDraftRole({ ...draftRole, name: e.target.value })}
                placeholder="Accountant"
              />
            </Field>

            <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/50 px-4 py-3">
              <span className="text-[13px] font-semibold text-ink">{t.access.baseLevel}</span>
              <LevelSegmented
                value={draftRole.baseLevel}
                onChange={(l) => setDraftRole({ ...draftRole, baseLevel: l })}
                labels={labels}
              />
            </div>

            {/* per-resource overrides */}
            {a.resources.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-ink">{t.access.overrides}</p>
                <p className="mb-2.5 text-[11.5px] text-ink-mute">{t.access.overridesHint}</p>
                <div className="space-y-2">
                  {a.resources.map((res) => {
                    const lvl = effectiveLevel(draftRole, res.key);
                    return (
                      <div key={res.key} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-2.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[12.5px] font-medium text-ink">{res.name}</span>
                          {res.sensitive && <Lock className="h-3 w-3 shrink-0 text-amber-500" />}
                        </span>
                        <LevelSegmented
                          value={lvl}
                          onChange={(l) => {
                            const overrides = { ...draftRole.overrides };
                            if (l === draftRole.baseLevel) delete overrides[res.key];
                            else overrides[res.key] = l;
                            setDraftRole({ ...draftRole, overrides });
                          }}
                          labels={labels}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* capabilities */}
            {a.capabilities.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-ink">{t.schema.capabilities}</p>
                <p className="mb-2.5 text-[11.5px] text-ink-mute">{t.schema.capabilitiesHint}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {a.capabilities.map((cap) => {
                    const on = draftRole.capabilities.includes(cap.key);
                    return (
                      <button
                        key={cap.key}
                        onClick={() =>
                          setDraftRole({
                            ...draftRole,
                            capabilities: on
                              ? draftRole.capabilities.filter((k) => k !== cap.key)
                              : [...draftRole.capabilities, cap.key],
                          })
                        }
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border p-3 text-left transition",
                          on ? "border-rose-400/70 bg-rose-50/70 dark:bg-rose-500/10" : "border-line hover:border-rose-200",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                            on ? "border-transparent bg-rose-600 text-white" : "border-line",
                          )}
                        >
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-ink">{cap.name}</span>
                          <span className="block truncate font-mono text-[11px] text-ink-mute">{cap.key}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Confirm
        open={Boolean(pendingDeleteRole)}
        title={t.roles.deleteTitle}
        body={t.roles.deleteBody}
        onCancel={() => setPendingDeleteRole(null)}
        onConfirm={() => {
          if (pendingDeleteRole && a) setRoles(a.appRoles.filter((r) => r.key !== pendingDeleteRole.key));
          setPendingDeleteRole(null);
        }}
      />
    </>
  );
}
