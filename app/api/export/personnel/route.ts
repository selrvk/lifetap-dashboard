import { NextRequest, NextResponse } from "next/server";
import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { checkExportRateLimit } from "@/lib/rate-limit";

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  let me, supabase;
  try {
    ({ me, supabase } = await requirePersonnel());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkExportRateLimit(me);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Export limit reached. You can export up to 10 times per hour. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) before trying again.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? "";
  const role = sp.get("role") ?? "";
  const activeOnly = sp.get("active") === "1";

  let query = supabase
    .from("personnel")
    .select("id, full_name, phone, role, badge_no, organization, city, is_active, created_at, last_login")
    .order("full_name", { ascending: true });

  if (me.role !== "admin" && me.city) query = query.eq("city", me.city);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,organization.ilike.%${q}%,city.ilike.%${q}%`);
  if (role && role !== "All") query = query.eq("role", role);
  if (activeOnly) query = query.eq("is_active", true);

  const { data: personnel, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actor: me,
    action: "export_personnel",
    resourceType: "personnel",
    metadata: { count: personnel?.length ?? 0, filters: { q, role, activeOnly } },
  });

  const headers = ["ID", "Full Name", "Phone", "Role", "Badge No.", "Organization", "City", "Active", "Created At", "Last Login"];
  const rows = (personnel ?? []).map((p) => [
    p.id, p.full_name, p.phone, p.role,
    p.badge_no ?? "", p.organization ?? "", p.city ?? "",
    p.is_active ? "Yes" : "No",
    p.created_at, p.last_login ?? "",
  ].map(escapeCSV).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lifetap-personnel-${date}.csv"`,
    },
  });
}
