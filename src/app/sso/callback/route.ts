import { NextResponse, type NextRequest } from "next/server";
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
 *   3. bridge that identity into a real Supabase session — provision the auth
 *      user on first login, then hand off a magic-link action_link. Supabase
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

  const email = String(me.email || "").trim().toLowerCase();
  if (!email) return fail("noemail");

  // ── 3. bridge → Supabase session ─────────────────────────────────────────
  const admin = getSupabaseAdmin();
  if (!admin) return fail("supabase");

  const makeLink = () =>
    admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${cfg.appUrl}/sso/finish` },
    });

  let { data, error } = await makeLink();
  if (error || !data?.properties?.action_link) {
    // first sign-in: the auth user does not exist yet — provision it, then retry
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: me.name ?? email, sub: me.sub != null ? String(me.sub) : undefined },
    });
    ({ data, error } = await makeLink());
    if (error || !data?.properties?.action_link) return fail("link");
  }

  // Keep a display copy of what Onelogin said, refreshed on every login (§4.4:
  // ONE SPACE never owns this data, so it is overwritten, never edited here).
  if (data.user?.id) {
    await admin.auth.admin
      .updateUserById(data.user.id, {
        user_metadata: {
          name: me.name ?? email,
          sub: me.sub != null ? String(me.sub) : undefined,
          iat: me.iat ?? null,
          profile: me.profile ?? null,
          app: me.app ?? null,
        },
      })
      .catch((e) => console.error("[sso] metadata refresh failed", e));
  }

  const res = NextResponse.redirect(data.properties.action_link);
  res.cookies.set("sso_state", "", { path: "/", maxAge: 0 }); // burn the state
  res.cookies.set("sso_pkce", "", { path: "/", maxAge: 0 });
  return res;
}
