"use client";

import { KeyRound, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * The one place for permission management. Three concerns used to be three
 * separate nav items — per-app access, the people, and the portal-level roles —
 * which read as "which one do I use?". They live under a single "Access
 * management" entry now, split by these sub-tabs.
 */
export function AccessTabs() {
  const { t } = usePrefs();
  const { can } = usePortal();
  const pathname = usePathname();

  const tabs = [
    { href: "/admin/access", label: t.access.tabApp, icon: KeyRound, show: can("app.manage") },
    { href: "/admin/users", label: t.nav.users, icon: Users, show: can("user.manage") },
    { href: "/admin/roles", label: t.access.tabPortal, icon: ShieldCheck, show: can("role.manage") },
  ].filter((x) => x.show);

  if (tabs.length <= 1) return null;

  return (
    <div className="mb-6 inline-flex flex-wrap gap-1 rounded-xl border border-line bg-canvas/60 p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition",
              active ? "bg-surface text-ink shadow-sm" : "text-ink-mute hover:text-ink-soft",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
