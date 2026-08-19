"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shell } from "@/components/Shell";
import { Splash } from "@/components/Splash";
import { usePortal } from "@/lib/data/store";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { loading, currentUser } = usePortal();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) router.replace("/login");
  }, [loading, currentUser, router]);

  if (loading || !currentUser) return <Splash />;
  return <Shell>{children}</Shell>;
}
