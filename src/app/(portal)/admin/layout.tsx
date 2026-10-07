"use client";

import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import type { Permission } from "@/lib/types";

/** Which permission opens each admin page — any one of them is enough. */
const NEEDS: Record<string, Permission[]> = {
  "/admin/apps": ["app.manage"],
  "/admin/users": ["user.manage"],
  "/admin/roles": ["role.manage"],
  "/admin/audit": ["audit.view"],
  "/admin/insights": ["audit.view"],
  "/admin/access": ["app.manage", "user.manage", "role.manage"],
};

/**
 * Hiding a menu item isn't enough — a typed URL still opens the page. The data
 * itself is guarded by RLS; this keeps people without the right off the page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { can } = usePortal();
  const { t } = usePrefs();
  const pathname = usePathname();
  const section = Object.keys(NEEDS).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  // an admin page not listed above needs app.manage
  const needs = section ? NEEDS[section] : (["app.manage"] as Permission[]);

  if (!needs.some((p) => can(p))) {
    return (
      <>
        <PageHeader title={t.dash.locked} />
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t.dash.locked} body={t.dash.pageLocked} />
      </>
    );
  }
  return <>{children}</>;
}
