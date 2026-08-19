import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy to the central directory search (Step G). The CENTRAL_API_KEY is read
 * here on the server only — the browser never sees it. We pass through just the
 * fields the picker needs and never persist anything: the directory is PII on
 * loan from Lark, not ours to keep.
 */
export async function GET(req: NextRequest) {
  const key = process.env.CENTRAL_API_KEY;
  const base = (process.env.SSO_BASE_URL || "https://sso.shd-technology.co.th").replace(/\/$/, "");
  const q = (new URL(req.url).searchParams.get("q") || "").trim();

  // Fail soft — the picker just shows "no results" rather than breaking the page.
  if (!key) return NextResponse.json({ items: [], error: "not_configured" });
  if (q.length < 2) return NextResponse.json({ items: [] });

  try {
    const r = await fetch(`${base}/api/v1/directory/search?q=${encodeURIComponent(q)}`, {
      headers: { authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ items: [], error: `upstream_${r.status}` });
    const data = await r.json();
    const items = (data.items || []).slice(0, 20).map((p: Record<string, unknown>) => ({
      name: p.name,
      en_name: p.en_name,
      email: p.email,
      job_title: p.job_title,
      departments: p.departments,
      avatar_url: p.avatar_url,
      status: p.status,
    }));
    return NextResponse.json({ items, synced_at: data.synced_at, stale: data.stale });
  } catch {
    return NextResponse.json({ items: [], error: "fetch_failed" });
  }
}
