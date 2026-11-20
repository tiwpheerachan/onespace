import { NextResponse, type NextRequest } from "next/server";
import { ssoConfig } from "@/lib/sso";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-user cache of a good apps/mine answer, keyed by Onelogin `sub`. The browser
 * refetches on every dashboard load / tab focus, so without this each one hits
 * Onelogin — apps/mine shares the /authz/* rate budget (429), so ONESPACE-TILES.md
 * asks us to cache ~30-60s. Only *successful* answers (incl. an empty list) are
 * cached; `null` (couldn't ask) is never stored, so a transient failure retries at
 * once and fail-closed stays responsive. In-memory: a Fluid Compute instance reuses
 * it across requests; a cold instance just repopulates. A change in Onelogin shows
 * within the TTL, and is still caught live by the ~1-min /sso/session grants check.
 */
const CACHE_TTL_MS = 45_000;
const idsCache = new Map<string, { ids: number[]; at: number }>();

/**
 * Which Onelogin apps this person may open (POST /api/v1/apps/mine) — only the ids.
 * Catalogue apps linked to one (oneloginAppId) show their tile by this answer, not
 * by portal roles: Onelogin is the one place app access is decided.
 *
 * `ids: null` = we couldn't ask; the browser then hides linked tiles rather than
 * guessing. `sub` comes from onelogin_link, never user_metadata — users can edit
 * their own user_metadata, and a forged sub would read someone else's access.
 */
export async function GET(req: NextRequest) {
  const unknown = NextResponse.json({ ids: null });

  const cfg = ssoConfig();
  const admin = getSupabaseAdmin();
  const key = process.env.CENTRAL_API_KEY;
  if (!cfg || !admin || !key) return unknown;

  const user = await requestUser(req);
  if (!user) return NextResponse.json({ ids: null }, { status: 401 });

  const { data: link } = await admin.from("onelogin_link").select("onelogin_sub").eq("user_id", user.id).maybeSingle();
  // not signed in through Onelogin (break-glass admin) — Onelogin grants them nothing
  if (!link?.onelogin_sub) return NextResponse.json({ ids: [] });
  const sub = link.onelogin_sub;

  const cached = idsCache.get(sub);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return NextResponse.json({ ids: cached.ids });

  try {
    const r = await fetch(`${cfg.baseUrl}/api/v1/apps/mine`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user: sub }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) {
      console.error("[sso] apps/mine failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return unknown;
    }
    const body = (await r.json()) as { apps?: { id: number }[] };
    const ids = (body.apps ?? []).map((a) => Number(a.id));
    idsCache.set(sub, { ids, at: Date.now() });
    return NextResponse.json({ ids });
  } catch (e) {
    console.error("[sso] apps/mine error", e);
    return unknown;
  }
}
