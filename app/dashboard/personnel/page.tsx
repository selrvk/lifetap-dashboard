import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { Personnel } from "@/lib/types";
import PersonnelTable from "./personnelTable";

const PAGE_SIZE = 50;

export default async function PersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, me } = await requirePersonnel();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));
  const q = String(sp.q ?? "").trim();
  const role = String(sp.role ?? "");
  const activeOnly = sp.active === "1";

  let query = supabase
    .from("personnel")
    .select("*", { count: "exact" })
    .order("full_name", { ascending: true });

  if (me.role !== "admin" && me.city) {
    query = query.eq("city", me.city);
  }
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,organization.ilike.%${q}%,city.ilike.%${q}%,badge_no.ilike.%${q}%`
    );
  }
  if (role && role !== "All") {
    query = query.eq("role", role);
  }
  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: personnel, count, error } = await query.range(from, to);

  if (error) console.error("Failed to fetch personnel:", error.message);

  await logAudit({
    actor: me,
    action: "list_personnel",
    resourceType: "personnel",
    metadata: { page, q, role, activeOnly, count: count ?? 0, scope_city: me.city },
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PersonnelTable
        personnel={(personnel as Personnel[]) ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        personnelName={me.full_name}
        personnelRole={me.role}
      />
    </div>
  );
}
