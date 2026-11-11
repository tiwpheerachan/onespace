import { NextResponse, type NextRequest } from "next/server";
import { ssoConfig } from "@/lib/sso";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * A Onelogin app cover image, fetched with our API key and served on our own origin.
 * Mirror of /api/onelogin/logo — same guard (the `v` hash), same allowed image types.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const notFound = new NextResponse(null, { status: 404 });
  const cfg = ssoConfig();
  const key = process.env.CENTRAL_API_KEY;
  if (!cfg || !key) return notFound;

  const { id } = await ctx.params;
  const v = req.nextUrl.searchParams.get("v") ?? "";
  if (!/^\d{1,15}$/.test(id) || !/^[0-9a-f]{8}$/.test(v)) return notFound;

  try {
    const r = await fetch(`${cfg.baseUrl}/api/v1/apps/cover/${id}?v=${v}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
    });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !IMAGE_TYPES.has(type)) return notFound;
    const bytes = new Uint8Array(await r.arrayBuffer());
    return new NextResponse(bytes, {
      headers: {
        "content-type": type,
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=604800, immutable",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch (e) {
    console.error("[sso] cover fetch error", e);
    return notFound;
  }
}
