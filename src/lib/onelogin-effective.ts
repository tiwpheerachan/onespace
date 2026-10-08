/**
 * POST /api/v1/authz/effective — everything Onelogin says one user may do in
 * ONE SPACE, plus their employment state. SERVER ONLY (uses CENTRAL_API_KEY).
 */

/** Employment phase, worked out by Onelogin with the same rule it closes accounts by. */
export type EmploymentPhase = "normal" | "clearing" | "ended";

export interface Employment {
  employee_id?: string | null;
  status?: string | null;
  last_working_date?: string | null;
  access_end_date?: string | null;
  /** null = unknown (guest, or not linked to GoodHR) — never guess */
  phase?: EmploymentPhase | null;
  clearing_until?: string | null;
}

export interface Effective {
  hasAccess?: boolean;
  has_access?: boolean;
  roles?: unknown;
  employment?: Employment | null;
}

/**
 * What we keep about employment in app_metadata (not user-editable; rides in
 * the JWT so RLS can read the phase). Not part of grants_version — it moves
 * with the calendar — so it is re-read at login and every few hours.
 */
export const EMPLOYMENT_REFRESH_MS = 6 * 60 * 60 * 1000;

export function employmentMeta(e: Employment | null | undefined) {
  const phase = e?.phase === "normal" || e?.phase === "clearing" || e?.phase === "ended" ? e.phase : null;
  return {
    onelogin_phase: phase,
    onelogin_clearing_until: phase === "clearing" ? (e?.clearing_until ?? null) : null,
    onelogin_checked_at: new Date().toISOString(),
  };
}

export async function effectiveRights(baseUrl: string, sub: string): Promise<Effective | null> {
  const key = process.env.CENTRAL_API_KEY;
  if (!key) {
    console.error("[sso] CENTRAL_API_KEY missing — can't read rights / employment");
    return null;
  }
  try {
    const r = await fetch(`${baseUrl}/api/v1/authz/effective`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user: sub }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) {
      console.error("[sso] authz/effective failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
      return null;
    }
    return (await r.json()) as Effective;
  } catch (e) {
    console.error("[sso] authz/effective error", e);
    return null;
  }
}
