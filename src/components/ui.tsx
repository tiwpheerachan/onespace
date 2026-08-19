"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { cn, hexToRgba, initials } from "@/lib/utils";

/* ── Aurora / mesh backdrop ─────────────────────────────── */

export function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="aurora">
        <span className="left-[-10%] top-[-15%] h-[46rem] w-[46rem] animate-drift bg-brand-300/60" />
        <span
          className="right-[-12%] top-[5%] h-[38rem] w-[38rem] animate-drift bg-teal-400/50"
          style={{ animationDelay: "-6s" }}
        />
        <span
          className="bottom-[-25%] left-[25%] h-[42rem] w-[42rem] animate-drift bg-brand-100"
          style={{ animationDelay: "-12s" }}
        />
      </div>
      <div className="absolute inset-0 grid-lines opacity-70" />
    </div>
  );
}

/* ── Badges ─────────────────────────────────────────────── */

const toneMap = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  beta: "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300",
  maintenance: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
  offline: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
  invited: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300",
  suspended: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/5 dark:text-slate-300",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof toneMap;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset",
        toneMap[tone],
        className,
      )}
    >
      {(tone === "active" || tone === "beta") && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

/* ── Avatar ─────────────────────────────────────────────── */

export function Avatar({
  name,
  src,
  size = 40,
  color = "#1f43e6",
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: src ? undefined : `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.65)})`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/* ── Form field ─────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] leading-relaxed text-ink-mute">{hint}</span>}
    </label>
  );
}

/* ── Checkbox ───────────────────────────────────────────── */

export function CheckPill({
  checked,
  onChange,
  label,
  description,
  color,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200",
        checked
          ? "border-brand-400/70 bg-brand-50/70 dark:bg-brand-500/10"
          : "border-line bg-surface hover:border-brand-200",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
          checked ? "border-transparent text-white" : "border-line bg-surface",
        )}
        style={checked ? { background: color ?? "#1f43e6" } : undefined}
      >
        <AnimatePresence>
          {checked && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] text-ink-mute">{description}</span>}
      </span>
    </button>
  );
}

/* ── Switch ─────────────────────────────────────────────── */

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
        checked ? "bg-brand-600" : "bg-line",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 520, damping: 32 }}
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  );
}

/* ── Modal ──────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-lift sm:rounded-3xl",
              width,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h2 className="heading text-lg text-ink">{title}</h2>
                {subtitle && <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-ink-mute transition hover:bg-canvas hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <footer className="flex items-center justify-end gap-2.5 border-t border-line bg-canvas/60 px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Empty state ────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-16 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-mute">
        {icon}
      </div>
      <p className="heading text-[15px] text-ink">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-[13px] text-ink-mute">{body}</p>}
    </motion.div>
  );
}

/* ── Section heading ────────────────────────────────────── */

export function SectionTitle({
  icon,
  title,
  count,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  count?: number | string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-ink-mute">{icon}</span>}
        <h2 className="heading text-[15px] text-ink">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11.5px] font-semibold text-ink-mute">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
