"use client";

import { motion } from "framer-motion";
import { Boxes, LogIn, ScrollText, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";
import { formatDateTime, initials, relativeTime } from "@/lib/utils";

const iconFor = (action: string) => {
  if (action.startsWith("app.launch")) return LogIn;
  if (action.startsWith("app")) return Boxes;
  if (action.startsWith("user")) return UserCog;
  if (action.startsWith("role")) return ShieldCheck;
  if (action.includes("delete")) return Trash2;
  return ScrollText;
};

export default function AuditPage() {
  const { t, locale } = usePrefs();
  const { audit } = usePortal();

  return (
    <>
      <PageHeader title={t.audit.title} subtitle={t.audit.subtitle} />

      {audit.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-6 w-6" />} title={t.audit.empty} />
      ) : (
        <div className="relative rounded-2xl border border-line bg-surface p-6 shadow-card">
          <span className="absolute bottom-8 left-[38px] top-10 w-px bg-line" />
          <ul className="space-y-5">
            {audit.map((entry, i) => {
              const Icon = iconFor(entry.action);
              return (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 16) * 0.03 }}
                  className="relative flex gap-4"
                >
                  <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[13.5px] font-semibold text-ink">{entry.actor}</span>
                      <code className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[11.5px] text-brand-700 dark:text-brand-300">
                        {entry.action}
                      </code>
                      <span className="truncate text-[12.5px] text-ink-soft">{entry.target}</span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-mute">
                      {relativeTime(entry.at, locale)} · {formatDateTime(entry.at, locale)}
                    </p>
                  </div>
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-bold text-ink-mute sm:flex">
                    {initials(entry.actor)}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
