"use client";

import { useEffect } from "react";
import { Splash } from "@/components/Splash";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Landing spot after the Supabase magic-link verify. The session tokens arrive
 * in the URL fragment (never sent to a server / logged), so we read them here,
 * adopt the session, stamp the portal's own session key, and hard-navigate to
 * the dashboard so the store boots fresh with the authenticated client.
 */
export default function SsoFinish() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const sb = getSupabase();

    (async () => {
      if (!sb || !access_token || !refresh_token) {
        window.location.replace("/login?sso=session");
        return;
      }
      const { data, error } = await sb.auth.setSession({ access_token, refresh_token });
      const email = data?.session?.user?.email;
      if (error || !email) {
        window.location.replace("/login?sso=session");
        return;
      }
      window.localStorage.setItem("nexus.session", email.toLowerCase());
      window.location.replace("/dashboard");
    })();
  }, []);

  return <Splash />;
}
