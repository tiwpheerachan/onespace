"use client";

import { ArrowUpRight, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { OneloginApp } from "@/app/api/onelogin/apps/route";
import { SectionTitle } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";
import { authHeader } from "@/lib/supabase/client";

/**
 * Apps Onelogin controls centrally that this person can open — read live, per
 * person, so a right given or taken in Onelogin shows here without anyone
 * editing ONE SPACE's catalogue. Opens in a new tab: Lark/Google sign-in
 * pages refuse to load inside an iframe. Empty list = the section isn't drawn.
 */
export function OneloginApps() {
  const { t } = usePrefs();
  const [apps, setApps] = useState<OneloginApp[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await fetch("/api/onelogin/apps", { headers: await authHeader() }).catch(() => null);
      const body = r?.ok ? ((await r.json().catch(() => null)) as { apps?: OneloginApp[] } | null) : null;
      if (live) setApps(body?.apps ?? []);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (apps.length === 0) return null;

  return (
    <section>
      <SectionTitle icon={<KeyRound className="h-4 w-4" />} title={t.dash.oneloginApps} count={apps.length} />
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {apps.map((app) => (
          <a
            key={app.id}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition hover:border-brand-300"
          >
            {app.logo ? (
              <img src={app.logo} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover" />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-canvas text-[13px] font-semibold text-ink">
                {app.name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-ink">{app.name}</span>
              {app.description && (
                <span className="block truncate text-[11px] text-ink-mute">{app.description}</span>
              )}
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-mute transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        ))}
      </div>
    </section>
  );
}
