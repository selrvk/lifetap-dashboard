import { requirePersonnel } from "@/lib/auth/personnel";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import AuditTable from "./auditTable";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { me } = await requirePersonnel();
  if (me.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));
  const action = String(sp.action ?? "");
  const actor = String(sp.actor ?? "").trim();

  // Audit log reads use service-role (admin client) so we can join on personnel.
  const admin = createAdminClient();

  let query = admin
    .from("audit_log")
    .select(
      `id, action, resource_type, resource_id, actor_role, created_at, metadata,
       personnel:actor_personnel_id ( full_name, phone )`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (action && action !== "All") query = query.eq("action", action);
  if (actor) query = query.ilike("personnel.full_name", `%${actor}%`);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: entries, count, error } = await query.range(from, to);

  if (error) console.error("Failed to fetch audit log:", error.message);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AuditTable
        entries={(entries ?? []) as unknown as AuditEntry[]}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        personnelName={me.full_name}
        personnelRole={me.role}
      />
    </div>
  );
}

// Re-export the type so auditTable can import it from here
export type AuditEntry = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  actor_role: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
  personnel: { full_name: string; phone: string } | null;
};
