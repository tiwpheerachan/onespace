"use client";

import { motion } from "framer-motion";
import { Boxes, ExternalLink, ImagePlus, KeyRound, Layers, Pencil, Plus, Search, Settings2, ShieldCheck, Trash2, Upload, UserRound, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { AppTile } from "@/components/AppTile";
import { SchemaTab, SsoTab } from "@/components/AppAuthzTabs";
import { Confirm } from "@/components/Confirm";
import { PageHeader } from "@/components/PageHeader";
import { type DirectoryPerson, PersonSearch } from "@/components/PersonSearch";
import { Avatar, Badge, CheckPill, EmptyState, Field, Modal } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { APP_CATEGORIES, LOGO_SHAPES, type AppCategory, type AppMaintainer, type LogoShape, type AppStatus, type PortalApp } from "@/lib/types";
import { cn, hexToRgba, initials, isVideoSrc, normalise, uid } from "@/lib/utils";

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
  const [coverError, setCoverError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

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

  const setMaintainer = (m: AppMaintainer | null) => patch({ maintainer: m });
  const patchMaintainer = (p: Partial<AppMaintainer>) =>
    setDraft((d) =>
      d ? { ...d, maintainer: { name: "", email: "", ...(d.maintainer ?? {}), ...p } } : d,
    );
  /** Pick a maintainer straight from the central directory. */
  const applyMaintainer = (p: DirectoryPerson) =>
    setMaintainer({
      name: (p.name || p.en_name || "").replace(/\s*\(.*\)\s*$/, "").trim() || p.name || "",
      email: p.email || "",
      avatarUrl: p.avatar_url || null,
      title: p.job_title || p.departments?.[0] || "",
    });

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ logoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  // Cover accepts an image or a (looping) video. Uploaded files are embedded as
  // data URLs, so we cap the size — big clips are better pasted as a hosted URL.
  const COVER_MAX_MB = { image: 4, video: 12 };
  const onCoverFile = (file?: File) => {
    if (!file) return;
    setCoverError(null);
    const isVideo = file.type.startsWith("video");
    const isImage = file.type.startsWith("image");
    if (!isVideo && !isImage) {
      setCoverError(t.apps.coverBadType);
      return;
    }
    const limit = (isVideo ? COVER_MAX_MB.video : COVER_MAX_MB.image) * 1024 * 1024;
    if (file.size > limit) {
      setCoverError(
        t.apps.coverTooBig.replace("{mb}", String(isVideo ? COVER_MAX_MB.video : COVER_MAX_MB.image)),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ coverUrl: String(reader.result) });
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

              <Field label={t.common.description} hint={t.apps.descHint}>
                <textarea
                  className="input h-16 resize-none py-2.5"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder={t.apps.descPlaceholder}
                />
              </Field>

              <Field label={t.apps.longDescription} hint={t.apps.longDescHint}>
                <textarea
                  className="input h-28 resize-y py-2.5 leading-relaxed"
                  value={draft.longDescription ?? ""}
                  onChange={(e) => patch({ longDescription: e.target.value })}
                  placeholder={t.apps.longDescPlaceholder}
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

              {/* ── maintainer / contact ─────────────────── */}
              <div>
                <p className="label flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 text-ink-mute" />
                  {t.apps.maintainer}
                </p>
                {draft.maintainer ? (
                  <div className="rounded-xl border border-line bg-canvas/50 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={draft.maintainer.name || "?"}
                        src={draft.maintainer.avatarUrl}
                        size={40}
                        color={draft.color}
                      />
                      <input
                        className="input h-9 flex-1 text-[13px] font-semibold"
                        value={draft.maintainer.name}
                        onChange={(e) => patchMaintainer({ name: e.target.value })}
                        placeholder={t.common.name}
                      />
                      <button
                        onClick={() => setMaintainer(null)}
                        className="rounded-lg p-1.5 text-ink-mute transition hover:bg-surface hover:text-rose-600"
                        title={t.apps.remove}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <input
                        className="input h-9 text-[12.5px]"
                        value={draft.maintainer.title ?? ""}
                        onChange={(e) => patchMaintainer({ title: e.target.value })}
                        placeholder={t.apps.maintainerTitlePlaceholder}
                      />
                      <input
                        className="input h-9 text-[12.5px]"
                        value={draft.maintainer.email}
                        onChange={(e) => patchMaintainer({ email: e.target.value })}
                        placeholder="email@company.com"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <PersonSearch onPickPerson={applyMaintainer} placeholder={t.apps.maintainerSearch} />
                    <button
                      onClick={() => setMaintainer({ name: "", email: "" })}
                      className="mt-2 text-[11.5px] font-semibold text-ink-mute transition hover:text-ink"
                    >
                      + {t.apps.maintainerManual}
                    </button>
                  </>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mute">{t.apps.maintainerHint}</p>
              </div>

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

            {/* ── live preview — the real card, so every layout is accurate ── */}
            <div className="space-y-4">
              <p className="label">{t.apps.preview}</p>
              <div className="pointer-events-none rounded-2xl border border-dashed border-line bg-canvas/40 p-3">
                <AppTile
                  app={{ ...draft, name: draft.name || "New App" }}
                  allowed
                  pinned={false}
                  onPin={() => {}}
                  onLaunch={() => {}}
                  onDetails={() => {}}
                />
              </div>

              <div>
                <p className="label">{t.apps.logoShape}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {LOGO_SHAPES.map((sh) => {
                    const active = (draft.logoShape ?? "rounded") === sh;
                    const label =
                      sh === "rounded" ? t.apps.shapeRounded : sh === "circle" ? t.apps.shapeCircle : t.apps.shapeLandscape;
                    return (
                      <button
                        key={sh}
                        onClick={() => patch({ logoShape: sh as LogoShape })}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border p-3 transition",
                          active ? "border-brand-500 bg-brand-50/60 dark:bg-brand-500/10" : "border-line hover:border-brand-300",
                        )}
                      >
                        {/* live glyph of the logo shape, in the app colour */}
                        <span
                          className="flex items-center justify-center font-display text-[11px] font-bold text-white"
                          style={{
                            width: sh === "landscape" ? 38 : 30,
                            height: 30,
                            borderRadius: sh === "circle" ? 9999 : 9,
                            background: draft.color,
                          }}
                        >
                          {(draft.shortName || initials(draft.name || "App")).slice(0, 2)}
                        </span>
                        <span className={cn("text-[11px] font-semibold", active ? "text-ink" : "text-ink-mute")}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mute">{t.apps.logoShapeHint}</p>
              </div>

              <div>
                <p className="label">{t.apps.coverImage}</p>
                <input
                  className="input mb-2"
                  placeholder="https://…/cover.mp4 · .jpg"
                  value={draft.coverUrl && !draft.coverUrl.startsWith("data:") ? draft.coverUrl : ""}
                  onChange={(e) => {
                    setCoverError(null);
                    patch({ coverUrl: e.target.value || null });
                  }}
                />
                <div className="flex gap-2">
                  <button onClick={() => coverRef.current?.click()} className="btn-ghost btn-sm flex-1">
                    <Upload className="h-3.5 w-3.5" />
                    {t.apps.coverUpload}
                  </button>
                  {draft.coverUrl && (
                    <button
                      onClick={() => {
                        setCoverError(null);
                        patch({ coverUrl: null });
                      }}
                      className="btn-ghost btn-sm"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {t.apps.remove}
                    </button>
                  )}
                </div>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) => onCoverFile(e.target.files?.[0])}
                />
                {coverError && (
                  <p className="mt-2 text-[11.5px] font-medium text-rose-600 dark:text-rose-400">{coverError}</p>
                )}
                {draft.coverUrl?.startsWith("data:") && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {isVideoSrc(draft.coverUrl) ? t.apps.coverVideoReady : t.apps.coverImageReady}
                  </p>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mute">{t.apps.coverHint}</p>
              </div>

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
