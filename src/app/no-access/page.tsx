import { NoAccess } from "./NoAccess";

export const dynamic = "force-dynamic";

/** Signed in at Onelogin, but no rights in ONE SPACE (SSO doc §4.6). The page
 *  must never bounce back to authorize on its own — that would loop forever. */
export default function NoAccessPage() {
  const base = (process.env.SSO_BASE_URL || "https://sso.shd-technology.co.th").replace(/\/$/, "");
  return <NoAccess oneloginUrl={`${base}/dashboard`} />;
}
