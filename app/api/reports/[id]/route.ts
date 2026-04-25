import { NextRequest, NextResponse } from "next/server";
import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { Report } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let me;
  let supabase;
  try {
    ({ me, supabase } = await requirePersonnel());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAudit({
    actor: me,
    action: "view_report",
    resourceType: "report",
    resourceId: id,
    metadata: { source: "drawer" },
  });

  return NextResponse.json(report as Report);
}
