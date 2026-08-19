/**
 * Central-identity (SSO) configuration — server side only.
 *
 * ONE SPACE is registered as a child app on sso.shd-technology.co.th in
 * "app-controlled" mode: the central system answers *who* the visitor is, and
 * the portal keeps its own role model for *what* they may do. So we only need
 * the login handshake (authorize → verify), never the /authz endpoints.
 *
 * client_secret must never reach the browser — it is read here, inside server
 * route handlers, exclusively.
 */
export interface SsoConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  appUrl: string;
  redirectUri: string;
}

export function ssoConfig(): SsoConfig | null {
  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const baseUrl = (process.env.SSO_BASE_URL || "https://sso.shd-technology.co.th").replace(/\/$/, "");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!clientId || !clientSecret || !appUrl) return null;
  return { clientId, clientSecret, baseUrl, appUrl, redirectUri: `${appUrl}/sso/callback` };
}

/** Public flag used by the client only to decide whether to show the SSO button. */
export const ssoEnabledPublic = process.env.NEXT_PUBLIC_SSO_ENABLED === "1";
