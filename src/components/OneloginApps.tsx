"use client";

import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { OneloginApp } from "@/app/api/onelogin/apps/route";
import { AppTile } from "@/components/AppTile";
import { SectionTitle } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";
import { authHeader } from "@/lib/supabase/client";
import type { PortalApp } from "@/lib/types";

/** Onelogin has no colour per app — pick one from the name so a tile keeps its colour between visits. */
const PALETTE = ["#1f43e6", "#0d9488", "#7c3aed", "#e11d48", "#d09b3e", "#0284c7"];
const colourOf = (name: string) =>
  PALETTE[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % PALETTE.length];

/** Just enough of a catalogue app for AppTile to draw — none of it is saved anywhere. */
function asTile(a: OneloginApp): PortalApp {
  return {
    id: `onelogin-${a.id}`,
    name: a.name,
    shortName: "",
    description: a.description,
    url: a.url,
    logoUrl: a.logo,
    color: colourOf(a.name),
    category: "it",
    status: "active",
    roles: [],
    owner: "",
    version: "",
    sortOrder: 0,
    createdAt: "",
  };
}

/**
 * Apps Onelogin controls centrally that this person can open — read live, per
 * person, so a right given or taken in Onelogin shows here without anyone
 * editing ONE SPACE's catalogue. Drawn with the catalogue's own card, but opens
 * in a new tab: Lark/Google sign-in pages refuse to load inside an iframe.
 * No pin / details — those belong to catalogue apps. Empty list = no section.
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {apps.map((a, i) => (
          <AppTile
            key={a.id}
            app={asTile(a)}
            index={i}
            allowed
            pinned={false}
            caption={t.dash.oneloginCaption}
            onLaunch={() => window.open(a.url, "_blank", "noopener,noreferrer")}
          />
        ))}
      </div>
    </section>
  );
}
