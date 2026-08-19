"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Info, Lock, Pin, PinOff } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { ProgressiveBlur } from "@/components/ui/progressive-blur-card";
import { Avatar, Badge } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";
import type { PortalApp } from "@/lib/types";
import { cn, hexToRgba, initials, isVideoSrc } from "@/lib/utils";

interface Props {
  app: PortalApp;
  allowed: boolean;
  pinned: boolean;
  onPin: () => void;
  onLaunch: () => void;
  onDetails: () => void;
  index?: number;
}

export function AppTile({ app, allowed, pinned, onPin, onLaunch, onDetails, index = 0 }: Props) {
  const { t } = usePrefs();

  // The whole card is the primary target: open the app when allowed, otherwise
  // fall through to the detail sheet so a locked tile still explains itself.
  const activate = () => (allowed ? onLaunch() : onDetails());

  const stop =
    (fn: () => void) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fn();
    };

  const watermark = (app.shortName?.trim() || initials(app.name)).slice(0, 2);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-surface outline-none transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand-500/50",
        allowed ? "border-line" : "border-dashed border-line",
      )}
    >
      {/* ── cover ─────────────────────────────────────────── */}
      <div className={cn("relative h-32 w-full overflow-hidden", !allowed && "opacity-90")}>
        {app.coverUrl && isVideoSrc(app.coverUrl) ? (
          <video
            src={app.coverUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : app.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span
            className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${app.color}, ${hexToRgba(app.color, 0.72)} 52%, ${hexToRgba(app.color, 0.42)})`,
            }}
          >
            <span
              className="absolute inset-0 opacity-70"
              style={{ background: "radial-gradient(120% 80% at 15% 0%, rgba(255,255,255,.4), transparent 55%)" }}
            />
            <span className="pointer-events-none absolute -right-3 -top-6 select-none font-display text-[112px] font-bold leading-none text-white/15">
              {watermark}
            </span>
          </span>
        )}

        {/* progressive blur veil so the caption stays crisp over any cover */}
        <ProgressiveBlur className="pointer-events-none absolute bottom-0 left-0 h-3/4 w-full" blurIntensity={6} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {/* top controls */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <Badge tone={app.status}>{t.status[app.status]}</Badge>
          <button
            onClick={stop(onPin)}
            title={pinned ? t.dash.unpin : t.dash.pin}
            className={cn(
              "rounded-lg p-1.5 backdrop-blur-sm transition",
              pinned
                ? "bg-white/90 text-brand-600"
                : "bg-black/15 text-white/90 opacity-0 hover:bg-white/90 hover:text-ink group-hover:opacity-100",
            )}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        </div>

        {/* caption over the blurred base — logo (the app "profile") sits larger */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3.5">
          <AppLogo app={app} size={52} radius={15} className="shadow-lg ring-2 ring-white/30" />
          <div className="min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-[15px] font-semibold leading-snug text-white drop-shadow-sm">
                {app.name}
              </h3>
              {!allowed && <Lock className="h-3 w-3 shrink-0 text-white/80" />}
            </div>
            <p className="truncate text-[11px] font-medium text-white/80">
              {t.cat[app.category]} · v{app.version}
            </p>
          </div>
        </div>
      </div>

      {/* ── body ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 min-h-[34px] text-[12.5px] leading-relaxed text-ink-soft">
          {app.description}
        </p>

        {/* maintainer — "ดูแลโดย …" */}
        {app.maintainer?.name && (
          <div className="mt-3 flex items-center gap-2">
            <Avatar name={app.maintainer.name} src={app.maintainer.avatarUrl} size={22} color={app.color} />
            <span className="min-w-0 truncate text-[11.5px] text-ink-mute">
              {t.apps.maintainedBy} <span className="font-semibold text-ink-soft">{app.maintainer.name}</span>
            </span>
          </div>
        )}

        {/* footer */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3.5">
          <button
            onClick={stop(onDetails)}
            title={t.dash.details}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-ink-mute transition hover:bg-canvas hover:text-ink"
          >
            <Info className="h-3.5 w-3.5" />
            <span>{t.dash.details}</span>
          </button>

          {allowed ? (
            <button
              onClick={stop(onLaunch)}
              title={t.dash.launch}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition-all duration-300 group-hover:scale-110 hover:rotate-6 active:scale-95"
              style={{ background: app.color, boxShadow: `0 8px 20px -8px ${hexToRgba(app.color, 0.9)}` }}
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink-mute">
              <Lock className="h-3.5 w-3.5" />
              {t.dash.locked}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
