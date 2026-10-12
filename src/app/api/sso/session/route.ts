import { NextResponse, type NextRequest } from "next/server";
import { EMPLOYMENT_REFRESH_MS, employmentMeta, hatRights, versionMeta } from "@/lib/onelogin-effective";
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

  // Onelogin says this person is out (signed out / closed / no rights left):
  // end their Supabase sessions here, on every device — not only ask this
  // browser to sign out. A tab left closed, or a copied token, would otherwise
  // keep refreshing. An access token already issued still works until it
  // expires (Supabase JWT expiry), which is the limit of what we can cut.
  const endEverywhere = async (status: "inactive" | "noaccess") => {
    const { error } = await admin.auth.admin.signOut(token, "global");
    if (error) console.error("[sso] ending sessions failed", error.message);
    return reply(status);
  };

  const meta = auth.user.user_metadata ?? {};
  const sub = meta.sub as string | undefined;
  const iat = meta.iat as number | undefined;
  if (!sub || iat == null) return reply("skip");

  // ask in the hat being worn: the union of every hat doesn't move when a right
  // is taken from one hat only, so the worn hat would keep it for hours
  const am = auth.user.app_metadata ?? {};
  const worn = typeof am.onelogin_hat === "string" && am.onelogin_hat ? am.onelogin_hat : null;

  let central: {
    active?: boolean;
    grants_version?: string | null;
    /** Onelogin no longer accepts the worn hat (acting ended, job moved) */
    assignment_error?: string;
    /** absent = an older Onelogin that doesn't send it — fall back to the 6-hour refresh */
    employment_phase?: string | null;
    assignments_version?: string;
  };
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
        ...(worn ? { assignment_id: worn } : {}),
        want_employment: true,
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

  if (central.active === false) return endEverywhere("inactive");
  if (central.active !== true) return reply("unknown");
  // no hat worn = the union has nothing left. A worn hat with nothing left goes
  // through the reload below, which decides on that hat's own answer.
  if (!worn && central.grants_version === "no-access") return endEverywhere("noaccess");

  // Rights changed centrally → reload them from /authz/effective and overwrite
  // what we hold (TODO §3). Employment (TODO §4) is compared every round below;
  // the few-hourly re-read stays as a safety net. Until a reload succeeds
  // nothing is saved, so the next round tries again.
  // Sessions from before app_metadata kept the version fall back to the login copy
  // (a union version) — they reload once, then hold the worn hat's version.
  const held =
    (am.onelogin_grants_version as string | null | undefined) ??
    (meta.app as { grants_version?: string } | null)?.grants_version;
  const grantsChanged = Boolean(central.assignment_error) ||
    Boolean(central.grants_version && central.grants_version !== held);
  // the phase moves with the calendar (clearing starts) and a hat can be added
  // without any right changing — neither shows in grants_version, so Onelogin
  // sends both and we compare every round instead of waiting 6 hours
  const phaseMoved = "employment_phase" in central &&
    (central.employment_phase ?? null) !== (am.onelogin_phase ?? null);
  const hatsMoved = Boolean(central.assignments_version) &&
    central.assignments_version !== (am.onelogin_assignments_version ?? null);
  const checkedAt = Date.parse(String(am.onelogin_checked_at ?? ""));
  const employmentStale = !(checkedAt > Date.now() - EMPLOYMENT_REFRESH_MS);
  if (!grantsChanged && !phaseMoved && !hatsMoved && !employmentStale) return reply("active");
  // a session from before roles lived in app_metadata — leave it to the next login
  if (!grantsChanged && !Array.isArray(am.onelogin_roles)) return reply("active");

  // reload in the hat being worn — a hat Onelogin no longer accepts falls back
  // to the primary, never to the union of every hat (lib/onelogin-effective.ts)
  const rights = await hatRights(cfg.baseUrl, sub, (am.onelogin_hat as string | null | undefined) ?? null);
  if (!rights) return reply("active");
  const fresh = rights.eff;
  // only a grants change replaces the roles; an employment refresh keeps them
  // the hat worn changed underneath (acting ended, job moved) → its rights change too
  const hatSwitched = (am.onelogin_hat ?? null) !== rights.hats.onelogin_hat;
  const roles = grantsChanged || hatSwitched ? oneloginRoles(fresh) : oneloginRoles({ roles: am.onelogin_roles });
  if ((grantsChanged || hatSwitched) && (fresh.hasAccess === false || fresh.has_access === false || !portalRoleKeys(roles).length)) {
    return endEverywhere("noaccess");
  }
  const employment = employmentMeta(fresh.employment);
  if (employment.onelogin_phase === "ended") return endEverywhere("noaccess");

  const { error } = await admin.auth.admin.updateUserById(auth.user.id, {
    app_metadata: {
      ...am, onelogin_roles: roles, ...employment, ...rights.hats,
      // the version goes with the roles: only replaced when they are
      ...(grantsChanged || hatSwitched ? versionMeta(fresh) : {}),
    },
    ...(grantsChanged && {
      user_metadata: { ...meta, app: { ...(meta.app ?? {}), roles, grants_version: fresh.grants_version ?? central.grants_version } },
    }),
  });
  if (error) {
    console.error("[sso] saving reloaded rights failed", error.message);
    return reply("active");
  }
  const phaseChanged =
    (am.onelogin_phase ?? null) !== employment.onelogin_phase ||
    (am.onelogin_clearing_until ?? null) !== employment.onelogin_clearing_until;
  const hatChanged = hatSwitched ||
    JSON.stringify(am.onelogin_hats ?? []) !== JSON.stringify(rights.hats.onelogin_hats);
  return reply(grantsChanged || phaseChanged || hatChanged ? "changed" : "active");
}
