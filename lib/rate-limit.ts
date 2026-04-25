import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentPersonnel } from "@/lib/auth/personnel";

/**
 * Export rate limit — 10 combined exports (users + personnel + reports)
 * per actor per rolling 60-minute window.
 *
 * Uses the audit_log table so no extra infrastructure is needed.
 * The check is per-actor (not per-IP) because the threat model is a
 * single compromised account bulk-exporting PII, not a shared-IP scenario.
 */
const EXPORT_ACTIONS = ["export_users", "export_personnel", "export_reports"] as const;
const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export async function checkExportRateLimit(
  actor: CurrentPersonnel
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("actor_personnel_id", actor.id)
    .in("action", [...EXPORT_ACTIONS])
    .gte("created_at", since);

  if (error) {
    // If the check itself fails, fail open — don't block legitimate exports
    // because of a logging DB issue. Log the error and allow.
    console.error("[rate-limit] audit_log query failed:", error.message);
    return { allowed: true, remaining: LIMIT };
  }

  const used = count ?? 0;

  if (used >= LIMIT) {
    // Tell the client roughly how long until the oldest entry ages out.
    // We don't know the exact oldest timestamp without an extra query,
    // so we return a conservative estimate: wait the full window.
    return { allowed: false, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
  }

  return { allowed: true, remaining: LIMIT - used };
}
