import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { UserRow } from "@/lib/types";
import UsersTable from "./usersTable";

const PAGE_SIZE = 50;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, me } = await requirePersonnel();
  const sp = await searchParams;

  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));
  const q = String(sp.q ?? "").trim();
  const bt = String(sp.bt ?? "");
  const od = sp.od === "1";

  let query = supabase
    .from("users")
    .select("id, n, dob, bt, od, cty, brg, a, c, meds, is_public, is_active", { count: "exact" })
    .eq("is_active", true)
    .order("n", { ascending: true });

  if (me.role !== "admin" && me.city) {
    query = query.ilike("cty", `${me.city}%`);
  }
  if (q) {
    query = query.or(`n.ilike.%${q}%,cty.ilike.%${q}%`);
  }
  if (bt && bt !== "All") {
    query = query.eq("bt", bt);
  }
  if (od) {
    query = query.eq("od", true);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: users, count, error } = await query.range(from, to);

  if (error) console.error("Failed to fetch users:", error.message);

  await logAudit({
    actor: me,
    action: "list_users",
    resourceType: "user",
    metadata: { page, q, bt, od, count: count ?? 0, scope_city: me.city },
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <UsersTable
        users={(users as UserRow[]) ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        personnelName={me.full_name}
        personnelRole={me.role}
      />
    </div>
  );
}
