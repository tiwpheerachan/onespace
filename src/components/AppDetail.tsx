"use client";

import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  GitBranch,
  Globe,
  Lock,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Badge, Modal } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";
import type { PortalApp, Role } from "@/lib/types";
import { cn, formatDateTime, hexToRgba } from "@/lib/utils";

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-canvas/50 px-3.5 py-3">
      <span className="mt-0.5 text-ink-mute">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">{label}</p>
        <div className="mt-0.5 text-[13px] font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}

export function AppDetail({
  app,
  allowed,
  roles,
  onClose,
  onLaunch,
}: {
  app: PortalApp | null;
  allowed: boolean;
  roles: Role[];
  onClose: () => void;
  onLaunch: (app: PortalApp) => void;
}) {
  const { t, locale } = usePrefs();

  const roleNames = app?.roles.length
    ? app.roles.map((k) => roles.find((r) => r.key === k)?.name ?? k)
    : null;

  return (
    <Modal
      open={Boolean(app)}
      onClose={onClose}
      title={app?.name ?? ""}
      subtitle={app ? `${t.cat[app.category]} · v${app.version}` : undefined}
      width="max-w-xl"
      footer={
        app && (
          <>
            <button onClick={onClose} className="btn-ghost btn-sm">
              {t.common.close}
            </button>
            {allowed ? (
              <button
                onClick={() => onLaunch(app)}
                className="btn btn-sm h-9 gap-2 text-white shadow-glow"
                style={{ background: app.color }}
              >
                {t.dash.openApp}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-[12.5px] font-semibold text-ink-mute">
                <Lock className="h-3.5 w-3.5" />
                {t.dash.locked}
              </span>
            )}
          </>
        )
      }
    >
      {app && (
        <div className="space-y-5">
          {/* banner */}
          <div
            className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line p-4"
            style={{
              background: `linear-gradient(120deg, ${hexToRgba(app.color, 0.14)}, transparent 70%)`,
            }}
          >
            <AppLogo app={app} size={60} radius={16} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="heading truncate text-[17px] text-ink">{app.name}</h3>
                <Badge tone={app.status}>{t.status[app.status]}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">
                {app.description}
              </p>
            </div>
          </div>

          {!allowed && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-medium text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
              <Lock className="h-4 w-4 shrink-0" />
              {t.dash.lockedHint}
            </div>
          )}

          {/* facts */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Row icon={<Tag className="h-4 w-4" />} label={t.common.category}>
              {t.cat[app.category]}
            </Row>
            <Row icon={<Building2 className="h-4 w-4" />} label={t.common.owner}>
              {app.owner || "—"}
            </Row>
            <Row icon={<GitBranch className="h-4 w-4" />} label={t.common.version}>
              <span className="font-mono tabular-nums">v{app.version}</span>
            </Row>
            <Row icon={<CalendarClock className="h-4 w-4" />} label={t.dash.registered}>
              {formatDateTime(app.createdAt, locale) ?? "—"}
            </Row>
            <Row icon={<Globe className="h-4 w-4" />} label={t.common.url}>
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="truncate text-brand-600 hover:underline"
              >
                {hostOf(app.url)}
              </a>
            </Row>
            <Row icon={<ShieldCheck className="h-4 w-4" />} label={t.dash.accessScope}>
              {roleNames ? (
                <span className="flex flex-wrap gap-1">
                  {roleNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft"
                    >
                      {name}
                    </span>
                  ))}
                </span>
              ) : (
                <span className={cn("text-[13px]", "text-emerald-600 dark:text-emerald-400")}>
                  {t.dash.everyone}
                </span>
              )}
            </Row>
          </div>
        </div>
      )}
    </Modal>
  );
}
