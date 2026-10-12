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

/** A hat as Onelogin lists it (API-CONTRACT "หมวก") — one GoodHR assignment. */
export interface OneloginHat {
  assignment_id: string;
  is_primary: boolean;
  is_acting: boolean;
  company?: string | null;
  branch?: string | null;
  department?: string | null;
  job_title?: string | null;
  effective_to?: string | null;
}

export interface Effective {
  hasAccess?: boolean;
  has_access?: boolean;
  roles?: unknown;
  employment?: Employment | null;
  /** hats the person may wear today · null = none to choose (guest, no GoodHR data) */
  assignments?: OneloginHat[] | null;
  assignment_id?: string | null;
}

/** Onelogin refused the hat (closed, moved job, not theirs) — choose again, never fall back to "all hats". */
export const INVALID_HAT = Symbol("invalid_assignment");

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

export async function effectiveRights(baseUrl: string, sub: string): Promise<Effective | null>;
export async function effectiveRights(
  baseUrl: string, sub: string, assignmentId: string,
): Promise<Effective | typeof INVALID_HAT | null>;
export async function effectiveRights(
  baseUrl: string, sub: string, assignmentId?: string,
): Promise<Effective | typeof INVALID_HAT | null> {
  const key = process.env.CENTRAL_API_KEY;
  if (!key) {
    console.error("[sso] CENTRAL_API_KEY missing — can't read rights / employment");
    return null;
  }
  try {
    const r = await fetch(`${baseUrl}/api/v1/authz/effective`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user: sub, ...(assignmentId ? { assignment_id: assignmentId } : {}) }),
      signal: AbortSignal.timeout(6000),
    });
    if (assignmentId && r.status === 400) {
      const body = (await r.json().catch(() => null)) as { error?: string } | null;
      if (body?.error === "invalid_assignment") return INVALID_HAT;
    }
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

/** What app_metadata keeps about hats — the list to show, and the one being worn. */
export interface HatMeta {
  onelogin_hats: { id: string; label: string; isPrimary: boolean; isActing: boolean }[];
  onelogin_hat: string | null;
}

const hatLabel = (h: OneloginHat) =>
  [h.job_title, h.department, h.branch].filter(Boolean).join(" · ") || h.assignment_id;

/**
 * Rights for the hat to wear (plan "แบบ ข": a hat's rights only, never the union).
 *
 * Fewer than two hats = nothing to choose: the plain answer is the right one.
 * Otherwise the preferred hat if Onelogin still accepts it, else the primary —
 * Onelogin refusing a hat (job moved, acting ended) must never fall back to
 * "no hat", because "no hat" is the union of every hat.
 * null = Onelogin couldn't be asked; callers keep what they had.
 */
export async function hatRights(
  baseUrl: string, sub: string, preferred: string | null,
): Promise<{ eff: Effective; hats: HatMeta } | null> {
  const plain = await effectiveRights(baseUrl, sub);
  if (!plain) return null;
  const list = Array.isArray(plain.assignments) ? plain.assignments : [];
  const hats: HatMeta = {
    onelogin_hats: list.map((h) => ({
      id: h.assignment_id, label: hatLabel(h), isPrimary: h.is_primary, isActing: h.is_acting,
    })),
    onelogin_hat: null,
  };
  if (list.length < 2) return { eff: plain, hats };

  const primary = list.find((h) => h.is_primary) ?? list[0];
  const order = [preferred && list.some((h) => h.assignment_id === preferred) ? preferred : null, primary.assignment_id]
    .filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i);
  for (const id of order) {
    const eff = await effectiveRights(baseUrl, sub, id);
    if (eff === INVALID_HAT) continue;
    if (!eff) return null;
    return { eff, hats: { ...hats, onelogin_hat: id } };
  }
  return null;
}
