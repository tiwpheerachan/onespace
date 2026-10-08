import { NextResponse, type NextRequest } from "next/server";
import { LINK_COOKIE, LINK_TTL_S, signLinkIntent } from "@/lib/sso-link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of linking an old password account to Onelogin. The caller must be
 * signed into that account right now (its Supabase token); we remember who in
 * a signed cookie, and the browser then goes through /sso/login. The callback
 * binds the Onelogin `sub` to this user — never by matching emails.
 */
export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  const user = await requestUser(req);
  if (!admin || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: linked, error } = await admin
    .from("onelogin_link")
    .select("onelogin_sub")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (linked) return NextResponse.json({ error: "already_linked" }, { status: 409 });

  const intent = signLinkIntent(user.id);
  if (!intent) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LINK_COOKIE, intent, {
    httpOnly: true,
    secure: true,
    sameSite: "lax", // sent on the top-level redirect back from Onelogin
    path: "/",
    maxAge: LINK_TTL_S,
  });
  return res;
}
