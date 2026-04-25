import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentPersonnel } from "@/lib/auth/personnel";

type AuditEntry = {
  actor: CurrentPersonnel;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit({
  actor,
  action,
  resourceType,
  resourceId,
  metadata,
}: AuditEntry): Promise<void> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent") ?? null;

  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    actor_personnel_id: actor.id,
    actor_phone: null,
    actor_role: actor.role,
    action,
    resource_type: resourceType ?? null,
    resource_id: resourceId ?? null,
    metadata: { ...(metadata ?? {}), ip, user_agent: userAgent },
  });

  if (error) {
    // Never let logging failures break the request — but surface in server logs.
    console.error("[audit] failed to write entry:", error.message, { action });
  }
}
