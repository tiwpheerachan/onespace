"use client";

import { useEffect, useState } from "react";
import type { OneloginApp } from "@/app/api/onelogin/apps/route";
import { authHeader } from "@/lib/supabase/client";
import type { PortalApp } from "@/lib/types";

/** Tiles from Onelogin carry this id prefix — they aren't in our catalogue, so no pin / details. */
const PREFIX = "onelogin-";
export const isOneloginApp = (a: Pick<PortalApp, "id">) => a.id.startsWith(PREFIX);

/** Onelogin has no colour per app — pick one from the name so a tile keeps its colour between visits. */
const PALETTE = ["#1f43e6", "#0d9488", "#7c3aed", "#e11d48", "#d09b3e", "#0284c7"];
const colourOf = (name: string) =>
  PALETTE[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % PALETTE.length];

/** Just enough of a catalogue app for the dashboard to draw — none of it is saved anywhere. */
function asPortalApp(a: OneloginApp): PortalApp {
  return {
    id: `${PREFIX}${a.id}`,
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
 * person, so a right given or taken in Onelogin shows on the dashboard without
 * anyone editing ONE SPACE's catalogue. Anything going wrong = an empty list.
 */
export function useOneloginApps(): PortalApp[] {
  const [apps, setApps] = useState<PortalApp[]>([]);
  useEffect(() => {
    let live = true;
    (async () => {
      const r = await fetch("/api/onelogin/apps", { headers: await authHeader() }).catch(() => null);
      const body = r?.ok ? ((await r.json().catch(() => null)) as { apps?: OneloginApp[] } | null) : null;
      if (live) setApps((body?.apps ?? []).map(asPortalApp));
    })();
    return () => {
      live = false;
    };
  }, []);
  return apps;
}

/** Opens in a new tab: Lark/Google sign-in pages refuse to load inside our iframe viewer. */
export const openOneloginApp = (a: PortalApp) => window.open(a.url, "_blank", "noopener,noreferrer");
