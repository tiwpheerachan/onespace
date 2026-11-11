import { NextResponse, type NextRequest } from "next/server";
import { ssoConfig } from "@/lib/sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One tile: an app Onelogin controls centrally that this person can open.
 *  The look fields (colour … badge) let us draw the card exactly like Onelogin's own launcher. */
export interface OneloginApp {
  id: number;
  name: string;
  description: string;
  url: string;
  icon: string;
  /** our own /api/onelogin/logo/<id>?v=<hash> — null = no logo set in Onelogin */
  logo: string | null;
  /** our own /api/onelogin/cover/<id>?v=<hash> — null = no cover, fall back to the colour hero */
  cover: string | null;
  /** app colour (hex), already resolved by Onelogin */
  color: string;
  /** rounded | circle | wide */
  logoShape: string;
  /** health: true ok · false down · null unknown */
  status: boolean | null;
  ownerName: string | null;
  /** external avatar URL (Lark/Google) — safe to use directly */
  ownerAvatar: string | null;
  badge: string;
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
    const apps = (body.apps ?? [])
      .filter((a) => /^https?:\/\//i.test(a.url))
      .map((a) => ({
        ...a,
        logo: ownLogoPath(a.logo),
        cover: ownCoverPath(a.cover),
        // defensive defaults in case Onelogin hasn't shipped the look fields yet
        color: a.color || "#3b7bff",
        logoShape: a.logoShape || "rounded",
        status: a.status ?? null,
        ownerName: a.ownerName ?? null,
        ownerAvatar: a.ownerAvatar ?? null,
        badge: a.badge || "SSO",
      }));
    return NextResponse.json({ apps });
  } catch (e) {
    console.error("[sso] apps/mine error", e);
    return none;
  }
}

/**
 * Onelogin's logo URL needs our API key, so the browser can't load it — point
 * the tile at our proxy instead. Only the id and hash are kept: the proxy always
 * asks SSO_BASE_URL, so the host in Onelogin's answer is never fetched (and may
 * differ from ours behind a custom domain). Anything else shaped is dropped.
 */
function ownLogoPath(logo: string | null | undefined): string | null {
  if (!logo) return null;
  const m = /\/api\/v1\/apps\/logo\/(\d+)\?v=([0-9a-f]{8})$/.exec(logo);
  return m ? `/api/onelogin/logo/${m[1]}?v=${m[2]}` : null;
}

/** Same idea as ownLogoPath, for the cover image (also needs our API key). */
function ownCoverPath(cover: string | null | undefined): string | null {
  if (!cover) return null;
  const m = /\/api\/v1\/apps\/cover\/(\d+)\?v=([0-9a-f]{8})$/.exec(cover);
  return m ? `/api/onelogin/cover/${m[1]}?v=${m[2]}` : null;
}
