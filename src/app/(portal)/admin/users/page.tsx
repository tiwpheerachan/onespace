"use client";

import { motion } from "framer-motion";
import { Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Confirm } from "@/components/Confirm";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, Badge, EmptyState, Field, Modal } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import type { PortalUser, UserStatus } from "@/lib/types";
import { formatDateTime, normalise, uid } from "@/lib/utils";

const STATUSES: UserStatus[] = ["active", "invited", "suspended"];

export default function AdminUsersPage() {
  const { t, locale } = usePrefs();
  const { users, roles, saveUser, deleteUser } = usePortal();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<PortalUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PortalUser | null>(null);

  const filtered = useMemo(() => {
    const q = normalise(query.trim());
    return users.filter((u) =>
      q ? normalise(`${u.name} ${u.email} ${u.department} ${u.roleKey}`).includes(q) : true,
    );
  }, [users, query]);

  const patch = (p: Partial<PortalUser>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const openNew = () =>
    setDraft({
      id: uid("u"),
      name: "",
      email: "",
      avatarUrl: null,
      roleKey: roles[roles.length - 1]?.key ?? "staff",
      department: "",
      status: "invited",
      lastLogin: null,
    });

  return (
    <>
      <PageHeader
        title={t.users.title}
        subtitle={t.users.subtitle}
        action={
          <button onClick={openNew} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            {t.users.new}
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
          {filtered.length} {t.users.count}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={t.common.noResults} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_1.1fr_1.1fr_1fr_auto] gap-4 border-b border-line bg-canvas/60 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-mute lg:grid">
            <span>{t.common.name}</span>
            <span>{t.common.role}</span>
            <span>{t.common.department}</span>
            <span>{t.common.lastLogin}</span>
            <span className="text-right">{t.common.actions}</span>
          </div>

          {filtered.map((u, i) => {
            const role = roles.find((r) => r.key === u.roleKey);
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 14) * 0.025 }}
                className="grid grid-cols-1 items-center gap-4 border-b border-line px-5 py-4 transition last:border-0 hover:bg-canvas/50 lg:grid-cols-[minmax(0,2.2fr)_1.1fr_1.1fr_1fr_auto]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <Avatar name={u.name} src={u.avatarUrl} size={40} color={role?.color} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{u.name}</p>
                      {u.status !== "active" && <Badge tone={u.status}>{t.status[u.status]}</Badge>}
                    </div>
                    <p className="truncate text-[11.5px] text-ink-mute">{u.email}</p>
                  </div>
                </div>

                <span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                    style={{ background: `${role?.color ?? "#64748b"}1a`, color: role?.color ?? "#64748b" }}
                  >
                    {role?.name ?? u.roleKey}
                  </span>
                </span>

                <span className="text-[12.5px] text-ink-soft">{u.department || "—"}</span>
                <span className="text-[12px] text-ink-mute">
                  {formatDateTime(u.lastLogin, locale) ?? t.common.never}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setDraft({ ...u })}
                    className="rounded-lg p-2 text-ink-mute transition hover:bg-canvas hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPendingDelete(u)}
                    className="rounded-lg p-2 text-ink-mute transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={t.users.edit}
        subtitle={draft?.email || undefined}
        width="max-w-xl"
        footer={
          <>
            <button onClick={() => setDraft(null)} className="btn-ghost btn-sm">
              {t.common.cancel}
            </button>
            <button
              onClick={async () => {
                if (!draft?.name.trim() || !draft.email.trim()) return;
                await saveUser(draft);
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
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-canvas/60 p-4">
              <Avatar
                name={draft.name || "?"}
                src={draft.avatarUrl}
                size={56}
                color={roles.find((r) => r.key === draft.roleKey)?.color}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{draft.name || "—"}</p>
                <p className="truncate text-[12px] text-ink-mute">{draft.email || "—"}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.common.name}>
                <input className="input" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
              </Field>
              <Field label={t.common.email}>
                <input
                  className="input"
                  type="email"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>
              <Field label={t.common.role}>
                <select
                  className="input"
                  value={draft.roleKey}
                  onChange={(e) => patch({ roleKey: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.common.department}>
                <input
                  className="input"
                  value={draft.department}
                  onChange={(e) => patch({ department: e.target.value })}
                />
              </Field>
              <Field label={t.common.status}>
                <select
                  className="input"
                  value={draft.status}
                  onChange={(e) => patch({ status: e.target.value as UserStatus })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "active" ? t.status.active : t.status[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`${t.common.logo} URL`} hint={t.users.avatarHint}>
                <input
                  className="input"
                  value={draft.avatarUrl ?? ""}
                  onChange={(e) => patch({ avatarUrl: e.target.value || null })}
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={Boolean(pendingDelete)}
        title={t.users.deleteTitle}
        body={t.users.deleteBody}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteUser(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
