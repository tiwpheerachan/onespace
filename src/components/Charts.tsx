"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* Single-accent, theme-aware charts. Grid/axis/labels ride the app's ink+line
   tokens; only the data marks carry the brand accent — so nothing is a rainbow
   and every mark reads in both light and dark. */

const ACCENT = "#f43f5e"; // rose-500
const ACCENT_STRONG = "#e11d48"; // rose-600
const LINE = "rgb(var(--c-line))";

/** Measure a container's width so the SVG can render in real pixels. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setW(cr.width);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

function Tooltip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-center shadow-lift"
      style={{ left: x, top: y - 8 }}
    >
      {children}
    </div>
  );
}

/* ── Horizontal ranked bar list (magnitude + identity) ──────────────────── */

export interface BarItem {
  key: string;
  label: string;
  value: number;
  sub?: string;
  leading?: React.ReactNode;
}

export function BarList({
  items,
  unit,
  format,
}: {
  items: BarItem[];
  unit?: string;
  /** Format the displayed value (e.g. seconds → "2h 5m"). Defaults to a number. */
  format?: (v: number) => string;
}) {
  const fmt = (v: number) => (format ? format(v) : v.toLocaleString());
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className="space-y-3.5">
      {items.map((it, i) => {
        const pct = (it.value / max) * 100;
        const share = Math.round((it.value / total) * 100);
        return (
          <li key={it.key} className="group">
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-ink-mute">
                {String(i + 1).padStart(2, "0")}
              </span>
              {it.leading}
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                {it.label}
              </span>
              <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink">
                {fmt(it.value)}
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-mute">
                {share}%
              </span>
            </div>
            <div className="ml-[30px] h-2 overflow-hidden rounded-full bg-line/60">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: i === 0 ? ACCENT_STRONG : ACCENT,
                  opacity: i === 0 ? 1 : 0.9 - Math.min(i, 6) * 0.07,
                }}
                title={`${fmt(it.value)}${unit ? " " + unit : ""}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Vertical column chart (e.g. launches by hour) ──────────────────────── */

/** Path for a bar with only its two top corners rounded, anchored to the baseline. */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

export function ColumnChart({
  data,
  labelEvery = 6,
  formatX,
  formatTip,
  formatValue,
  height = 210,
}: {
  data: { x: number; value: number; label: string }[];
  labelEvery?: number;
  formatX?: (x: number) => string;
  formatTip?: (d: { x: number; value: number; label: string }) => React.ReactNode;
  /** Format the peak-value label above the tallest bar. Defaults to the number. */
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padX = 4;
  const padTop = 26; // room for the peak label
  const padBottom = 22;
  const plotH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((p, d, i) => (d.value > data[p].value ? i : p), 0);

  const n = data.length;
  const innerW = Math.max(0, w - padX * 2);
  const step = n ? innerW / n : 0;
  const barW = Math.min(step * 0.66, 20);

  const gridVals = [0, 0.5, 1];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="col-accent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.95} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0.42} />
            </linearGradient>
            <linearGradient id="col-peak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT_STRONG} stopOpacity={1} />
              <stop offset="100%" stopColor={ACCENT_STRONG} stopOpacity={0.6} />
            </linearGradient>
          </defs>

          {gridVals.map((g) => {
            const y = padTop + plotH * (1 - g);
            return (
              <line
                key={g}
                x1={padX}
                x2={w - padX}
                y1={y}
                y2={y}
                stroke={LINE}
                strokeWidth={1}
                strokeDasharray={g === 0 ? undefined : "2 5"}
              />
            );
          })}

          {data.map((d, i) => {
            const h = (d.value / max) * plotH;
            const x = padX + i * step + (step - barW) / 2;
            const y = padTop + plotH - h;
            const active = hover === i;
            const isPeak = i === peak;
            const dim = hover !== null && !active;
            return (
              <g key={i}>
                <path
                  d={topRoundedBar(x, y, barW, Math.max(h, 2), Math.min(barW / 2, 5))}
                  fill={isPeak || active ? "url(#col-peak)" : "url(#col-accent)"}
                  opacity={dim ? 0.3 : 1}
                  className="transition-opacity duration-150"
                />
                <rect
                  x={padX + i * step}
                  y={padTop}
                  width={step}
                  height={plotH + padBottom}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((v) => (v === i ? null : v))}
                />
                {/* peak value label, when nothing is hovered */}
                {isPeak && hover === null && (
                  <text
                    x={x + barW / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-ink font-mono text-[11px] font-semibold"
                  >
                    {formatValue ? formatValue(d.value) : d.value}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text
                    x={padX + i * step + step / 2}
                    y={height - 6}
                    textAnchor="middle"
                    className="fill-ink-mute font-mono text-[10px]"
                  >
                    {formatX ? formatX(d.x) : d.x}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <Tooltip x={padX + hover * step + step / 2} y={padTop + plotH - (data[hover].value / max) * plotH}>
          {formatTip ? (
            formatTip(data[hover])
          ) : (
            <>
              <span className="block font-mono text-[13px] font-semibold tabular-nums text-ink">
                {data[hover].value}
              </span>
              <span className="block text-[10.5px] text-ink-mute">{data[hover].label}</span>
            </>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/* ── Area trend with crosshair (launches per day) ───────────────────────── */

export function AreaTrend({
  data,
  height = 200,
  formatTip,
}: {
  data: { label: string; value: number; full?: string }[];
  height?: number;
  formatTip?: (d: { label: string; value: number; full?: string }) => React.ReactNode;
}) {
  const { ref, w } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padX = 8;
  const padTop = 14;
  const padBottom = 22;
  const plotH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const innerW = Math.max(0, w - padX * 2);
  const xAt = (i: number) => padX + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yAt = (v: number) => padTop + plotH * (1 - v / max);

  const linePts = data.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" ");
  const areaPath =
    n > 0
      ? `M ${xAt(0)},${padTop + plotH} L ${data.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" L ")} L ${xAt(n - 1)},${padTop + plotH} Z`
      : "";

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const rel = e.clientX - rect.left - padX;
    const idx = Math.round((rel / Math.max(1, innerW)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  };

  const gridVals = [0, 0.5, 1];
  const labelEvery = Math.max(1, Math.ceil(n / 7));

  return (
    <div
      ref={ref}
      className="relative w-full"
      style={{ height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {w > 0 && (
        <svg width={w} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="area-accent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          {gridVals.map((g) => {
            const y = padTop + plotH * (1 - g);
            return (
              <line
                key={g}
                x1={padX}
                x2={w - padX}
                y1={y}
                y2={y}
                stroke={LINE}
                strokeWidth={1}
                strokeDasharray={g === 0 ? undefined : "3 4"}
              />
            );
          })}
          {areaPath && <path d={areaPath} fill="url(#area-accent)" />}
          <polyline points={linePts} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* x labels */}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text
                key={i}
                x={xAt(i)}
                y={height - 6}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                className="fill-ink-mute font-mono text-[10px]"
              >
                {d.label}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <>
              <line x1={xAt(hover)} x2={xAt(hover)} y1={padTop} y2={padTop + plotH} stroke={LINE} strokeWidth={1} />
              <circle cx={xAt(hover)} cy={yAt(data[hover].value)} r={4.5} fill={ACCENT_STRONG} stroke="rgb(var(--c-surface))" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <Tooltip x={xAt(hover)} y={yAt(data[hover].value)}>
          {formatTip ? (
            formatTip(data[hover])
          ) : (
            <>
              <span className="block font-mono text-[13px] font-semibold tabular-nums text-ink">
                {data[hover].value}
              </span>
              <span className="block whitespace-nowrap text-[10.5px] text-ink-mute">
                {data[hover].full ?? data[hover].label}
              </span>
            </>
          )}
        </Tooltip>
      )}
    </div>
  );
}

/* ── Compact donut (share of a whole) ───────────────────────────────────── */

export function Donut({
  value,
  total,
  label,
  sublabel,
  size = 132,
}: {
  value: number;
  total: number;
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;
  return (
    <div className={cn("relative inline-flex items-center justify-center")} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={LINE} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ACCENT_STRONG}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div
        className="absolute inset-0 mx-auto flex flex-col items-center justify-center text-center"
        style={{ maxWidth: size - stroke * 2 - 6 }}
      >
        <span className="font-mono text-[24px] font-semibold tabular-nums leading-none text-ink">{label}</span>
        {sublabel && (
          <span className="mt-1 text-[9px] font-medium uppercase leading-tight tracking-[0.06em] text-ink-mute">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
