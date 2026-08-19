"use client";

import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  GitBranch,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { ProgressiveBlur } from "@/components/ui/progressive-blur-card";
import { Avatar, Badge, Modal } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";
import type { PortalApp, Role } from "@/lib/types";
import { cn, formatDateTime, hexToRgba, initials, isVideoSrc } from "@/lib/utils";

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
          {/* cover banner with progressive blur */}
          <div className="relative h-40 overflow-hidden rounded-2xl border border-line">
            {app.coverUrl && isVideoSrc(app.coverUrl) ? (
              <video
                src={app.coverUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : app.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${app.color}, ${hexToRgba(app.color, 0.7)} 52%, ${hexToRgba(app.color, 0.4)})`,
                }}
              >
                <span
                  className="absolute inset-0 opacity-70"
                  style={{ background: "radial-gradient(120% 80% at 15% 0%, rgba(255,255,255,.4), transparent 55%)" }}
                />
                <span className="pointer-events-none absolute -right-2 -top-8 select-none font-display text-[150px] font-bold leading-none text-white/15">
                  {(app.shortName?.trim() || initials(app.name)).slice(0, 2)}
                </span>
              </span>
            )}
            <ProgressiveBlur className="pointer-events-none absolute bottom-0 left-0 h-3/4 w-full" blurIntensity={6} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end gap-3.5 p-4">
              <AppLogo app={app} size={54} radius={15} className="ring-2 ring-white/25" />
              <div className="min-w-0 pb-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="heading truncate text-[18px] text-white drop-shadow-sm">{app.name}</h3>
                  <Badge tone={app.status}>{t.status[app.status]}</Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] leading-relaxed text-white/85">
                  {app.description}
                </p>
              </div>
            </div>
          </div>

          {/* about — the richer write-up the creator fills in */}
          {app.longDescription?.trim() && (
            <section className="rounded-2xl border border-line bg-canvas/40 p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
                {t.apps.about}
              </p>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
                {app.longDescription}
              </p>
            </section>
          )}

          {/* maintainer — who to contact */}
          {app.maintainer?.name && (
            <section
              className="flex items-center gap-3.5 rounded-2xl border p-4"
              style={{ borderColor: hexToRgba(app.color, 0.3), background: hexToRgba(app.color, 0.05) }}
            >
              <Avatar name={app.maintainer.name} src={app.maintainer.avatarUrl} size={44} color={app.color} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
                  {t.apps.contactLabel}
                </p>
                <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">{app.maintainer.name}</p>
                {app.maintainer.title && (
                  <p className="truncate text-[12px] text-ink-mute">{app.maintainer.title}</p>
                )}
              </div>
              {app.maintainer.email && (
                <a
                  href={`mailto:${app.maintainer.email}`}
                  onClick={(e) => e.stopPropagation()}
                  title={app.maintainer.email}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white transition hover:opacity-90"
                  style={{ background: app.color }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.apps.contactAction}</span>
                </a>
              )}
            </section>
          )}

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
