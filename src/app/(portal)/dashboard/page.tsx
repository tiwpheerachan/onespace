"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
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
import { useOneloginApps } from "@/lib/onelogin-apps";
import { type PortalApp } from "@/lib/types";
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
    canOpen,
    favourites,
    toggleFavourite,
    recents,
    clearRecents,
    trackExternalLaunch,
    launchUrl,
    can,
  } = usePortal();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("grid");
  const [detailApp, setDetailApp] = useState<PortalApp | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.dash.morning : hour < 18 ? t.dash.afternoon : t.dash.evening;

  // แอป Onelogin ของคนนี้ (สด จาก /api/v1/apps/mine) วาดเป็นไทล์แคตตาล็อกเลย เพื่อรวม
  // อยู่ใน "แอปทั้งหมด" ชุดเดียว — ไม่มีบล็อกแยกข้างบนแล้ว · เปิดแท็บใหม่เสมอ (หน้าล็อกอิน
  // Onelogin เปิดใน iframe ไม่ได้) · ไม่ปัก/ไม่มีรายละเอียด เพราะอยู่ที่ Onelogin ไม่ใช่
  // แคตตาล็อกเรา · กันซ้ำกับแอป catalogue ที่ผูก Onelogin (oneloginAppId) ไว้แล้ว
  const oneloginApps = useOneloginApps();
  const oneloginAsApps = useMemo<PortalApp[]>(() => {
    const linked = new Set(apps.map((a) => a.oneloginAppId).filter(Boolean));
    return oneloginApps
      .filter((a) => !linked.has(a.id))
      .map((a, i): PortalApp => ({
        id: `onelogin-${a.id}`,
        name: a.name,
        shortName: "",
        description: a.description,
        url: a.url,
        logoUrl: a.logo,
        color: a.color,
        category: "it", // ไม่มีหมวดจริง — ค่านี้ไม่เคยถูกโชว์ (caption ทับ · ตัดออกจากชิปหมวด)
        status: a.status === false ? "offline" : "active",
        roles: [],
        owner: a.ownerName ?? "",
        version: "",
        sortOrder: -1000 + i, // ลอยขึ้นหัวกริด
        createdAt: "",
        coverUrl: a.cover,
        logoShape: a.logoShape === "circle" ? "circle" : a.logoShape === "wide" ? "landscape" : "rounded",
        maintainer: a.ownerName ? { name: a.ownerName, email: "", avatarUrl: a.ownerAvatar } : null,
        openInNewTab: true,
        oneloginAppId: a.id,
      }));
  }, [oneloginApps, apps]);

  // ระบุไทล์ Onelogin จาก id ที่เราตั้ง — เปิดแท็บใหม่ · ไม่ปัก/ไม่มีรายละเอียด
  const isOnelogin = (a: PortalApp) => typeof a.id === "string" && a.id.startsWith("onelogin-");
  // ไทล์ Onelogin ที่ไม่มีสิทธิ์ (allowed=false) โผล่ให้เห็นแต่เป็นไทล์ล็อก — เจ้าของ 25 พ.ย. 2569
  const lockedOnelogin = useMemo(
    () => new Set(oneloginApps.filter((a) => !a.allowed).map((a) => `onelogin-${a.id}`)),
    [oneloginApps],
  );
  const openable = (a: PortalApp) => (isOnelogin(a) ? !lockedOnelogin.has(String(a.id)) : canOpen(a));

  // "แอปทั้งหมด" = แอป Onelogin ของคนนี้ + แคตตาล็อกของเรา ชุดเดียว
  const catalogue = useMemo(() => [...oneloginAsApps, ...apps], [oneloginAsApps, apps]);

  const visible = useMemo(() => {
    const q = normalise(query.trim());
    return catalogue
      .filter((a) =>
        q ? normalise(`${a.name} ${a.description} ${a.owner} ${a.category} ${a.shortName}`).includes(q) : true,
      )
      .sort((a, b) => {
        const fa = favourites.includes(a.id) ? 0 : 1;
        const fb = favourites.includes(b.id) ? 0 : 1;
        return fa - fb || a.sortOrder - b.sortOrder;
      });
  }, [catalogue, query, favourites]);

  // รวมแอป Onelogin ด้วย (catalogue = apps + Onelogin) — favourites เก็บใน localStorage จึงปักได้ทุกชนิด
  const pinned = catalogue.filter((a) => favourites.includes(a.id));
  const recentApps = recents
    .map((r) => ({ app: apps.find((a) => a.id === r.appId), at: r.at }))
    .filter((r): r is { app: PortalApp; at: string } => Boolean(r.app));

  // Open apps inside the portal's own framed viewer instead of a new tab — except
  // apps flagged openInNewTab (Onelogin login refuses to be framed). window.open must
  // run inside this click, or the popup blocker eats it, so it can't wait for the viewer.
  const launch = (app: PortalApp) => {
    if (!openable(app)) return;
    // ไทล์ Onelogin: เปิด url ตรง ๆ แท็บใหม่ · trackExternalLaunch บันทึก launch (ให้ insights/
    // performance เห็น) แต่ไม่ลงรายการล่าสุด เพราะ id "onelogin-*" ไม่มีในแคตตาล็อก
    if (isOnelogin(app)) {
      trackExternalLaunch(app);
      window.open(app.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (app.openInNewTab) {
      trackExternalLaunch(app);
      window.open(launchUrl(app), "_blank", "noopener,noreferrer");
      return;
    }
    router.push(`/app/${app.id}`);
  };

  // "เข้าถึงได้" = แคตตาล็อกที่มีสิทธิ์ + แอป Onelogin ที่ไม่ล็อก — ตรงกับไทล์ที่เห็นจริง
  const openableApps = catalogue.filter(openable);
  const scrollToCatalogue = () =>
    document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const stats = [
    {
      label: t.dash.statApps,
      value: openableApps.length,
      icon: LayoutGrid,
      chip: "bg-brand-500 text-white",
      link: "text-brand-600 hover:text-brand-700 dark:text-brand-400",
      linkLabel: t.dash.statViewAll,
      onLink: scrollToCatalogue,
    },
    {
      label: t.dash.statPinned,
      value: pinned.length,
      icon: Pin,
      chip: "bg-amber-500 text-white",
      link: "text-amber-600 hover:text-amber-700 dark:text-amber-400",
      linkLabel: t.dash.statManagePins,
      onLink: scrollToCatalogue,
    },
    {
      label: t.dash.statUsers,
      value: users.filter((u) => u.status === "active").length,
      icon: UsersIcon,
      chip: "bg-emerald-500 text-white",
      link: "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
      linkLabel: t.dash.statViewInsights,
      onLink: can("audit.view") ? () => router.push("/admin/insights") : null,
    },
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
            <h1 className="heading text-[clamp(1.6rem,2.6vw,2.15rem)] leading-tight text-ink">
              {greeting}, {currentUser?.name?.split(" ")[0]}
              <span className="ml-2.5 inline-block origin-[70%_75%] animate-wave">👋</span>
            </h1>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">{t.dash.subtitle}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105",
                    s.chip,
                  )}
                >
                  <s.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-ink-mute">{s.label}</p>
                  <p className="mt-0.5 font-mono text-[27px] font-bold leading-tight tracking-tight text-ink tabular-nums">
                    {s.value}
                  </p>
                </div>
              </div>
              {s.onLink && (
                <button
                  type="button"
                  onClick={s.onLink}
                  className={cn(
                    "group/link mt-4 inline-flex items-center gap-1 self-start text-[12.5px] font-semibold transition",
                    s.link,
                  )}
                >
                  {s.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
                </button>
              )}
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
                  onClick={() => openable(app) && launch(app)}
                  className="group flex items-center gap-3 rounded-2xl border border-line bg-surface py-2.5 pl-2.5 pr-4 shadow-card transition-shadow hover:shadow-lift"
                >
                  <AppLogo app={app} size={36} radius={11} />
                  <span className="text-left">
                    <span className="block text-[13px] font-semibold text-ink">{app.name}</span>
                    <span className="block text-[11px] text-ink-mute">
                      {isOnelogin(app)
                        ? app.url.replace(/^https?:\/\//, "").replace(/\/$/, "")
                        : t.cat[app.category]}
                    </span>
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
                className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
              >
                <AppLogo app={app} size={32} radius={10} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">{app.name}</span>
                  <span className="block text-[11px] text-ink-mute">
                    {t.dash.openedAt} {relativeTime(at, locale)}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── catalogue (รวมแอป Onelogin ของคนนี้ไว้ด้วย) ──── */}
      <section id="catalogue" className="scroll-mt-24">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dash.searchPlaceholder}
              className="input h-12 pl-11 pr-10 text-[14px] shadow-card"
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

          <div className="flex h-12 shrink-0 items-center gap-1 self-stretch rounded-xl border border-line bg-surface p-1 shadow-card sm:self-auto">
            {(["grid", "list"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition sm:flex-none",
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
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={<SearchX className="h-6 w-6" />} title={t.dash.empty} body={t.dash.emptyHint} />
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((app, i) => {
              const ol = isOnelogin(app);
              return (
                <AppTile
                  key={app.id}
                  app={app}
                  index={i}
                  allowed={openable(app)}
                  pinned={favourites.includes(app.id)}
                  onPin={() => toggleFavourite(app.id)}
                  onLaunch={() => launch(app)}
                  onDetails={() => setDetailApp(app)}
                  caption={ol ? app.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : undefined}
                />
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {visible.map((app, i) => {
              const ol = isOnelogin(app);
              const allowed = openable(app);
              const open = () => (allowed ? launch(app) : setDetailApp(app));
              return (
                <motion.div
                  key={app.id}
                  role="button"
                  tabIndex={0}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open();
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
                      {allowed && <Badge tone={app.status}>{t.status[app.status]}</Badge>}
                    </div>
                    <p className="truncate text-[12px] text-ink-mute">{app.description}</p>
                  </div>
                  <span className="hidden w-32 shrink-0 truncate text-[12px] text-ink-mute md:block">
                    {ol ? app.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : t.cat[app.category]}
                  </span>
                  <span className="hidden w-24 shrink-0 truncate font-mono text-[11px] text-ink-mute lg:block">
                    {app.version && `v${app.version}`}
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
        allowed={detailApp ? openable(detailApp) : false}
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
