import { NextResponse, type NextRequest } from "next/server";
import { oneloginRoles, portalRoleKeys } from "@/lib/onelogin-roles";
import { ssoConfig } from "@/lib/sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the browser is told — never Onelogin's raw answer. */
export type SessionStatus =
  | "active" //       still signed in at Onelogin
  | "changed" //      rights were changed centrally and reloaded — refresh the session token
  | "inactive" //     account closed / signed out centrally → sign out here too
  | "noaccess" //     signed in, but no rights in ONE SPACE any more
  | "skip" //         not an SSO session (email login, demo) — nothing to check
  | "unknown"; //     couldn't ask Onelogin — keep the person signed in

/**
 * Session check (SSO doc §4.7 E5) — the portal calls this every ~minute.
 *
 * The browser proves who it is with its Supabase access token; `sub` and `iat`
 * come from the copy the callback saved at login, and client_secret stays on
 * the server. If Onelogin can't be reached we answer "unknown" rather than
 * signing everyone out the moment the central system hiccups.
 */
export async function POST(req: NextRequest) {
  const reply = (status: SessionStatus) => NextResponse.json({ status });

  const cfg = ssoConfig();
  const admin = getSupabaseAdmin();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!cfg || !admin || !token) return reply("skip");

  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return reply("skip");

  const meta = auth.user.user_metadata ?? {};
  const sub = meta.sub as string | undefined;
  const iat = meta.iat as number | undefined;
  if (!sub || iat == null) return reply("skip");

  let central: { active?: boolean; grants_version?: string | null };
  try {
    const r = await fetch(`${cfg.baseUrl}/api/v1/sso/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        sub,
        iat,
        want_grants_version: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error("[sso] session check failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return reply("unknown");
    }
    central = await r.json();
  } catch (e) {
    console.error("[sso] session check error", e);
    return reply("unknown");
  }

  if (central.active === false) return reply("inactive");
  if (central.active !== true) return reply("unknown");
  if (central.grants_version === "no-access") return reply("noaccess");

  // Rights changed centrally → reload them from /authz/effective and overwrite
  // what we hold (TODO §3). Until that succeeds the old version stays saved, so
  // the next round tries again.
  const held = (meta.app as { grants_version?: string } | null)?.grants_version;
  if (central.grants_version && central.grants_version !== held) {
    const fresh = await effectiveRights(cfg.baseUrl, sub);
    if (!fresh) return reply("active");
    const roles = oneloginRoles(fresh);
    if (fresh.hasAccess === false || fresh.has_access === false || !portalRoleKeys(roles).length) {
      return reply("noaccess");
    }
    const { error } = await admin.auth.admin.updateUserById(auth.user.id, {
      app_metadata: { ...(auth.user.app_metadata ?? {}), onelogin_roles: roles },
      user_metadata: {
        ...meta,
        app: { ...(meta.app ?? {}), roles, grants_version: central.grants_version },
      },
    });
    if (error) {
      console.error("[sso] saving reloaded rights failed", error.message);
      return reply("active");
    }
    return reply("changed");
  }
  return reply("active");
}

type Effective = { hasAccess?: boolean; has_access?: boolean; roles?: unknown };

/** POST /api/v1/authz/effective for one user (by `sub`), or null if it can't be had. */
async function effectiveRights(baseUrl: string, sub: string): Promise<Effective | null> {
  const key = process.env.CENTRAL_API_KEY;
  if (!key) {
    console.error("[sso] CENTRAL_API_KEY missing — can't reload rights");
    return null;
  }
  try {
    const r = await fetch(`${baseUrl}/api/v1/authz/effective`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user: sub }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error("[sso] authz/effective failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return null;
    }
    return (await r.json()) as Effective;
  } catch (e) {
    console.error("[sso] authz/effective error", e);
    return null;
  }
}
