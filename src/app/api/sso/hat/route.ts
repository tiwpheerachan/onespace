import { NextResponse, type NextRequest } from "next/server";
import { INVALID_HAT, effectiveRights, employmentMeta, hatRights, versionMeta } from "@/lib/onelogin-effective";
import { oneloginRoles, portalRoleKeys } from "@/lib/onelogin-roles";
import { ssoConfig } from "@/lib/sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type HatSwitchStatus = "ok" | "invalid" | "noaccess" | "skip" | "unknown";

/**
 * Switch hats (SSO doc §1.6 · plan "แบบ ข") — the rights of one GoodHR assignment only.
 *
 * The switch must happen here, not in the browser: rights ride in app_metadata
 * (inside the JWT that RLS reads), so a hat chosen client-side would change the
 * menu but not what the database lets the person do. Onelogin decides the
 * hat's rights; a hat it refuses (acting ended, job moved) is answered
 * "invalid" and the hat list is refreshed — never the union of every hat.
 * After "ok" the browser refreshes its session token to pick up the new rights.
 */
export async function POST(req: NextRequest) {
  const reply = (status: HatSwitchStatus) => NextResponse.json({ status });

  const cfg = ssoConfig();
  const admin = getSupabaseAdmin();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!cfg || !admin || !token) return reply("skip");

  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return reply("skip");
  const sub = auth.user.user_metadata?.sub as string | undefined;
  if (!sub) return reply("skip");

  const body = (await req.json().catch(() => null)) as { assignment_id?: unknown } | null;
  const wanted = typeof body?.assignment_id === "string" ? body.assignment_id : "";
  const am = auth.user.app_metadata ?? {};
  const known = Array.isArray(am.onelogin_hats) && am.onelogin_hats.some((h: { id?: string }) => h?.id === wanted);
  if (!wanted || !known) return reply("invalid");

  const eff = await effectiveRights(cfg.baseUrl, sub, wanted);
  if (eff === INVALID_HAT) {
    // the list we showed is out of date — put the person back in a hat Onelogin accepts
    const rights = await hatRights(cfg.baseUrl, sub, null);
    if (rights) {
      await admin.auth.admin.updateUserById(auth.user.id, {
        app_metadata: { ...am, onelogin_roles: oneloginRoles(rights.eff), ...rights.hats, ...versionMeta(rights.eff) },
      });
    }
    return reply("invalid");
  }
  if (!eff) return reply("unknown");

  const roles = oneloginRoles(eff);
  if (eff.hasAccess === false || eff.has_access === false || !portalRoleKeys(roles).length) return reply("noaccess");

  const { error } = await admin.auth.admin.updateUserById(auth.user.id, {
    app_metadata: { ...am, onelogin_roles: roles, onelogin_hat: wanted, ...employmentMeta(eff.employment), ...versionMeta(eff) },
  });
  if (error) {
    console.error("[sso] saving hat failed", error.message);
    return reply("unknown");
  }
  // who wore which hat when — the service role writes it, so the audit trigger keeps it as sent
  const label = (am.onelogin_hats as { id: string; label: string }[]).find((h) => h.id === wanted)?.label ?? wanted;
  await admin
    .from("portal_audit")
    .insert({ actor: auth.user.email ?? sub, action: "assignment.switch", target: label })
    .then(({ error: e }) => e && console.error("[sso] hat audit failed", e.message));
  return reply("ok");
}
