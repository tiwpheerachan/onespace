"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Info, Lock, Pin, PinOff } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Badge } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";
import type { PortalApp } from "@/lib/types";
import { cn, hexToRgba } from "@/lib/utils";

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
        "group relative flex h-full cursor-pointer flex-col rounded-2xl border bg-surface p-5 outline-none transition-colors duration-200",
        "hover:border-ink/15 focus-visible:ring-2 focus-visible:ring-brand-500/50",
        allowed ? "border-line" : "border-dashed border-line",
      )}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <AppLogo app={app} size={48} />
        <div className="flex items-center gap-1">
          <Badge tone={app.status}>{t.status[app.status]}</Badge>
          <button
            onClick={stop(onPin)}
            title={pinned ? t.dash.unpin : t.dash.pin}
            className={cn(
              "rounded-lg p-1.5 transition",
              pinned
                ? "text-brand-600"
                : "text-ink-mute opacity-0 hover:text-ink group-hover:opacity-100",
            )}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* body */}
      <div className="mt-4 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="heading text-[15px] leading-snug text-ink">{app.name}</h3>
          {!allowed && <Lock className="h-3.5 w-3.5 shrink-0 text-ink-mute" />}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">
          {app.description}
        </p>
      </div>

      {/* footer */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-3.5">
        <span className="truncate font-mono text-[11px] tracking-tight text-ink-mute">
          {t.cat[app.category]} · v{app.version}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={stop(onDetails)}
            title={t.dash.details}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-ink-mute transition hover:bg-canvas hover:text-ink"
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.dash.details}</span>
          </button>

          {allowed ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold"
              style={{ color: app.color, background: hexToRgba(app.color, 0.1) }}
            >
              {t.dash.launch}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[12px] font-semibold text-ink-mute">
              {t.dash.locked}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
