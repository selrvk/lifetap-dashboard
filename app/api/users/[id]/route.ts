import { NextRequest, NextResponse } from "next/server";
import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { User } from "@/lib/types";

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

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAudit({
    actor: me,
    action: "view_user_profile",
    resourceType: "user",
    resourceId: id,
    metadata: { source: "drawer" },
  });

  return NextResponse.json(user as User);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let me;
  try {
    ({ me } = await requirePersonnel());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.is_active !== "boolean") {
    return NextResponse.json({ error: "is_active (boolean) is required." }, { status: 422 });
  }

  const admin = createAdminClient();

  const { data: updated, error } = await admin
    .from("users")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .select("id, is_active")
    .single();

  if (error || !updated) {
    console.error("Failed to update user is_active:", error?.message);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }

  await logAudit({
    actor: me,
    action: body.is_active ? "reactivate_user" : "deactivate_user",
    resourceType: "user",
    resourceId: id,
    metadata: { is_active: body.is_active },
  });

  return NextResponse.json(updated);
}
