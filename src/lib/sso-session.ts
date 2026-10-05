"use client";

import { useEffect } from "react";
import type { SessionStatus } from "@/app/api/sso/session/route";
import { getSupabase } from "@/lib/supabase/client";

const EVERY_MS = 60_000;

/**
 * Ask Onelogin (through our server) whether this SSO session still holds.
 * Exported so risky actions (approving money, editing rights) can check live
 * right before acting instead of waiting for the next round (§4.7).
 */
export async function checkSsoSession(): Promise<SessionStatus> {
  const sb = getSupabase();
  if (!sb) return "skip";
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "skip";
  try {
    const r = await fetch("/api/sso/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return "unknown";
    return ((await r.json()) as { status: SessionStatus }).status;
  } catch {
    return "unknown";
  }
}

/**
 * Polls the session check about once a minute while the tab is visible (and
 * right away when it becomes visible again). A closed account is signed out;
 * lost rights land on /no-access. "unknown" never signs anyone out.
 */
export function useSsoSessionWatch(signOut: () => Promise<void>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;

    const run = async () => {
      if (document.visibilityState !== "visible") return;
      const status = await checkSsoSession();
      if (stopped) return;
      if (status === "inactive" || status === "noaccess") {
        stopped = true;
        await signOut();
        window.location.replace(status === "inactive" ? "/login?sso=ended" : "/no-access");
      }
    };

    void run();
    const timer = window.setInterval(run, EVERY_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [enabled, signOut]);
}
