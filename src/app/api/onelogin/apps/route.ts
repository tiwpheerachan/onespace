import { NextResponse, type NextRequest } from "next/server";
import { ssoConfig } from "@/lib/sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One tile: an app Onelogin controls centrally that this person can open. */
export interface OneloginApp {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
}

/**
 * The person's centrally-controlled Onelogin apps (POST /api/v1/apps/mine).
 *
 * `sub` comes from onelogin_link, never user_metadata — users can edit their
 * own user_metadata, and a forged sub would list someone else's apps.
 * Anything going wrong answers an empty list: the section just doesn't show,
 * the rest of the dashboard is untouched.
 */
export async function GET(req: NextRequest) {
  const none = NextResponse.json({ apps: [] as OneloginApp[] });

  const cfg = ssoConfig();
  const admin = getSupabaseAdmin();
  const key = process.env.CENTRAL_API_KEY;
  if (!cfg || !admin || !key) return none;

  const user = await requestUser(req);
  if (!user) return NextResponse.json({ apps: [] }, { status: 401 });

  const { data: link } = await admin.from("onelogin_link").select("onelogin_sub").eq("user_id", user.id).maybeSingle();
  if (!link?.onelogin_sub) return none;

  try {
    const r = await fetch(`${cfg.baseUrl}/api/v1/apps/mine`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user: link.onelogin_sub }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) {
      console.error("[sso] apps/mine failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return none;
    }
    const body = (await r.json()) as { apps?: OneloginApp[] };
    // only http(s) links reach an <a href> — a stray javascript: URL must never become a tile
    const apps = (body.apps ?? []).filter((a) => /^https?:\/\//i.test(a.url));
    return NextResponse.json({ apps });
  } catch (e) {
    console.error("[sso] apps/mine error", e);
    return none;
  }
}
