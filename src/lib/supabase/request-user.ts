import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * The signed-in Supabase user behind an API request (Bearer access token), or
 * null. SERVER ONLY. Our API routes call this before doing anything.
 */
export async function requestUser(req: NextRequest): Promise<User | null> {
  const admin = getSupabaseAdmin();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!admin || !token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}
