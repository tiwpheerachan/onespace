"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Clock,
  Info,
  LayoutGrid,
  Lock,
  Pin,
  Rows3,
  SearchX,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppDetail } from "@/components/AppDetail";
import { AppLogo } from "@/components/AppLogo";
import { AppTile } from "@/components/AppTile";
import { Badge, EmptyState, SectionTitle } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { APP_CATEGORIES, type AppCategory, type PortalApp } from "@/lib/types";
import { cn, normalise, relativeTime } from "@/lib/utils";

type View = "grid" | "list";

export default function DashboardPage() {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const {
    apps,
    roles,
    users,
    currentUser,
    currentRole,
    canOpen,
    favourites,
    toggleFavourite,
    recents,
    clearRecents,
  } = usePortal();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AppCategory | "all">("all");
  const [view, setView] = useState<View>("grid");
  const [detailApp, setDetailApp] = useState<PortalApp | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.dash.morning : hour < 18 ? t.dash.afternoon : t.dash.evening;

  const visible = useMemo(() => {
    const q = normalise(query.trim());
    return apps
      .filter((a) => (category === "all" ? true : a.category === category))
      .filter((a) =>
        q
          ? normalise(`${a.name} ${a.description} ${a.owner} ${a.category} ${a.shortName}`).includes(q)
          : true,
      )
      .sort((a, b) => {
        const fa = favourites.includes(a.id) ? 0 : 1;
        const fb = favourites.includes(b.id) ? 0 : 1;
        return fa - fb || a.sortOrder - b.sortOrder;
      });
  }, [apps, category, query, favourites]);

  const accessible = apps.filter(canOpen);
  const pinned = apps.filter((a) => favourites.includes(a.id));
  const recentApps = recents
    .map((r) => ({ app: apps.find((a) => a.id === r.appId), at: r.at }))
    .filter((r): r is { app: PortalApp; at: string } => Boolean(r.app));

  // Open apps inside the portal's own framed viewer instead of a new tab.
  const launch = (app: PortalApp) => {
    router.push(`/app/${app.id}`);
  };

  const stats = [
    { label: t.dash.statApps, value: accessible.length, icon: LayoutGrid },
    { label: t.dash.statPinned, value: pinned.length, icon: Pin },
    { label: t.dash.statUsers, value: users.filter((u) => u.status === "active").length, icon: UsersIcon },
    { label: t.dash.statUptime, value: "99.9%", icon: Activity },
  ];

  return (
    <div className="space-y-10">
      {/* ── hero ───────────────────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-end justify-between gap-5"
        >
          <div>
            <p className="mb-2.5 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-soft">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {currentRole?.name}
            </p>
            <h1 className="heading text-[clamp(1.6rem,2.6vw,2.15rem)] leading-tight text-ink">
              {greeting}, {currentUser?.name?.split(" ")[0]}
              <span className="ml-2.5 inline-block origin-[70%_75%] animate-wave">👋</span>
            </h1>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">{t.dash.subtitle}</p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            {(["grid", "list"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition",
                  view === v ? "text-ink" : "text-ink-mute hover:text-ink-soft",
                )}
              >
                {view === v && (
                  <motion.span
                    layoutId="view-toggle"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-canvas"
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {v === "grid" ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
                  {v === "grid" ? t.dash.grid : t.dash.list}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4"
        >
          {stats.map((s, i) => (
            <div key={s.label} className="group relative bg-surface p-5 transition-colors hover:bg-canvas/50">
              <span className="absolute left-0 top-0 h-px w-8 bg-ink/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-center justify-between text-ink-mute">
                <s.icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                <span className="font-mono text-[10px] tabular-nums tracking-wider">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-5 font-mono text-[28px] font-medium leading-none tracking-tight text-ink tabular-nums">
                {s.value}
              </p>
              <p className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.13em] text-ink-mute">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── pinned ─────────────────────────────────────── */}
      <AnimatePresence>
        {pinned.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <SectionTitle icon={<Pin className="h-4 w-4" />} title={t.dash.favorites} count={pinned.length} />
            <div className="flex flex-wrap gap-2.5">
              {pinned.map((app) => (
                <motion.button
                  key={app.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  whileHover={{ y: -3 }}
                  onClick={() => canOpen(app) && launch(app)}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-surface py-2.5 pl-2.5 pr-4 shadow-card transition-shadow hover:shadow-lift"
                >
                  <AppLogo app={app} size={36} radius={11} />
                  <span className="text-left">
                    <span className="block text-[13px] font-semibold text-ink">{app.name}</span>
                    <span className="block text-[11px] text-ink-mute">{t.cat[app.category]}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-ink-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── recent ─────────────────────────────────────── */}
      {recentApps.length > 0 && (
        <section>
          <SectionTitle
            icon={<Clock className="h-4 w-4" />}
            title={t.dash.recent}
            count={recentApps.length}
            action={
              <button
                onClick={clearRecents}
                className="text-[12px] font-semibold text-ink-mute transition hover:text-ink"
              >
                {t.dash.clearRecent}
              </button>
            }
          />
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {recentApps.map(({ app, at }) => (
              <button
                key={app.id}
                onClick={() => canOpen(app) && launch(app)}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition hover:border-brand-300"
              >
                <AppLogo app={app} size={32} radius={10} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">{app.name}</span>
                  <span className="block text-[11px] text-ink-mute">
                    {t.dash.openedAt} {relativeTime(at, locale)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── catalogue ──────────────────────────────────── */}
      <section>
        <div className="mb-5 flex flex-col gap-3">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dash.searchPlaceholder}
              className="input h-12 pl-11 pr-10 text-[14px]"
            />
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategory("all")}
              className={cn("chip", category === "all" && "chip-active")}
            >
              {t.dash.categoryAll}
              <span className="opacity-60">{apps.length}</span>
            </button>
            {APP_CATEGORIES.map((c) => {
              const n = apps.filter((a) => a.category === c).length;
              if (!n) return null;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn("chip", category === c && "chip-active")}
                >
                  {t.cat[c]}
                  <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <SectionTitle
          icon={<LayoutGrid className="h-4 w-4" />}
          title={t.dash.allApps}
          count={`${visible.length} ${t.common.of} ${apps.length}`}
        />

        {visible.length === 0 ? (
          <EmptyState icon={<SearchX className="h-6 w-6" />} title={t.dash.empty} body={t.dash.emptyHint} />
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((app, i) => (
              <AppTile
                key={app.id}
                app={app}
                index={i}
                allowed={canOpen(app)}
                pinned={favourites.includes(app.id)}
                onPin={() => toggleFavourite(app.id)}
                onLaunch={() => launch(app)}
                onDetails={() => setDetailApp(app)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {visible.map((app, i) => {
              const allowed = canOpen(app);
              return (
                <motion.div
                  key={app.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => (allowed ? launch(app) : setDetailApp(app))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      allowed ? launch(app) : setDetailApp(app);
                    }
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 14) * 0.025 }}
                  className="group flex cursor-pointer items-center gap-4 border-b border-line px-4 py-3.5 outline-none transition last:border-0 hover:bg-canvas/60 focus-visible:bg-canvas/60"
                >
                  <AppLogo app={app} size={40} radius={12} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{app.name}</p>
                      {!allowed && <Lock className="h-3.5 w-3.5 shrink-0 text-ink-mute" />}
                      <Badge tone={app.status}>{t.status[app.status]}</Badge>
                    </div>
                    <p className="truncate text-[12px] text-ink-mute">{app.description}</p>
                  </div>
                  <span className="hidden w-32 shrink-0 text-[12px] text-ink-mute md:block">
                    {t.cat[app.category]}
                  </span>
                  <span className="hidden w-24 shrink-0 truncate font-mono text-[11px] text-ink-mute lg:block">
                    v{app.version}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(app.id);
                    }}
                    title={favourites.includes(app.id) ? t.dash.unpin : t.dash.pin}
                    className={cn(
                      "rounded-lg p-1.5 transition",
                      favourites.includes(app.id)
                        ? "text-brand-600"
                        : "text-ink-mute opacity-0 group-hover:opacity-100",
                    )}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailApp(app);
                    }}
                    title={t.dash.details}
                    className="shrink-0 rounded-lg p-1.5 text-ink-mute transition hover:bg-surface hover:text-ink"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  {allowed ? (
                    <span className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-brand-600 sm:flex">
                      {t.dash.launch}
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  ) : (
                    <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[12px] font-semibold text-ink-mute sm:flex">
                      <Lock className="h-3.5 w-3.5" />
                      {t.dash.locked}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <AppDetail
        app={detailApp}
        allowed={detailApp ? canOpen(detailApp) : false}
        roles={roles}
        onClose={() => setDetailApp(null)}
        onLaunch={(a) => {
          launch(a);
          setDetailApp(null);
        }}
      />
    </div>
  );
}
