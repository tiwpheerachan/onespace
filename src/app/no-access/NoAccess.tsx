"use client";

import { ArrowLeft, ShieldOff } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { usePrefs } from "@/lib/i18n/provider";

export function NoAccess({ oneloginUrl }: { oneloginUrl: string }) {
  const { t } = usePrefs();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-lift">
        <div className="flex justify-center">
          <Wordmark height={22} />
        </div>
        <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10">
          <ShieldOff className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">{t.noAccess.title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{t.noAccess.body}</p>
        <a
          href={oneloginUrl}
          className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white transition hover:bg-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.noAccess.back}
        </a>
        <Link
          href="/login"
          className="mt-3 block text-[12.5px] text-ink-mute transition hover:text-ink"
        >
          {t.noAccess.other}
        </Link>
      </div>
    </div>
  );
}
