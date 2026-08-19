"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePortal } from "@/lib/data/store";
import { Splash } from "@/components/Splash";

export default function Home() {
  const router = useRouter();
  const { loading, currentUser } = usePortal();

  useEffect(() => {
    if (loading) return;
    router.replace(currentUser ? "/dashboard" : "/login");
  }, [loading, currentUser, router]);

  return <Splash />;
}
