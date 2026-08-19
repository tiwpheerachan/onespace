"use client";

import { motion } from "framer-motion";
import { Check, Lock, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Confirm } from "@/components/Confirm";
import { PageHeader } from "@/components/PageHeader";
import { CheckPill, Field, Modal } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { ALL_PERMISSIONS, type Permission, type Role } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const SWATCHES = ["#1f43e6", "#0d9488", "#7c3aed", "#e11d48", "#ea580c", "#0284c7", "#d09b3e", "#64748b"];

export default function AdminRolesPage() {
  const { t } = usePrefs();
  const { roles, users, apps, saveRole, deleteRole } = usePortal();
  const [draft, setDraft] = useState<Role | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  const patch = (p: Partial<Role>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const openNew = () =>
    setDraft({
      id: uid("role"),
      key: "",
      name: "",
      description: "",
      color: "#1f43e6",
      permissions: ["portal.view", "app.launch"],
      system: false,
    });

  return (
    <>
      <PageHeader
        title={t.roles.title}
        subtitle={t.roles.subtitle}
        action={
          <button onClick={openNew} className="btn-primary">
            <Plus className="h-4 w-4" />
            {t.roles.new}
          </button>
        }
      />

      {/* ── role cards ─────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role, i) => {
          const members = users.filter((u) => u.roleKey === role.key).length;
          const reach = apps.filter((a) => !a.roles.length || a.roles.includes(role.key)).length;
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.45 }}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-lift"
            >
              <span
                className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ background: role.color }}
              />
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                  style={{ background: `linear-gradient(140deg, ${role.color}, ${role.color}aa)` }}
                >
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => setDraft({ ...role })}
                    className="rounded-lg p-2 text-ink-mute transition hover:bg-canvas hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!role.system && (
                    <button
                      onClick={() => setPendingDelete(role)}
                      className="rounded-lg p-2 text-ink-mute transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h3 className="heading text-[15px] text-ink">{role.name}</h3>
                  {role.system && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-semibold text-ink-mute">
                      <Lock className="h-2.5 w-2.5" />
                      {t.roles.systemRole}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[11.5px] text-ink-mute">{role.key}</p>
                <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">
                  {role.description}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {role.permissions.slice(0, 4).map((p) => (
                  <span key={p} className="chip">
                    {t.perm[p]}
                  </span>
                ))}
                {role.permissions.length > 4 && (
                  <span className="chip">+{role.permissions.length - 4}</span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
                <div>
                  <p className="heading text-[18px] leading-none text-ink">{members}</p>
                  <p className="mt-1 text-[11px] text-ink-mute">{t.roles.members}</p>
                </div>
                <div>
                  <p className="heading text-[18px] leading-none text-ink">{reach}</p>
                  <p className="mt-1 text-[11px] text-ink-mute">{t.nav.apps}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── permission matrix ──────────────────────────── */}
      <section className="mt-10">
        <h2 className="heading mb-4 text-[15px] text-ink">{t.roles.matrix}</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                  {t.common.permissions}
                </th>
                {roles.map((r) => (
                  <th key={r.id} className="px-4 py-3 text-center text-[11.5px] font-semibold text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((p) => (
                <tr key={p} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-[12.5px] font-medium text-ink-soft">{t.perm[p]}</td>
                  {roles.map((r) => {
                    const on = r.permissions.includes(p);
                    return (
                      <td key={r.id} className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            saveRole({
                              ...r,
                              permissions: on
                                ? r.permissions.filter((x) => x !== p)
                                : [...r.permissions, p],
                            })
                          }
                          className={cn(
                            "mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition",
                            on ? "border-transparent text-white" : "border-line hover:border-brand-300",
                          )}
                          style={on ? { background: r.color } : undefined}
                        >
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── editor ─────────────────────────────────────── */}
      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={t.roles.edit}
        subtitle={draft?.name || undefined}
        width="max-w-2xl"
        footer={
          <>
            <button onClick={() => setDraft(null)} className="btn-ghost btn-sm">
              {t.common.cancel}
            </button>
            <button
              onClick={async () => {
                if (!draft?.name.trim() || !draft.key.trim()) return;
                await saveRole(draft);
                setDraft(null);
              }}
              className="btn-primary btn-sm"
            >
              {t.common.saveChanges}
            </button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.common.name}>
                <input className="input" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
              </Field>
              <Field label={t.roles.key} hint={t.roles.keyHint}>
                <input
                  className="input font-mono"
                  value={draft.key}
                  disabled={draft.system}
                  onChange={(e) => patch({ key: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
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

            <div>
              <p className="label">{t.common.permissions}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_PERMISSIONS.map((p) => (
                  <CheckPill
                    key={p}
                    color={draft.color}
                    checked={draft.permissions.includes(p)}
                    onChange={(v) =>
                      patch({
                        permissions: v
                          ? [...draft.permissions, p]
                          : draft.permissions.filter((x) => x !== p),
                      })
                    }
                    label={t.perm[p as Permission]}
                    description={p}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={Boolean(pendingDelete)}
        title={t.roles.deleteTitle}
        body={t.roles.deleteBody}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteRole(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
