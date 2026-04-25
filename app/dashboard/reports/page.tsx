import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { Report } from "@/lib/types";
import ReportsTable from "./reportsTable";

const PAGE_SIZE = 25;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, me } = await requirePersonnel();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));
  const q = String(sp.q ?? "").trim();
  const city = String(sp.city ?? "");

  let query = supabase
    .from("reports")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (me.role !== "admin" && me.city) {
    query = query.eq("city", me.city);
  }
  if (q) {
    query = query.or(
      `name.ilike.%${q}%,location.ilike.%${q}%,responder_name.ilike.%${q}%,responder_phone.ilike.%${q}%`
    );
  }
  if (city && city !== "All") {
    query = query.eq("city", city);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: reports, count, error } = await query.range(from, to);

  if (error) console.error("Failed to fetch reports:", error.message);

  await logAudit({
    actor: me,
    action: "list_reports",
    resourceType: "report",
    metadata: { page, q, city, count: count ?? 0, scope_city: me.city },
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ReportsTable
        reports={(reports as Report[]) ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        personnelName={me.full_name}
        personnelRole={me.role}
      />
    </div>
  );
}
