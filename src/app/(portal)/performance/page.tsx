"use client";

import { motion } from "framer-motion";
import { Activity, Clock, Gauge, Timer, TrendingDown, TrendingUp, Trophy, Users as UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { BarList, ColumnChart, type BarItem } from "@/components/Charts";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type Gran = "day" | "week" | "month" | "year";
const GRANS: Gran[] = ["day", "week", "month", "year"];
const BUCKETS: Record<Gran, number> = { day: 14, week: 12, month: 12, year: 5 };

/** Seconds → "2h 5m" / "8m 30s" / "45s". */
function fmtDur(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Start-of-period Date for a granularity. */
function bucketStart(d: Date, g: Gran): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  if (g === "week") x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  else if (g === "month") x.setDate(1);
  else if (g === "year") {
    x.setMonth(0, 1);
  }
  return x;
}
function keyOf(d: Date, g: Gran): string {
  const b = bucketStart(d, g);
  return g === "year" ? `${b.getFullYear()}` : `${b.getFullYear()}-${b.getMonth()}-${b.getDate()}`;
}

export default function PerformancePage() {
  const { t, locale } = usePrefs();
  const { audit, apps, users, currentUser } = usePortal();
  const [gran, setGran] = useState<Gran>("day");

  const me = currentUser?.name ?? "";
  const appByName = useMemo(() => {
    const m = new Map<string, (typeof apps)[number]>();
    apps.forEach((a) => m.set(a.name, a));
    return m;
  }, [apps]);

  // Every usage session recorded across the org (action "app.usage:<sec>").
  const usage = useMemo(
    () =>
      audit
        .filter((a) => a.action.startsWith("app.usage:"))
        .map((a) => ({
          actor: a.actor,
          app: a.target,
          sec: parseInt(a.action.slice("app.usage:".length), 10) || 0,
          at: new Date(a.at),
        }))
        .filter((r) => r.sec > 0),
    [audit],
  );

  const data = useMemo(() => {
    const now = new Date();
    const n = BUCKETS[gran];

    // Ordered bucket list going back n periods from now.
    const buckets: { key: string; label: string; start: Date }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      if (gran === "day") d.setDate(d.getDate() - i);
      else if (gran === "week") d.setDate(d.getDate() - i * 7);
      else if (gran === "month") d.setMonth(d.getMonth() - i);
      else d.setFullYear(d.getFullYear() - i);
      const start = bucketStart(d, gran);
      const label =
        gran === "year"
          ? `${start.getFullYear()}`
          : gran === "month"
            ? new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(start)
            : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(start);
      buckets.push({ key: keyOf(start, gran), label, start });
    }
    const windowStart = buckets[0]?.start ?? now;

    const inWindow = usage.filter((r) => r.at >= windowStart);
    const mine = inWindow.filter((r) => r.actor === me);
    const others = inWindow.filter((r) => r.actor !== me);
    const otherUsers = new Set(others.map((r) => r.actor)).size || Math.max(1, users.length - 1);

    // My time per app + team average per user per app.
    const myByApp = new Map<string, number>();
    const otherByApp = new Map<string, number>();
    mine.forEach((r) => myByApp.set(r.app, (myByApp.get(r.app) ?? 0) + r.sec));
    others.forEach((r) => otherByApp.set(r.app, (otherByApp.get(r.app) ?? 0) + r.sec));

    // Trend — my seconds per bucket.
    const byBucket = new Map<string, number>();
    mine.forEach((r) => {
      const k = keyOf(r.at, gran);
      byBucket.set(k, (byBucket.get(k) ?? 0) + r.sec);
    });
    const trend = buckets.map((b, i) => ({ x: i, value: byBucket.get(b.key) ?? 0, label: b.label }));

    const myTotal = mine.reduce((s, r) => s + r.sec, 0);
    const teamAvgTotal = others.reduce((s, r) => s + r.sec, 0) / otherUsers;
    const sessions = mine.length;
    const topApp = [...myByApp.entries()].sort((a, b) => b[1] - a[1])[0];

    const compare = [...myByApp.keys()]
      .map((app) => ({
        app,
        me: myByApp.get(app) ?? 0,
        avg: (otherByApp.get(app) ?? 0) / otherUsers,
      }))
      .sort((a, b) => b.me - a.me)
      .slice(0, 6);

    return {
      hasData: mine.length > 0,
      myTotal,
      teamAvgTotal,
      sessions,
      avgSession: sessions ? myTotal / sessions : 0,
      topApp,
      myByApp,
      trend,
      compare,
      vsPct: teamAvgTotal > 0 ? Math.round(((myTotal - teamAvgTotal) / teamAvgTotal) * 100) : 0,
    };
  }, [usage, gran, me, users, locale]);

  const appItems: BarItem[] = [...data.myByApp.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, sec]) => {
      const app = appByName.get(name);
      return {
        key: name,
        label: name,
        value: sec,
        sub: fmtDur(sec),
        leading: app ? <AppLogo app={app} size={22} radius={7} /> : undefined,
      };
    });

  const kpis = [
    { label: t.perf.kpiTotal, value: fmtDur(data.myTotal), icon: Clock },
    { label: t.perf.kpiSessions, value: String(data.sessions), icon: Activity },
    { label: t.perf.kpiAvgSession, value: fmtDur(data.avgSession), icon: Timer },
    { label: t.perf.kpiTopApp, value: data.topApp ? data.topApp[0] : "—", icon: Trophy },
    { label: t.perf.kpiVsTeam, value: `${data.vsPct > 0 ? "+" : ""}${data.vsPct}%`, icon: data.vsPct >= 0 ? TrendingUp : TrendingDown },
  ];

  const maxCompare = Math.max(1, ...data.compare.flatMap((c) => [c.me, c.avg]));

  return (
    <>
      <PageHeader title={t.perf.title} subtitle={t.perf.subtitle} />

      {/* granularity filter */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5 flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5"
      >
        <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas/60 p-1">
          {GRANS.map((g) => (
            <button
              key={g}
              onClick={() => setGran(g)}
              className={cn(
                "relative rounded-md px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                gran === g ? "text-ink" : "text-ink-mute hover:text-ink-soft",
              )}
            >
              {gran === g && (
                <motion.span
                  layoutId="perf-gran"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-md border border-line bg-surface shadow-sm"
                />
              )}
              <span className="relative">{t.perf[g]}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto pr-1 font-mono text-[11.5px] tabular-nums text-ink-mute">
          {t.perf.windowNote.replace("{n}", String(BUCKETS[gran])).replace("{unit}", t.perf[gran])}
        </span>
      </motion.div>

      {!data.hasData ? (
        <EmptyState
          icon={<Gauge className="h-6 w-6" />}
          title={t.perf.empty}
          body={t.perf.emptyHint}
        />
      ) : (
        <div className="space-y-5">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k, i) => (
              <div key={k.label} className="bg-surface p-5">
                <div className="flex items-center justify-between text-ink-mute">
                  <k.icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  <span className="font-mono text-[10px] tabular-nums tracking-wider">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-5 truncate font-mono text-[20px] font-medium leading-none tracking-tight text-ink tabular-nums">
                  {k.value}
                </p>
                <p className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.13em] text-ink-mute">
                  {k.label}
                </p>
              </div>
            ))}
          </div>

          {/* trend + time per app */}
          <div className="grid gap-5 lg:grid-cols-3">
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-2">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink-soft">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="heading text-[14px] leading-tight text-ink">{t.perf.trendTitle}</h2>
                  <p className="text-[11.5px] text-ink-mute">{t.perf.trendSub}</p>
                </div>
              </div>
              <ColumnChart
                data={data.trend}
                labelEvery={gran === "day" ? 2 : 1}
                formatX={(x) => data.trend[x]?.label ?? ""}
                formatValue={fmtDur}
                formatTip={(d) => (
                  <>
                    <span className="block font-mono text-[13px] font-semibold tabular-nums text-ink">
                      {fmtDur(d.value)}
                    </span>
                    <span className="block font-mono text-[10.5px] text-ink-mute">{d.label}</span>
                  </>
                )}
              />
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink-soft">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="heading text-[14px] leading-tight text-ink">{t.perf.perAppTitle}</h2>
                  <p className="text-[11.5px] text-ink-mute">{t.perf.perAppSub}</p>
                </div>
              </div>
              <BarList items={appItems} unit={t.perf.timeUnit} format={fmtDur} />
            </section>
          </div>

          {/* compare vs team average */}
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink-soft">
                <UsersIcon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="heading text-[14px] leading-tight text-ink">{t.perf.compareTitle}</h2>
                <p className="text-[11.5px] text-ink-mute">{t.perf.compareSub}</p>
              </div>
              <div className="ml-auto flex items-center gap-4 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> {t.perf.you}
                </span>
                <span className="flex items-center gap-1.5 text-ink-mute">
                  <span className="h-2.5 w-2.5 rounded-sm bg-line" /> {t.perf.teamAvg}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {data.compare.map((c) => {
                const app = appByName.get(c.app);
                const delta = c.avg > 0 ? Math.round(((c.me - c.avg) / c.avg) * 100) : 0;
                return (
                  <div key={c.app} className="flex items-center gap-3">
                    <div className="flex w-40 shrink-0 items-center gap-2">
                      {app && <AppLogo app={app} size={20} radius={6} />}
                      <span className="truncate text-[12.5px] font-medium text-ink">{c.app}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: `${(c.me / maxCompare) * 100}%` }} />
                        </div>
                        <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink">{fmtDur(c.me)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
                          <div className="h-full rounded-full bg-ink-mute/40" style={{ width: `${(c.avg / maxCompare) * 100}%` }} />
                        </div>
                        <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-mute">{fmtDur(c.avg)}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "w-14 shrink-0 text-right font-mono text-[11.5px] font-semibold tabular-nums",
                        delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
