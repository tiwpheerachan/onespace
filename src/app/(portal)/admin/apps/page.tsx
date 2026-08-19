"use client";

import { motion } from "framer-motion";
import { Boxes, ExternalLink, ImagePlus, KeyRound, Layers, Pencil, Plus, Search, Settings2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { SchemaTab, SsoTab } from "@/components/AppAuthzTabs";
import { Confirm } from "@/components/Confirm";
import { PageHeader } from "@/components/PageHeader";
import { Badge, CheckPill, EmptyState, Field, Modal } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { APP_CATEGORIES, type AppCategory, type AppStatus, type PortalApp } from "@/lib/types";
import { cn, initials, normalise, uid } from "@/lib/utils";

type EditorTab = "general" | "sso" | "schema";

const SWATCHES = [
  "#1f43e6", "#0d9488", "#7c3aed", "#e11d48", "#ea580c",
  "#0284c7", "#059669", "#4f46e5", "#475569", "#0f172a",
  "#c026d3", "#d09b3e",
];

const STATUSES: AppStatus[] = ["active", "beta", "maintenance", "offline"];

const blank = (order: number): PortalApp => ({
  id: uid("app"),
  name: "",
  shortName: "",
  description: "",
  url: "https://",
  logoUrl: null,
  color: "#1f43e6",
  category: "it",
  status: "active",
  roles: [],
  owner: "",
  version: "1.0.0",
  sortOrder: order,
  createdAt: new Date().toISOString(),
});

export default function AdminAppsPage() {
  const { t } = usePrefs();
  const { apps, roles, saveApp, deleteApp } = usePortal();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<PortalApp | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tab, setTab] = useState<EditorTab>("general");
  const [pendingDelete, setPendingDelete] = useState<PortalApp | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normalise(query.trim());
    return apps.filter((a) =>
      q ? normalise(`${a.name} ${a.owner} ${a.category} ${a.url}`).includes(q) : true,
    );
  }, [apps, query]);

  const openNew = () => {
    setDraft(blank(apps.length + 1));
    setIsNew(true);
    setTab("general");
  };

  const openEdit = (app: PortalApp) => {
    setDraft({ ...app });
    setIsNew(false);
    setTab("general");
  };

  const patch = (p: Partial<PortalApp>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ logoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const commit = async () => {
    if (!draft?.name.trim() || !draft.url.trim()) return;
    await saveApp({
      ...draft,
      shortName: draft.shortName.trim() || initials(draft.name),
    });
    setDraft(null);
  };

  return (
    <>
      <PageHeader
        title={t.apps.title}
        subtitle={t.apps.subtitle}
        action={
          <button onClick={openNew} className="btn-primary">
            <Plus className="h-4 w-4" />
            {t.apps.new}
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.common.search}
            className="input pl-10"
          />
        </div>
        <span className="text-[12.5px] text-ink-mute">
          {filtered.length} {t.apps.count}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Boxes className="h-6 w-6" />} title={t.common.noResults} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="hidden grid-cols-[minmax(0,2.4fr)_1fr_1fr_1fr_auto] gap-4 border-b border-line bg-canvas/60 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-mute lg:grid">
            <span>{t.common.name}</span>
            <span>{t.common.category}</span>
            <span>{t.apps.allowedRoles}</span>
            <span>{t.common.status}</span>
            <span className="text-right">{t.common.actions}</span>
          </div>

          {filtered.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 14) * 0.025 }}
              className="grid grid-cols-1 items-center gap-4 border-b border-line px-5 py-4 transition last:border-0 hover:bg-canvas/50 lg:grid-cols-[minmax(0,2.4fr)_1fr_1fr_1fr_auto]"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <AppLogo app={app} size={42} radius={13} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{app.name}</p>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 truncate text-[11.5px] text-ink-mute transition hover:text-brand-600"
                  >
                    {app.url.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <span className="text-[12.5px] text-ink-soft">{t.cat[app.category]}</span>

              <div className="flex flex-wrap gap-1">
                {app.roles.length === 0 ? (
                  <span className="chip">{t.common.all}</span>
                ) : (
                  app.roles.slice(0, 3).map((key) => {
                    const role = roles.find((r) => r.key === key);
                    return (
                      <span
                        key={key}
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: `${role?.color ?? "#64748b"}1a`, color: role?.color ?? "#64748b" }}
                      >
                        {role?.name ?? key}
                      </span>
                    );
                  })
                )}
              </div>

              <span>
                <Badge tone={app.status}>{t.status[app.status]}</Badge>
              </span>

              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => openEdit(app)}
                  className="rounded-lg p-2 text-ink-mute transition hover:bg-canvas hover:text-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPendingDelete(app)}
                  className="rounded-lg p-2 text-ink-mute transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── editor ─────────────────────────────────────── */}
      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={isNew ? t.apps.create : t.apps.edit}
        subtitle={draft?.name || undefined}
        width="max-w-3xl"
        footer={
          <>
            <button onClick={() => setDraft(null)} className="btn-ghost btn-sm">
              {t.common.cancel}
            </button>
            <button onClick={commit} className="btn-primary btn-sm">
              {t.common.saveChanges}
            </button>
          </>
        }
      >
        {draft && (
          <div>
            <div className="mb-5 flex gap-1 rounded-xl border border-line bg-canvas/60 p-1">
              {([
                { id: "general", label: t.sso.tabGeneral, icon: Settings2 },
                { id: "sso", label: t.sso.tabSso, icon: KeyRound },
                { id: "schema", label: t.sso.tabSchema, icon: Layers },
              ] as { id: EditorTab; label: string; icon: typeof Settings2 }[]).map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition",
                    tab === tb.id ? "bg-surface text-ink shadow-sm" : "text-ink-mute hover:text-ink-soft",
                  )}
                >
                  <tb.icon className="h-4 w-4" />
                  {tb.label}
                </button>
              ))}
            </div>

            {tab === "sso" && <SsoTab draft={draft} patch={patch} />}
            {tab === "schema" && <SchemaTab draft={draft} patch={patch} />}

            {tab === "general" && (
            <div className="grid gap-6 md:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <Field label={t.common.name}>
                  <input
                    className="input"
                    value={draft.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder="FinCore Accounting"
                  />
                </Field>
                <Field label={t.common.shortName}>
                  <input
                    className="input uppercase"
                    maxLength={3}
                    value={draft.shortName}
                    onChange={(e) => patch({ shortName: e.target.value.toUpperCase() })}
                    placeholder="FC"
                  />
                </Field>
              </div>

              <Field label={t.common.description}>
                <textarea
                  className="input h-20 resize-none py-2.5"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              <Field label={t.common.url} hint={t.apps.urlHint}>
                <input
                  className="input"
                  value={draft.url}
                  onChange={(e) => patch({ url: e.target.value })}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t.common.category}>
                  <select
                    className="input"
                    value={draft.category}
                    onChange={(e) => patch({ category: e.target.value as AppCategory })}
                  >
                    {APP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {t.cat[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.common.status}>
                  <select
                    className="input"
                    value={draft.status}
                    onChange={(e) => patch({ status: e.target.value as AppStatus })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t.status[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.common.version}>
                  <input
                    className="input"
                    value={draft.version}
                    onChange={(e) => patch({ version: e.target.value })}
                  />
                </Field>
              </div>

              <Field label={t.common.owner}>
                <input
                  className="input"
                  value={draft.owner}
                  onChange={(e) => patch({ owner: e.target.value })}
                  placeholder="Corporate IT"
                />
              </Field>

              <div>
                <p className="label">{t.apps.allowedRoles}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roles.map((r) => (
                    <CheckPill
                      key={r.id}
                      color={r.color}
                      checked={draft.roles.includes(r.key)}
                      onChange={(v) =>
                        patch({
                          roles: v
                            ? [...draft.roles, r.key]
                            : draft.roles.filter((k) => k !== r.key),
                        })
                      }
                      label={r.name}
                      description={r.key}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] text-ink-mute">{t.apps.allowedRolesHint}</p>
              </div>
            </div>

            {/* ── live preview ────────────────────────── */}
            <div className="space-y-4">
              <p className="label">{t.apps.preview}</p>
              <motion.div
                layout
                className="rounded-2xl border border-line bg-canvas/60 p-4"
              >
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                  <AppLogo
                    app={{
                      name: draft.name || "New App",
                      shortName: draft.shortName || initials(draft.name || "New App"),
                      logoUrl: draft.logoUrl,
                      color: draft.color,
                    }}
                    size={48}
                  />
                  <p className="heading mt-3 text-[14px] text-ink">{draft.name || "—"}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">
                    {draft.description || "—"}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-[11px] text-ink-mute">{t.cat[draft.category]}</span>
                    <Badge tone={draft.status}>{t.status[draft.status]}</Badge>
                  </div>
                </div>
              </motion.div>

              <div>
                <p className="label">{t.common.logo}</p>
                <input
                  className="input mb-2"
                  placeholder="https://…/logo.png"
                  value={draft.logoUrl && !draft.logoUrl.startsWith("data:") ? draft.logoUrl : ""}
                  onChange={(e) => patch({ logoUrl: e.target.value || null })}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-ghost btn-sm flex-1"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {t.apps.upload}
                  </button>
                  {draft.logoUrl && (
                    <button onClick={() => patch({ logoUrl: null })} className="btn-ghost btn-sm">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {t.apps.remove}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mute">{t.apps.logoHint}</p>
              </div>

              <div>
                <p className="label">{t.common.color}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => patch({ color: c })}
                      className={cn(
                        "h-7 w-7 rounded-lg ring-offset-2 ring-offset-surface transition-transform hover:scale-110",
                        draft.color === c && "ring-2 ring-ink",
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
            )}
          </div>
        )}
      </Modal>

      <Confirm
        open={Boolean(pendingDelete)}
        title={t.apps.deleteTitle}
        body={t.apps.deleteBody}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteApp(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
