import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ask a target URL — server-side — whether it will allow being shown inside our
 * portal's <iframe>. The browser can't tell us this cross-origin (a blocked
 * frame just goes blank), so we read the response headers here and let the
 * viewer show a clear "open in a new tab" message immediately instead of a
 * confusing empty frame.
 *
 * Signed-in users only, and only for a URL registered as a portal app — so this
 * can't be used to make our server fetch arbitrary (internal) addresses. We
 * never proxy the body, just inspect the framing headers.
 */
export async function GET(req: NextRequest) {
  if (!(await requestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const target = new URL(req.url).searchParams.get("url") || "";

  const admin = getSupabaseAdmin();
  const { data: known } = admin
    ? await admin.from("portal_apps").select("id").eq("url", target).limit(1)
    : { data: null };
  if (!known?.length) return NextResponse.json({ embeddable: true, reason: "unknown-app" });

  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return NextResponse.json({ embeddable: true, reason: "invalid-url" });
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return NextResponse.json({ embeddable: true, reason: "non-http" });
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(u.toString(), {
      method: "GET",
      redirect: "manual", // a redirect could point anywhere — read only the app URL itself
      cache: "no-store",
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; OneSpacePortal/1.0)" },
    });
    clearTimeout(timer);

    const xfo = (res.headers.get("x-frame-options") || "").toLowerCase();
    const csp = (res.headers.get("content-security-policy") || "").toLowerCase();

    let embeddable = true;
    let reason = "ok";

    if (xfo.includes("deny")) {
      embeddable = false;
      reason = "x-frame-options: deny";
    } else if (xfo.includes("sameorigin")) {
      embeddable = false;
      reason = "x-frame-options: sameorigin";
    }

    const fa = csp.match(/frame-ancestors([^;]*)/);
    if (fa && fa[1].includes("'none'")) {
      embeddable = false;
      reason = "csp frame-ancestors 'none'";
    }

    return NextResponse.json({ embeddable, reason });
  } catch {
    // Unreachable or timed out — let the client still try the frame; it may be
    // slow rather than blocked, and the frame's own timeout will catch it.
    return NextResponse.json({ embeddable: true, reason: "check-failed" });
  }
}
