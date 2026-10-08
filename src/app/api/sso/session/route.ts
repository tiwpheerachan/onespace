import { NextResponse, type NextRequest } from "next/server";
import { EMPLOYMENT_REFRESH_MS, effectiveRights, employmentMeta } from "@/lib/onelogin-effective";
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
  // what we hold (TODO §3). Employment isn't covered by grants_version, so it is
  // re-read every few hours too (TODO §4). Until a reload succeeds nothing is
  // saved, so the next round tries again.
  const held = (meta.app as { grants_version?: string } | null)?.grants_version;
  const grantsChanged = Boolean(central.grants_version && central.grants_version !== held);
  const am = auth.user.app_metadata ?? {};
  const checkedAt = Date.parse(String(am.onelogin_checked_at ?? ""));
  const employmentStale = !(checkedAt > Date.now() - EMPLOYMENT_REFRESH_MS);
  if (!grantsChanged && !employmentStale) return reply("active");
  // a session from before roles lived in app_metadata — leave it to the next login
  if (!grantsChanged && !Array.isArray(am.onelogin_roles)) return reply("active");

  const fresh = await effectiveRights(cfg.baseUrl, sub);
  if (!fresh) return reply("active");
  // only a grants change replaces the roles; an employment refresh keeps them
  const roles = grantsChanged ? oneloginRoles(fresh) : oneloginRoles({ roles: am.onelogin_roles });
  if (grantsChanged && (fresh.hasAccess === false || fresh.has_access === false || !portalRoleKeys(roles).length)) {
    return reply("noaccess");
  }
  const employment = employmentMeta(fresh.employment);
  if (employment.onelogin_phase === "ended") return reply("noaccess");

  const { error } = await admin.auth.admin.updateUserById(auth.user.id, {
    app_metadata: { ...am, onelogin_roles: roles, ...employment },
    ...(grantsChanged && {
      user_metadata: { ...meta, app: { ...(meta.app ?? {}), roles, grants_version: central.grants_version } },
    }),
  });
  if (error) {
    console.error("[sso] saving reloaded rights failed", error.message);
    return reply("active");
  }
  const phaseChanged =
    (am.onelogin_phase ?? null) !== employment.onelogin_phase ||
    (am.onelogin_clearing_until ?? null) !== employment.onelogin_clearing_until;
  return reply(grantsChanged || phaseChanged ? "changed" : "active");
}
