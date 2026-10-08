import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Self-service linking of an old password account to Onelogin (Onelogin's ask,
 * 8 Oct): only the owner may link — they prove the old account by being signed
 * into it with its password, then prove the Onelogin account by signing in
 * there. Between the two, this signed, short-lived cookie carries "who asked".
 * SERVER ONLY.
 */
export const LINK_COOKIE = "sso_link";
export const LINK_TTL_S = 600;

const key = () => process.env.SSO_CLIENT_SECRET || "";
const mac = (body: string) => createHmac("sha256", key()).update(`sso-link:${body}`).digest("base64url");

export function signLinkIntent(userId: string): string | null {
  if (!key()) return null;
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + LINK_TTL_S * 1000 })).toString("base64url");
  return `${body}.${mac(body)}`;
}

/** The user id that asked to link, or null when the cookie is missing, forged or expired. */
export function readLinkIntent(value: string | undefined): string | null {
  if (!value || !key()) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const want = Buffer.from(mac(body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as { uid?: string; exp?: number };
    return uid && exp && exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}
