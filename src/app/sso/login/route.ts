import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ssoConfig } from "@/lib/sso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kick off the SSO handshake: mint a state token and send the visitor to the
 *  central authorize endpoint. The state is stored in an httpOnly cookie and
 *  checked again in the callback to defend against CSRF.
 *
 *  PKCE (S256 only — SSO doc §4.7 E7): a random verifier stays in an httpOnly
 *  cookie, only its SHA-256 challenge travels to the authorize URL, and the
 *  callback proves possession by sending the verifier with the code. A leaked
 *  code + client_secret is then useless without the browser that started it. */
export function GET() {
  const cfg = ssoConfig();
  if (!cfg) {
    return NextResponse.redirect(
      new URL("/login?sso=config", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    );
  }

  const state = crypto.randomUUID();
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const authorize = new URL(`${cfg.baseUrl}/api/v1/sso/authorize`);
  authorize.searchParams.set("client_id", cfg.clientId);
  authorize.searchParams.set("redirect_uri", cfg.redirectUri);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authorize.toString());
  const cookie = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes — the code itself lives only 60s
  };
  res.cookies.set("sso_state", state, cookie);
  res.cookies.set("sso_pkce", verifier, cookie);
  return res;
}
