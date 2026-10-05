import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Assignment } from "@/lib/types";

/**
 * Where a person's hats come from.
 *
 * Per the SSO plan (§1.6 / §7.1) Onelogin owns this list and sends it in
 * `/api/v1/authz/effective` → `assignments` — phase 3, after GoodHR ships
 * employee_assignment. Until then the live backend has no hats, so everyone
 * works with their single portal role and the switcher stays hidden. Demo mode
 * carries sample hats so the switcher can be tried out.
 */
export async function loadAssignments(email: string): Promise<Assignment[]> {
  if (isSupabaseConfigured) {
    // TODO(phase 3): fetch `assignments` from Onelogin /authz/effective.
    return [];
  }
  return DEMO_ASSIGNMENTS[email.toLowerCase()] ?? [];
}

/** The hat to start with: the last one used if still held, else the primary. */
export function pickDefaultAssignment(list: Assignment[], lastUsedId: string | null) {
  return (
    list.find((a) => a.id === lastUsedId) ??
    list.find((a) => a.isPrimary) ??
    list[0] ??
    null
  );
}

// Demo roles reuse the portal's own role keys (admin / manager / finance / staff).
const DEMO_ASSIGNMENTS: Record<string, Assignment[]> = {
  "manager@shd-technology.co.th": [
    { id: "asg-demo-1", label: "ผู้จัดการฝ่ายปฏิบัติการ · สำนักงานใหญ่", isPrimary: true, roles: ["manager"] },
    { id: "asg-demo-2", label: "เจ้าหน้าที่การเงิน (รักษาการ) · เชียงใหม่", isPrimary: false, roles: ["finance"] },
  ],
  "admin@shd-technology.co.th": [
    { id: "asg-demo-3", label: "ผู้ดูแลระบบ · Corporate IT", isPrimary: true, roles: ["admin"] },
    { id: "asg-demo-4", label: "พนักงาน · คลังสินค้า", isPrimary: false, roles: ["staff"] },
  ],
};
