/**
 * Central-identity (SSO) configuration — server side only.
 *
 * ONE SPACE is app 13 on sso.shd-technology.co.th. The central system answers
 * *who* the visitor is and, through `app.roles`, *what* they may do here — see
 * src/lib/onelogin-roles.ts for how those map onto portal roles.
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

/** Onelogin's page listing every app the person can open (TODO §6). */
export const oneloginDashboardUrl = `${(process.env.NEXT_PUBLIC_SSO_BASE_URL || "https://sso.shd-technology.co.th").replace(/\/$/, "")}/dashboard`;

/** Public flag used by the client only to decide whether to show the SSO button. */
export const ssoEnabledPublic = process.env.NEXT_PUBLIC_SSO_ENABLED === "1";
