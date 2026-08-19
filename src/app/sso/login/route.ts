import { NextResponse } from "next/server";
import { ssoConfig } from "@/lib/sso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kick off the SSO handshake: mint a state token and send the visitor to the
 *  central authorize endpoint. The state is stored in an httpOnly cookie and
 *  checked again in the callback to defend against CSRF. */
export function GET() {
  const cfg = ssoConfig();
  if (!cfg) {
    return NextResponse.redirect(
      new URL("/login?sso=config", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    );
  }

  const state = crypto.randomUUID();
  const authorize = new URL(`${cfg.baseUrl}/api/v1/sso/authorize`);
  authorize.searchParams.set("client_id", cfg.clientId);
  authorize.searchParams.set("redirect_uri", cfg.redirectUri);
  authorize.searchParams.set("state", state);

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set("sso_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes — the code itself lives only 60s
  });
  return res;
}
