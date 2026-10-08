import { NextResponse, type NextRequest } from "next/server";
import { effectiveRights, employmentMeta } from "@/lib/onelogin-effective";
import { oneloginRoles, portalRoleKeys } from "@/lib/onelogin-roles";
import { ssoConfig } from "@/lib/sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The central system redirects back here with ?code&state.
 *
 *   1. check state against the httpOnly cookie (CSRF)
 *   2. exchange the one-time code (+ PKCE verifier) at /verify for the identity
 *      (server-side, so the client_secret never touches the browser). No access
 *      to ONE SPACE → the /no-access page, never back to authorize (it would loop).
 *   3. bridge that identity into a real Supabase session — find the auth user
 *      by Onelogin `sub` (public.onelogin_link), provision one on first login,
 *      then hand off a magic-link action_link. Supabase
 *      verifies it and lands the browser on /sso/finish with session tokens in
 *      the URL fragment, where the client adopts the session.
 *
 * Everything else in the portal (the client store, RLS) then works unchanged.
 */
export async function GET(req: NextRequest) {
  const cfg = ssoConfig();
  const base = cfg?.appUrl || new URL(req.url).origin;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?sso=${reason}`, base));
  const noAccess = () => {
    const res = NextResponse.redirect(new URL("/no-access", base));
    res.cookies.set("sso_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("sso_pkce", "", { path: "/", maxAge: 0 });
    return res;
  };

  if (!cfg) return fail("config");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("sso_state")?.value;
  const verifier = req.cookies.get("sso_pkce")?.value;
  if (!code || !state || !cookieState || state !== cookieState) return fail("state");

  // ── 2. exchange code → identity ──────────────────────────────────────────
  let me: {
    sub?: string | number;
    email?: string;
    name?: string;
    /** sent back on every /sso/session check */
    iat?: number;
    /** §4.4 additions — null / absent until Onelogin ships them. */
    profile?: Record<string, unknown> | null;
    app?: ({ has_access?: boolean } & Record<string, unknown>) | null;
  };
  try {
    const r = await fetch(`${cfg.baseUrl}/api/v1/sso/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        ...(verifier ? { code_verifier: verifier } : {}),
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      // shows up in Render logs — 401 = bad client_secret, 400 = code expired/used
      console.error("[sso] verify failed", r.status, detail.slice(0, 300));
      // 403 = no access (enforcement on + no role in app)
      return r.status === 403 ? noAccess() : fail(`verify_${r.status}`);
    }
    me = await r.json();
  } catch (e) {
    console.error("[sso] verify error", e);
    return fail("verify");
  }

  // `app` is null while ONE SPACE isn't bound to the permission model yet —
  // only an explicit false means "signed in, but no rights here".
  if (me.app?.has_access === false) return noAccess();
  // Rights come from Onelogin's app.roles (TODO §2); none we know = no rights.
  const roles = oneloginRoles(me.app);
  if (!portalRoleKeys(roles).length) return noAccess();

  // Employment (TODO §4) only comes from /authz/effective. If Onelogin can't
  // answer, the phase stays unknown (null) and nothing changes for the person.
  const employment = employmentMeta((await effectiveRights(cfg.baseUrl, String(me.sub ?? "")))?.employment);
  if (employment.onelogin_phase === "ended") return noAccess();

  const sub = me.sub != null ? String(me.sub).trim() : "";
  if (!sub) return fail("nosub");
  const email = String(me.email || "").trim().toLowerCase();
  if (!email) return fail("noemail");

  // ── 3. bridge → Supabase session ─────────────────────────────────────────
  const admin = getSupabaseAdmin();
  if (!admin) return fail("supabase");

  // The user is found by Onelogin `sub`, never by email (TODO §1): emails change
  // and get reused, so matching on them could hand a new hire someone else's account.
  const findLinked = async () => {
    const { data, error } = await admin
      .from("onelogin_link")
      .select("user_id")
      .eq("onelogin_sub", sub)
      .maybeSingle();
    if (error) throw error;
    return (data?.user_id as string | undefined) ?? null;
  };

  let userId: string | null;
  try {
    userId = await findLinked();
  } catch (e) {
    console.error("[sso] onelogin_link lookup failed", e);
    return fail("supabase");
  }

  if (userId) {
    // Known person — follow an email change made in Onelogin.
    const { data: u, error } = await admin.auth.admin.getUserById(userId);
    if (error || !u?.user) return fail("supabase");
    if ((u.user.email || "").toLowerCase() !== email) {
      const { error: upd } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });
      if (upd) {
        // the new email already belongs to another Supabase user — never merge on our own
        console.error("[sso] email change conflict", { sub, userId, email }, upd.message);
        return fail("conflict");
      }
    }
  } else {
    // First sign-in for this `sub` — always a NEW user. If the email is already
    // taken by someone else, refuse and leave it to an admin.
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: me.name ?? email, sub },
    });
    if (error || !created?.user) {
      console.error("[sso] cannot provision user", { sub, email }, error?.message);
      return fail("conflict");
    }
    const { error: linkErr } = await admin
      .from("onelogin_link")
      .insert({ onelogin_sub: sub, user_id: created.user.id });
    if (linkErr) {
      // lost a race with a parallel login for the same sub — keep the winner
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      try {
        userId = await findLinked();
      } catch {
        userId = null;
      }
      if (!userId) return fail("supabase");
    } else {
      userId = created.user.id;
    }
  }

  // Supabase can only mint a magic link by email; the email now belongs to
  // `userId`, and the check below makes sure the link is for that user.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${cfg.appUrl}/sso/finish` },
  });
  if (error || !data?.properties?.action_link || data.user?.id !== userId) return fail("link");

  // Roles go in app_metadata — users can edit their own user_metadata from the
  // browser, but not this — and it rides in the JWT that RLS reads. It must be
  // saved before the magic link is used, or the session would carry stale rights.
  const { error: rolesErr } = await admin.auth.admin.updateUserById(userId, {
    // name here too: the audit trail stamps it as the actor (supabase/audit_actor.sql)
    app_metadata: { onelogin_roles: roles, name: me.name ?? email, ...employment },
  });
  if (rolesErr) {
    console.error("[sso] saving roles failed", rolesErr.message);
    return fail("supabase");
  }

  // Keep a display copy of what Onelogin said, refreshed on every login (§4.4:
  // ONE SPACE never owns this data, so it is overwritten, never edited here).
  await admin.auth.admin
    .updateUserById(userId, {
      user_metadata: {
        name: me.name ?? email,
        sub,
        iat: me.iat ?? null,
        profile: me.profile ?? null,
        app: me.app ?? null,
      },
    })
    .catch((e) => console.error("[sso] metadata refresh failed", e));

  const res = NextResponse.redirect(data.properties.action_link);
  res.cookies.set("sso_state", "", { path: "/", maxAge: 0 }); // burn the state
  res.cookies.set("sso_pkce", "", { path: "/", maxAge: 0 });
  return res;
}
