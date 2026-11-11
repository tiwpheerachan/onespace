"use client";

import { useEffect, useState } from "react";
import type { OneloginApp } from "@/app/api/onelogin/apps/route";
import { authHeader } from "@/lib/supabase/client";

export type { OneloginApp };

/**
 * Apps Onelogin controls centrally that this person can open — read live, per
 * person, so a right given or taken in Onelogin shows on the dashboard without
 * anyone editing ONE SPACE's catalogue. Anything going wrong = an empty list.
 *
 * Returned as-is (not mapped into a catalogue app) so the dashboard can draw them
 * with the same card Onelogin uses — the tile looks identical in both places.
 */
export function useOneloginApps(): OneloginApp[] {
  const [apps, setApps] = useState<OneloginApp[]>([]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const r = await fetch("/api/onelogin/apps", { headers: await authHeader() }).catch(() => null);
      const body = r?.ok ? ((await r.json().catch(() => null)) as { apps?: OneloginApp[] } | null) : null;
      if (live) setApps(body?.apps ?? []);
    };
    // ดึงซ้ำเมื่อกลับมาที่แท็บ/หน้าต่าง — เผยแพร่/ยกเลิกใน Onelogin จะ reflect เองโดยไม่ต้องรีเฟรช
    // (รายการนี้มาจาก /api/v1/apps/mine แบบสด แค่ก่อนหน้านี้ hook ดึงครั้งเดียวตอน mount)
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, []);
  return apps;
}

/** Opens in a new tab: Lark/Google sign-in pages refuse to load inside our iframe viewer. */
export const openOneloginApp = (a: { url: string }) => window.open(a.url, "_blank", "noopener,noreferrer");
