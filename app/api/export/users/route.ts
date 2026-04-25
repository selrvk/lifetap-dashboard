import { NextRequest, NextResponse } from "next/server";
import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { checkExportRateLimit } from "@/lib/rate-limit";

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = Array.isArray(val) ? val.join("; ") : String(val);
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
  const bt = sp.get("bt") ?? "";
  const od = sp.get("od") === "1";

  let query = supabase
    .from("users")
    .select("id, n, dob, bt, od, cty, brg, a, c, meds, is_public")
    .order("n", { ascending: true });

  if (me.role !== "admin" && me.city) query = query.ilike("cty", `${me.city}%`);
  if (q) query = query.or(`n.ilike.%${q}%,cty.ilike.%${q}%`);
  if (bt && bt !== "All") query = query.eq("bt", bt);
  if (od) query = query.eq("od", true);

  const { data: users, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actor: me,
    action: "export_users",
    resourceType: "user",
    metadata: { count: users?.length ?? 0, filters: { q, bt, od } },
  });

  const headers = ["ID", "Full Name", "Date of Birth", "Blood Type", "City", "Barangay",
    "Organ Donor", "Public Profile", "Allergies", "Conditions", "Medications"];
  const rows = (users ?? []).map((u) => [
    u.id, u.n, u.dob, u.bt, u.cty, u.brg,
    u.od ? "Yes" : "No",
    u.is_public ? "Public" : "Private",
    u.a, u.c, u.meds,
  ].map(escapeCSV).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lifetap-users-${date}.csv"`,
    },
  });
}
