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
  const city = sp.get("city") ?? "";

  let query = supabase
    .from("reports")
    .select("id, name, date, location, city, responder_name, responder_phone, created_at, entries")
    .order("created_at", { ascending: false });

  if (me.role !== "admin" && me.city) query = query.eq("city", me.city);
  if (q) query = query.or(`name.ilike.%${q}%,location.ilike.%${q}%,responder_name.ilike.%${q}%`);
  if (city && city !== "All") query = query.eq("city", city);

  const { data: reports, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actor: me,
    action: "export_reports",
    resourceType: "report",
    metadata: { count: reports?.length ?? 0, filters: { q, city } },
  });

  const headers = ["ID", "Report Name", "Incident Date", "Location", "City", "Responder Name", "Responder Phone", "Entry Count", "Created At"];
  const rows = (reports ?? []).map((r) => [
    r.id, r.name, r.date, r.location, r.city ?? "",
    r.responder_name, r.responder_phone,
    Array.isArray(r.entries) ? r.entries.length : 0,
    r.created_at,
  ].map(escapeCSV).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lifetap-reports-${date}.csv"`,
    },
  });
}
