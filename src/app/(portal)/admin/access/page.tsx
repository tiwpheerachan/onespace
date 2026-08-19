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
  grantCountForRole,
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

function levelLabel(t: ReturnType<typeof usePrefs>["t"], l: ResourceLevel) {
  return l === "none" ? t.access.lvNone : l === "view" ? t.access.lvView : l === "edit" ? t.access.lvEdit : t.access.lvManage;
}

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

  const [viewMode, setViewMode] = useState<"app" | "person">("app");
  const [appId, setAppId] = useState<string | null>(null);
  const [personEmail, setPersonEmail] = useState<string | null>(null);
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

  // person view: set one person's role in a given app (one role per app here) —
  // writes straight to that app's grants, the same store the by-app view uses.
  const setPersonRole = (targetApp: PortalApp, email: string, roleKey: string) => {
    const grants = (targetApp.grants ?? []).filter((g) => g.email.toLowerCase() !== email);
    saveApp({ ...targetApp, grants: roleKey ? [...grants, { email, roleKey }] : grants });
  };
  const selectedUser = users.find((u) => u.email.toLowerCase() === personEmail);

  const addGrants = () => {
    if (!a || !grantRoleKey) return;
    const emails = grantEmails
      .split(/[\n,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@"));
    if (!emails.length) return;
    const existing = new Set(a.grants.map((g) => `${g.email}::${g.roleKey}`));
    const additions = emails
      .filter((e) => !existing.has(`${e}::${grantRoleKey}`))
      .map((email) => ({ email, roleKey: grantRoleKey }));
    setGrants([...a.grants, ...additions]);
    setGrantEmails("");
  };

  // a person picked from the central directory just drops their email into the box
  const addEmailToDraft = (email: string) => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setGrantEmails((prev) => {
      const list = prev.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      return list.includes(e) ? prev : [...list, e].join("\n");
    });
  };

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
        !personEmail ? (
          <EmptyState icon={<UsersIcon className="h-6 w-6" />} title={t.access.pickPerson} />
        ) : (
          <div className="space-y-3">
            {/* ── person header ── */}
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
              <Avatar name={selectedUser?.name ?? personEmail} src={selectedUser?.avatarUrl} size={44} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{selectedUser?.name ?? personEmail}</p>
                <p className="font-mono text-[11.5px] text-ink-mute">
                  {personEmail} ·{" "}
                  {apps.filter((ap) => (ap.grants ?? []).some((g) => g.email.toLowerCase() === personEmail)).length}{" "}
                  {t.access.appsGranted}
                </p>
              </div>
            </div>

            {/* ── access app-by-app for this person ── */}
            {apps.map((ap) => {
              const aa = withAuthz(ap);
              const roleKey = aa.grants.find((g) => g.email.toLowerCase() === personEmail)?.roleKey ?? "";
              const role = aa.appRoles.find((r) => r.key === roleKey);
              return (
                <div key={ap.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AppLogo app={ap} size={36} radius={11} />
                      <div>
                        <p className="text-[13.5px] font-semibold text-ink">{ap.name}</p>
                        <p className="font-mono text-[11px] text-ink-mute">
                          {aa.resources.length} resources · {aa.capabilities.length} capabilities
                        </p>
                      </div>
                    </div>
                    {aa.appRoles.length > 0 ? (
                      <select
                        value={roleKey}
                        onChange={(e) => setPersonRole(ap, personEmail, e.target.value)}
                        className={cn("input h-9 w-52", roleKey && "border-rose-400 font-semibold text-ink")}
                      >
                        <option value="">{t.access.noAccessOpt}</option>
                        {aa.appRoles.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.name}
                            {r.baseLevel === "manage" ? ` · ${t.access.lvManage}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink-mute">
                        {aa.sso.enforceAuthz ? t.access.noModelShort : t.access.openToAll}
                      </span>
                    )}
                  </div>

                  {/* effective page / resource access for this person in this app */}
                  {role && aa.resources.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="mb-2 text-[10.5px] uppercase tracking-wide text-ink-mute">
                        {t.access.pageAccess}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {aa.resources.map((res) => {
                          const lvl = effectiveLevel(role, res.key);
                          return (
                            <span
                              key={res.key}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium",
                                LEVEL_STYLE[lvl],
                              )}
                            >
                              {res.sensitive && <Lock className="h-3 w-3" />}
                              {res.name}
                              <span className="opacity-70">· {levelLabel(t, lvl)}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
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
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {a.appRoles.map((role) => {
                    const members = grantCountForRole(a.grants, role.key);
                    return (
                      <div key={role.key} className="group rounded-2xl border border-line bg-surface p-4 shadow-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-[13.5px] font-semibold text-ink">{role.name}</p>
                              <p className="font-mono text-[11px] text-ink-mute">{role.key}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
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
                        </div>

                        <div className="mt-3.5 flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wide text-ink-mute">{t.access.baseLevel}</span>
                          <LevelSegmented
                            value={role.baseLevel}
                            onChange={(l) => patchRole(role.key, { baseLevel: l })}
                            labels={labels}
                            size="sm"
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[11.5px] text-ink-mute">
                          <span className="inline-flex items-center gap-1.5">
                            <UsersIcon className="h-3.5 w-3.5" />
                            {members} {t.access.members}
                          </span>
                          <span>
                            {role.capabilities.length}/{a.capabilities.length} {t.access.capsCol}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ── comparison matrix ── */}
              {a.resources.length > 0 && (
                <section>
                  <h2 className="heading mb-3 text-[15px] text-ink">{t.access.matrix}</h2>
                  <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-line bg-canvas/60">
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                            {t.schema.resources}
                          </th>
                          {a.appRoles.map((r) => (
                            <th key={r.key} className="px-4 py-3 text-center text-[11.5px] font-semibold text-ink">
                              {r.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {a.resources.map((res) => (
                          <tr key={res.key} className="border-b border-line last:border-0">
                            <td className="px-5 py-3">
                              <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-soft">
                                {res.name}
                                {res.sensitive && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                    <Lock className="h-2.5 w-2.5" />
                                    {t.schema.sensitive}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-[10.5px] text-ink-mute">{res.key}</span>
                            </td>
                            {a.appRoles.map((r) => {
                              const lvl = effectiveLevel(r, res.key);
                              const overridden = r.overrides[res.key] !== undefined;
                              return (
                                <td key={r.key} className="px-4 py-3 text-center">
                                  <span
                                    className={cn(
                                      "relative inline-flex min-w-[58px] justify-center rounded-md px-2 py-1 text-[11.5px] font-semibold",
                                      LEVEL_STYLE[lvl],
                                    )}
                                  >
                                    {levelLabel(t, lvl)}
                                    {overridden && (
                                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-ink ring-2 ring-surface" />
                                    )}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ── grants ── */}
              <section>
                <h2 className="heading mb-3 text-[15px] text-ink">{t.access.grants}</h2>
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  {/* granted people */}
                  <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                    {a.grants.length === 0 ? (
                      <p className="px-5 py-10 text-center text-[12.5px] text-ink-mute">
                        {a.sso.enforceAuthz ? t.access.noModel : t.access.everyone}
                      </p>
                    ) : (
                      a.grants.map((g, i) => {
                        const role = a.appRoles.find((r) => r.key === g.roleKey);
                        const user = users.find((u) => u.email.toLowerCase() === g.email.toLowerCase());
                        return (
                          <div
                            key={`${g.email}-${g.roleKey}-${i}`}
                            className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                          >
                            <Avatar name={user?.name ?? g.email} src={user?.avatarUrl} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-ink">{user?.name ?? g.email}</p>
                              <p className="truncate text-[11.5px] text-ink-mute">{g.email}</p>
                            </div>
                            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11.5px] font-semibold text-rose-600 dark:text-rose-300">
                              {role?.name ?? g.roleKey}
                            </span>
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

                  {/* grant form */}
                  <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                    <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <UserPlus className="h-4 w-4 text-ink-mute" />
                      {t.access.grant}
                    </p>
                    {directoryEnabled && (
                      <div className="mb-3">
                        <PersonSearch onPick={addEmailToDraft} />
                      </div>
                    )}
                    <textarea
                      value={grantEmails}
                      onChange={(e) => setGrantEmails(e.target.value)}
                      placeholder={"name@company.co.th\nteam@company.co.th"}
                      className="input h-20 resize-none py-2.5 font-mono text-[12px]"
                    />
                    <p className="mt-1.5 text-[11px] text-ink-mute">{t.access.grantHint}</p>
                    <select
                      value={grantRoleKey}
                      onChange={(e) => setGrantRoleKey(e.target.value)}
                      className="input mt-3"
                    >
                      <option value="">— {t.roles.title} —</option>
                      {a.appRoles.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addGrants}
                      disabled={!grantRoleKey || !grantEmails.trim()}
                      className="btn-primary btn-sm mt-3 w-full"
                    >
                      <Plus className="h-4 w-4" />
                      {t.access.grant}
                    </button>
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
