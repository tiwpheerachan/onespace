"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shell } from "@/components/Shell";
import { Splash } from "@/components/Splash";
import { usePortal } from "@/lib/data/store";
import { useSsoSessionWatch } from "@/lib/sso-session";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { loading, currentUser, signOut, reloadRights, supabaseReady } = usePortal();
  const router = useRouter();

  // E5 — follow the central session; non-SSO sessions answer "skip".
  useSsoSessionWatch(signOut, reloadRights, supabaseReady && Boolean(currentUser));

  useEffect(() => {
    if (!loading && !currentUser) router.replace("/login");
  }, [loading, currentUser, router]);

  if (loading || !currentUser) return <Splash />;
  return <Shell>{children}</Shell>;
}
