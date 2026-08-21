import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ask a target URL — server-side — whether it will allow being shown inside our
 * portal's <iframe>. The browser can't tell us this cross-origin (a blocked
 * frame just goes blank), so we read the response headers here and let the
 * viewer show a clear "open in a new tab" message immediately instead of a
 * confusing empty frame.
 *
 * Only admin-configured app URLs reach this, and we never proxy the body — just
 * inspect the framing headers.
 */
export async function GET(req: NextRequest) {
  const target = new URL(req.url).searchParams.get("url") || "";

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
      redirect: "follow",
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
