"use client";

import { motion } from "framer-motion";
import { Database, Languages, Moon, Palette, RotateCcw, Sun, UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, Badge } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { LANG_META, LANGS } from "@/lib/i18n/dictionaries";
import { usePrefs } from "@/lib/i18n/provider";
import { SUPABASE_URL } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function Card({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="rounded-2xl border border-line bg-surface p-6 shadow-card"
    >
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink-soft">
          {icon}
        </span>
        <h2 className="heading text-[14.5px] text-ink">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const { currentUser, currentRole, supabaseReady, resetDemo, apps, users, roles } = usePortal();

  return (
    <>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={<UserCircle2 className="h-4 w-4" />} title={t.settings.profile}>
          <div className="flex items-center gap-4">
            <Avatar
              name={currentUser?.name ?? "?"}
              src={currentUser?.avatarUrl}
              size={64}
              color={currentRole?.color}
            />
            <div className="min-w-0">
              <p className="heading text-[16px] text-ink">{currentUser?.name}</p>
              <p className="truncate text-[12.5px] text-ink-mute">{currentUser?.email}</p>
              <p
                className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={{ background: `${currentRole?.color}1a`, color: currentRole?.color }}
              >
                {currentRole?.name}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5 text-[12.5px]">
            <div>
              <dt className="text-ink-mute">{t.common.department}</dt>
              <dd className="mt-0.5 font-medium text-ink">{currentUser?.department || "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-mute">{t.common.permissions}</dt>
              <dd className="mt-0.5 font-medium text-ink">{currentRole?.permissions.length}</dd>
            </div>
          </dl>
        </Card>

        <Card icon={<Palette className="h-4 w-4" />} title={t.settings.appearance} delay={0.06}>
          <p className="label">{t.common.theme}</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                  theme === mode ? "border-brand-400 bg-brand-50/60 dark:bg-brand-500/10" : "border-line hover:border-brand-200",
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-ink-soft">
                  {mode === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </span>
                <span className="text-[13px] font-semibold text-ink">
                  {mode === "light" ? t.common.light : t.common.dark}
                </span>
              </button>
            ))}
          </div>

          <p className="label">
            <Languages className="mr-1 inline h-3.5 w-3.5" />
            {t.common.language}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition",
                  l === lang ? "border-brand-400 bg-brand-50/60 text-ink dark:bg-brand-500/10" : "border-line text-ink-soft hover:border-brand-200",
                )}
              >
                <span className="mr-1.5">{LANG_META[l].flag}</span>
                {LANG_META[l].native}
              </button>
            ))}
          </div>
        </Card>

        <Card icon={<Database className="h-4 w-4" />} title={t.settings.connection} delay={0.12}>
          <div className="flex items-center gap-3">
            <Badge tone={supabaseReady ? "active" : "maintenance"}>
              {supabaseReady ? t.settings.connected : t.settings.notConnected}
            </Badge>
          </div>
          {supabaseReady ? (
            <p className="mt-4 break-all rounded-xl border border-line bg-canvas/60 px-3.5 py-2.5 font-mono text-[11.5px] text-ink-soft">
              {SUPABASE_URL}
            </p>
          ) : (
            <p className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {t.demo.body}
            </p>
          )}
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
            {[
              { label: t.nav.apps, value: apps.length },
              { label: t.nav.users, value: users.length },
              { label: t.nav.roles, value: roles.length },
            ].map((s) => (
              <div key={s.label}>
                <p className="heading text-[20px] leading-none text-ink">{s.value}</p>
                <p className="mt-1 text-[11px] text-ink-mute">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {!supabaseReady && (
          <Card icon={<RotateCcw className="h-4 w-4" />} title={t.settings.danger} delay={0.18}>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">{t.demo.title}</p>
            <button onClick={resetDemo} className="btn-ghost btn-sm mt-4">
              <RotateCcw className="h-3.5 w-3.5" />
              {t.demo.reset}
            </button>
          </Card>
        )}
      </div>
    </>
  );
}
