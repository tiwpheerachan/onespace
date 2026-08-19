import { NextResponse, type NextRequest } from "next/server";
import { ssoConfig } from "@/lib/sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The central system redirects back here with ?code&state.
 *
 *   1. check state against the httpOnly cookie (CSRF)
 *   2. exchange the one-time code at /verify for the identity (server-side, so
 *      the client_secret never touches the browser)
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

  if (!cfg) return fail("config");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("sso_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) return fail("state");

  // ── 2. exchange code → identity ──────────────────────────────────────────
  let me: { sub?: string | number; email?: string; name?: string };
  try {
    const r = await fetch(`${cfg.baseUrl}/api/v1/sso/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret }),
    });
    if (!r.ok) {
      // 403 = no access (enforcement on + no role) · 401 = bad credentials
      return fail(r.status === 403 ? "noaccess" : "verify");
    }
    me = await r.json();
  } catch {
    return fail("verify");
  }

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

  const res = NextResponse.redirect(data.properties.action_link);
  res.cookies.set("sso_state", "", { path: "/", maxAge: 0 }); // burn the state
  return res;
}
