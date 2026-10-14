"use client";

import { ExternalLink, KeyRound } from "lucide-react";
import { AccessTabs } from "@/components/AccessTabs";
import { PageHeader } from "@/components/PageHeader";
import { usePrefs } from "@/lib/i18n/provider";
import { oneloginDashboardUrl } from "@/lib/sso";

/**
 * Per-app access used to be edited here — a full copy of Onelogin's model (roles,
 * resources, levels, grants) that no app ever asked, so whatever was set here was
 * enforced nowhere. Onelogin is the single place for it now; this tab only points there.
 */
export default function AccessPage() {
  const { t } = usePrefs();

  return (
    <>
      <PageHeader title={t.access.title} subtitle={t.access.subtitle} />
      <AccessTabs />
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-mute">
          <KeyRound className="h-6 w-6" />
        </div>
        <p className="heading text-[15px] text-ink">{t.access.movedTitle}</p>
        <p className="mt-1.5 max-w-md text-[13px] text-ink-mute">{t.access.movedBody}</p>
        <a
          href={`${oneloginDashboardUrl}/apps`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary btn-sm mt-5 gap-2"
        >
          {t.access.openOnelogin}
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </>
  );
}
