"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Check,
  ChevronDown,
  Clock,
  Layers,
  Rocket,
  Tag,
  TrendingUp,
  Trophy,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { AreaTrend, BarList, ColumnChart, Donut, type BarItem } from "@/components/Charts";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, EmptyState } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { APP_CATEGORIES, type AppCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = [7, 14, 30, 90];

/* ── multi-select filter dropdown ───────────────────────────────────────── */

function FilterMenu({
  label,
  icon,
  options,
  selected,
  onToggle,
  onClear,
  allLabel,
}: {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string; leading?: React.ReactNode }[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear: () => void;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    if (open) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const count = selected.size;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-semibold transition",
          count > 0
            ? "border-rose-400 bg-rose-50/70 text-ink dark:bg-rose-500/10"
            : "border-line bg-surface text-ink-soft hover:border-rose-300 hover:text-ink",
        )}
      >
        <span className="text-ink-mute">{icon}</span>
        {label}
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums",
            count > 0 ? "bg-rose-600 text-white" : "bg-canvas text-ink-mute",
          )}
        >
          {count > 0 ? count : allLabel}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-mute" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-40 mt-2 max-h-[320px] w-60 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lift"
          >
            {options.map((o) => {
              const on = selected.has(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => onToggle(o.value)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-canvas"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                      on ? "border-transparent bg-rose-600 text-white" : "border-line",
                    )}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {o.leading}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{o.label}</span>
                </button>
              );
            })}
            {count > 0 && (
              <button
                onClick={onClear}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-line py-2 text-[12px] font-semibold text-ink-mute transition hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
                {allLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Compact single-select used to scope one chart to a single app. */
function AppPicker({
  value,
  options,
  onChange,
  allLabel,
}: {
  value: string | null;
  options: { value: string; label: string; leading?: React.ReactNode }[];
  onChange: (v: string | null) => void;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    if (open) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const current = value ? options.find((o) => o.value === value) : null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 max-w-[190px] items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 text-[12px] font-semibold text-ink-soft transition hover:border-rose-300 hover:text-ink"
      >
        {current?.leading}
        <span className="truncate">{current ? current.label : allLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 max-h-[300px] w-56 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lift"
          >
            <button
              onClick={() => onChange(null)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-canvas",
                value === null ? "font-semibold text-ink" : "text-ink-soft",
              )}
            >
              {allLabel}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => onChange(o.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-canvas",
                  value === o.value ? "bg-canvas" : "",
                )}
              >
                {o.leading}
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{o.label}</span>
                {value === o.value && <Check className="h-3.5 w-3.5 shrink-0 text-rose-600" strokeWidth={3} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Panel({
  icon,
  title,
  sub,
  right,
  className,
  delay = 0,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className={`rounded-2xl border border-line bg-surface p-5 shadow-card ${className ?? ""}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink-soft">
            {icon}
          </span>
          <div>
            <h2 className="heading text-[14px] leading-tight text-ink">{title}</h2>
            {sub && <p className="text-[11.5px] text-ink-mute">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

export default function InsightsPage() {
  const { t, locale } = usePrefs();
  const { audit, apps, can } = usePortal();

  const [rangeDays, setRangeDays] = useState(14);
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [people, setPeople] = useState<Set<string>>(new Set());
  const [hourApp, setHourApp] = useState<string | null>(null);

  const appByName = useMemo(() => {
    const m = new Map<string, (typeof apps)[number]>();
    apps.forEach((a) => m.set(a.name, a));
    return m;
  }, [apps]);

  // every launch in the audit trail, with its parsed fields — the raw pool the
  // filter options and the windowed analytics are both derived from.
  const allLaunches = useMemo(
    () =>
      audit
        .filter((a) => a.action.startsWith("app.launch"))
        .map((a) => ({ actor: a.actor, target: a.target, at: new Date(a.at) })),
    [audit],
  );

  // filter options — stable regardless of the active range/selection
  const catOptions = useMemo(() => {
    const present = new Set<AppCategory>();
    allLaunches.forEach((l) => {
      const app = appByName.get(l.target);
      if (app) present.add(app.category);
    });
    return APP_CATEGORIES.filter((c) => present.has(c)).map((c) => ({ value: c, label: t.cat[c] }));
  }, [allLaunches, appByName, t]);

  const peopleOptions = useMemo(() => {
    const names = [...new Set(allLaunches.map((l) => l.actor))].sort();
    return names.map((n) => ({
      value: n,
      label: n,
      leading: <Avatar name={n} size={20} />,
    }));
  }, [allLaunches]);

  const data = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (rangeDays - 1));
    start.setHours(0, 0, 0, 0);

    const launches = allLaunches.filter((l) => {
      if (l.at < start || l.at > now) return false;
      if (cats.size) {
        const app = appByName.get(l.target);
        if (!app || !cats.has(app.category)) return false;
      }
      if (people.size && !people.has(l.actor)) return false;
      return true;
    });

    const total = launches.length;
    const byApp = new Map<string, number>();
    const byHour = Array.from({ length: 24 }, () => 0);
    const byHourApp = new Map<string, number[]>();
    const byUser = new Map<string, number>();
    const byCat = new Map<AppCategory, number>();
    const byDay = new Map<string, number>();

    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const todayKey = dayKey(now);
    let todayCount = 0;

    for (const l of launches) {
      const hh = l.at.getHours();
      byApp.set(l.target, (byApp.get(l.target) ?? 0) + 1);
      byHour[hh] += 1;
      let appHours = byHourApp.get(l.target);
      if (!appHours) {
        appHours = Array.from({ length: 24 }, () => 0);
        byHourApp.set(l.target, appHours);
      }
      appHours[hh] += 1;
      byUser.set(l.actor, (byUser.get(l.actor) ?? 0) + 1);
      const app = appByName.get(l.target);
      if (app) byCat.set(app.category, (byCat.get(app.category) ?? 0) + 1);
      const k = dayKey(l.at);
      byDay.set(k, (byDay.get(k) ?? 0) + 1);
      if (k === todayKey) todayCount += 1;
    }

    const days: { label: string; value: number; full: string }[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({
        label: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d),
        full: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(d),
        value: byDay.get(dayKey(d)) ?? 0,
      });
    }

    const peakHour = byHour.reduce((p, v, i) => (v > byHour[p] ? i : p), 0);

    return {
      total,
      todayCount,
      activeUsers: byUser.size,
      avgDay: Math.round(total / rangeDays),
      peakHour,
      days,
      byHour,
      byHourApp,
      topApps: [...byApp.entries()].sort((a, b) => b[1] - a[1]),
      topUsers: [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      cats: [...byCat.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [allLaunches, appByName, cats, people, rangeDays, locale]);

  // a per-app scope for the hourly chart is only valid while that app still has
  // launches under the current filters — otherwise fall back to all apps.
  useEffect(() => {
    if (hourApp && !data.byHourApp.has(hourApp)) setHourApp(null);
  }, [data, hourApp]);

  if (!can("audit.view")) {
    return (
      <>
        <PageHeader title={t.insights.title} subtitle={t.insights.subtitle} />
        <EmptyState icon={<TrendingUp className="h-6 w-6" />} title={t.dash.locked} body={t.dash.lockedHint} />
      </>
    );
  }

  const filtersActive = cats.size > 0 || people.size > 0 || rangeDays !== 14;
  const resetAll = () => {
    setCats(new Set());
    setPeople(new Set());
    setRangeDays(14);
  };
  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (v: string) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });

  const kpis = [
    { label: t.insights.kpiLaunches, value: data.total.toLocaleString(), icon: Rocket },
    { label: t.insights.kpiToday, value: data.todayCount.toLocaleString(), icon: Activity },
    { label: t.insights.kpiUsers, value: data.activeUsers.toLocaleString(), icon: UsersIcon },
    { label: t.insights.kpiAvg, value: data.avgDay.toLocaleString(), icon: TrendingUp },
    { label: t.insights.kpiPeak, value: `${String(data.peakHour).padStart(2, "0")}:00`, icon: Clock },
  ];

  const appItems: BarItem[] = data.topApps.map(([name, value]) => {
    const app = appByName.get(name);
    return { key: name, label: name, value, leading: app ? <AppLogo app={app} size={22} radius={7} /> : undefined };
  });
  const userItems: BarItem[] = data.topUsers.map(([name, value]) => ({
    key: name,
    label: name,
    value,
    leading: <Avatar name={name} size={22} />,
  }));
  const catItems: BarItem[] = data.cats.map(([cat, value]) => ({ key: cat, label: t.cat[cat], value }));
  const catTotal = data.cats.reduce((s, [, v]) => s + v, 0);
  const topCat = data.cats[0];

  // hourly chart, optionally scoped to a single app
  const hourRaw = hourApp && data.byHourApp.has(hourApp) ? data.byHourApp.get(hourApp)! : data.byHour;
  const hourData = hourRaw.map((v, h) => ({ x: h, value: v, label: `${String(h).padStart(2, "0")}:00` }));
  const hourPeak = hourRaw.reduce((p, v, i) => (v > hourRaw[p] ? i : p), 0);
  const hourAppOptions = data.topApps.map(([name]) => {
    const app = appByName.get(name);
    return { value: name, label: name, leading: app ? <AppLogo app={app} size={18} radius={6} /> : undefined };
  });

  return (
    <>
      <PageHeader title={t.insights.title} subtitle={t.insights.subtitle} />

      {/* ── filter bar ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5"
      >
        {/* range segmented control */}
        <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas/60 p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRangeDays(r)}
              className={cn(
                "relative rounded-md px-3 py-1.5 font-mono text-[12px] font-semibold tabular-nums transition",
                rangeDays === r ? "text-ink" : "text-ink-mute hover:text-ink-soft",
              )}
            >
              {rangeDays === r && (
                <motion.span
                  layoutId="range-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-md border border-line bg-surface shadow-sm"
                />
              )}
              <span className="relative">
                {r}
                {t.insights.days}
              </span>
            </button>
          ))}
        </div>

        <span className="hidden h-6 w-px bg-line sm:block" />

        <FilterMenu
          label={t.common.category}
          icon={<Tag className="h-3.5 w-3.5" />}
          options={catOptions}
          selected={cats}
          onToggle={toggle(setCats)}
          onClear={() => setCats(new Set())}
          allLabel={t.common.all}
        />
        <FilterMenu
          label={t.insights.people}
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          options={peopleOptions}
          selected={people}
          onToggle={toggle(setPeople)}
          onClear={() => setPeople(new Set())}
          allLabel={t.common.all}
        />

        <div className="ml-auto flex items-center gap-3 pr-1">
          <span className="font-mono text-[11.5px] tabular-nums text-ink-mute">
            {data.total.toLocaleString()} {t.insights.matching}
          </span>
          {filtersActive && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink-mute transition hover:bg-canvas hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
              {t.insights.reset}
            </button>
          )}
        </div>
      </motion.div>

      {data.total === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title={filtersActive ? t.insights.noMatch : t.insights.empty}
          body={filtersActive ? t.dash.emptyHint : undefined}
        />
      ) : (
        <div className="space-y-5">
          {/* KPI strip */}
          <motion.div
            key={`${rangeDays}-${cats.size}-${people.size}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3 lg:grid-cols-5"
          >
            {kpis.map((k, i) => (
              <div key={k.label} className="bg-surface p-5">
                <div className="flex items-center justify-between text-ink-mute">
                  <k.icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  <span className="font-mono text-[10px] tabular-nums tracking-wider">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-5 font-mono text-[26px] font-medium leading-none tracking-tight text-ink tabular-nums">
                  {k.value}
                </p>
                <p className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.13em] text-ink-mute">
                  {k.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* top apps + category */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel
              icon={<Trophy className="h-4 w-4" />}
              title={t.insights.topApps}
              sub={t.insights.topAppsSub}
              className="lg:col-span-2"
              delay={0.05}
            >
              <BarList items={appItems} unit={t.insights.launches} />
            </Panel>

            <Panel icon={<Layers className="h-4 w-4" />} title={t.insights.byCategory} delay={0.1}>
              {topCat && (
                <div className="mb-5 flex items-center gap-5">
                  <Donut
                    value={topCat[1]}
                    total={catTotal}
                    label={`${Math.round((topCat[1] / catTotal) * 100)}%`}
                    size={124}
                  />
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-mute">
                      {t.insights.categoryShare}
                    </p>
                    <p className="heading mt-1 text-[15px] leading-snug text-ink">{t.cat[topCat[0]]}</p>
                    <p className="mt-1 font-mono text-[12px] tabular-nums text-ink-soft">
                      {topCat[1].toLocaleString()} {t.insights.launches}
                    </p>
                  </div>
                </div>
              )}
              <BarList items={catItems} unit={t.insights.launches} />
            </Panel>
          </div>

          {/* daily trend */}
          <Panel icon={<TrendingUp className="h-4 w-4" />} title={t.insights.trend} sub={t.insights.trendSub} delay={0.12}>
            <AreaTrend data={data.days} />
          </Panel>

          {/* hourly + top users */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              icon={<Clock className="h-4 w-4" />}
              title={t.insights.byHour}
              sub={t.insights.byHourSub}
              right={
                <div className="flex items-center gap-2">
                  <span className="hidden rounded-md bg-canvas px-2 py-1 font-mono text-[11px] tabular-nums text-ink-soft md:inline">
                    {t.insights.peakLabel} · {String(hourPeak).padStart(2, "0")}:00
                  </span>
                  <AppPicker
                    value={hourApp}
                    options={hourAppOptions}
                    onChange={setHourApp}
                    allLabel={t.insights.allApps}
                  />
                </div>
              }
              delay={0.15}
            >
              <ColumnChart
                data={hourData}
                labelEvery={6}
                formatX={(h) => `${String(h).padStart(2, "0")}`}
                formatTip={(d) => (
                  <>
                    <span className="block font-mono text-[13px] font-semibold tabular-nums text-ink">
                      {d.value}
                    </span>
                    <span className="block font-mono text-[10.5px] text-ink-mute">{d.label}</span>
                  </>
                )}
              />
            </Panel>

            <Panel icon={<UsersIcon className="h-4 w-4" />} title={t.insights.topUsers} sub={t.insights.topUsersSub} delay={0.18}>
              <BarList items={userItems} unit={t.insights.launches} />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
