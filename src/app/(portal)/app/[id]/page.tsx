"use client";

import { ArrowLeft, ExternalLink, Lock, Maximize2, RotateCw, TriangleAlert } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function AppViewerPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { t } = usePrefs();
  const { apps, canOpen, registerLaunch, loading: portalLoading } = usePortal();

  const app = apps.find((a) => a.id === id);
  const allowed = app ? canOpen(app) : false;

  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const loadedRef = useRef(false);

  // Count this as a launch (feeds "recent" + insights), once per app opened.
  useEffect(() => {
    if (app && allowed) registerLaunch(app);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id, allowed]);

  // Heuristic embed-block detection: many sites send X-Frame-Options /
  // frame-ancestors and never fire `load`. If we don't hear back in time,
  // assume the frame was refused and offer to open it in a new tab.
  useEffect(() => {
    if (!app || !allowed) return;
    loadedRef.current = false;
    setLoading(true);
    setBlocked(false);
    const timer = setTimeout(() => {
      if (!loadedRef.current) setBlocked(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [app?.url, allowed, reloadKey, app]);

  const openExternal = () => {
    if (app) window.open(app.url, "_blank", "noopener,noreferrer");
  };
  const goFullscreen = () => frameRef.current?.requestFullscreen?.();

  // ── not found ─────────────────────────────────────────────
  if (!portalLoading && !app) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <TriangleAlert className="h-8 w-8 text-ink-mute" />
        <div>
          <p className="heading text-[16px] text-ink">{t.viewer.notFound}</p>
          <p className="mt-1 text-[13px] text-ink-soft">{t.viewer.notFoundBody}</p>
        </div>
        <button onClick={() => router.push("/dashboard")} className="btn-primary btn-sm">
          <ArrowLeft className="h-4 w-4" />
          {t.viewer.back}
        </button>
      </div>
    );
  }

  if (!app) return <div className="min-h-[60vh]" />;

  // ── locked ────────────────────────────────────────────────
  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-mute">
          <Lock className="h-6 w-6" />
        </span>
        <div>
          <p className="heading text-[16px] text-ink">{app.name}</p>
          <p className="mt-1 text-[13px] text-ink-soft">{t.viewer.locked}</p>
        </div>
        <button onClick={() => router.push("/dashboard")} className="btn-ghost btn-sm">
          <ArrowLeft className="h-4 w-4" />
          {t.viewer.back}
        </button>
      </div>
    );
  }

  // ── viewer — a framed window that fills the content area ──
  return (
    <div className="-my-8 flex h-[calc(100vh-4rem)] flex-col">
      {/* toolbar */}
      <div className="flex items-center gap-3 border-b border-line py-3">
        <button
          onClick={() => router.push("/dashboard")}
          title={t.viewer.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-soft transition hover:bg-canvas hover:text-ink"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>

        <AppLogo app={app} size={30} radius={9} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-ink">{app.name}</p>
          <p className="truncate font-mono text-[11px] text-ink-mute">{hostOf(app.url)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              loadedRef.current = false;
              setReloadKey((k) => k + 1);
            }}
            title={t.viewer.reload}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-mute transition hover:bg-canvas hover:text-ink"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={goFullscreen}
            title={t.viewer.fullscreen}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-ink-mute transition hover:bg-canvas hover:text-ink sm:flex"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={openExternal}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[12px] font-semibold text-ink-soft transition hover:bg-canvas hover:text-ink"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.viewer.openExternal}</span>
          </button>
        </div>
      </div>

      {/* frame area */}
      <div className="relative flex-1 overflow-hidden rounded-b-2xl bg-canvas/40">
        {/* loading shimmer */}
        {loading && !blocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface">
            <span
              className="h-8 w-8 animate-spin rounded-full border-2 border-line"
              style={{ borderTopColor: app.color }}
            />
            <p className="text-[12.5px] text-ink-mute">{t.viewer.loading}</p>
          </div>
        )}

        {/* embed-blocked fallback */}
        {blocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
              style={{ background: `linear-gradient(140deg, ${app.color}, ${app.color}aa)` }}
            >
              <ExternalLink className="h-7 w-7" />
            </span>
            <div className="max-w-sm">
              <p className="heading text-[16px] text-ink">{t.viewer.blockedTitle}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t.viewer.blockedBody}</p>
            </div>
            <button
              onClick={openExternal}
              className="btn btn-sm h-10 gap-2 px-4 text-white shadow-glow"
              style={{ background: app.color }}
            >
              {t.viewer.openThere}
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        )}

        <iframe
          key={reloadKey}
          ref={frameRef}
          src={app.url}
          title={app.name}
          className={cn("h-full w-full border-0 bg-white", (loading || blocked) && "opacity-0")}
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write; fullscreen; geolocation; microphone; camera; autoplay"
          onLoad={() => {
            loadedRef.current = true;
            setLoading(false);
            setBlocked(false);
          }}
        />

        {/* Cross-origin frame blocking can't be reliably detected once the browser
            renders its own error page, so once a frame is "loaded" we float a
            gentle escape hatch: if the app didn't appear, open it in a new tab. */}
        {!loading && !blocked && (
          <button
            onClick={openExternal}
            className="group absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-2 text-[12px] font-medium text-ink-soft shadow-lift backdrop-blur-sm transition hover:text-ink"
          >
            <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
            {t.viewer.blockedHint}
            <span className="inline-flex items-center gap-1 font-semibold text-ink group-hover:underline">
              {t.viewer.openExternal}
              <ExternalLink className="h-3 w-3" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
