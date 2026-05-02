import { NextRequest, NextResponse } from "next/server";
import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { Personnel, PersonnelRole } from "@/lib/types";

const VALID_ROLES: PersonnelRole[] = ["admin", "medic", "responder"];
const PHONE_RE = /^\+639\d{9}$/;

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

  const { data: person, error } = await supabase
    .from("personnel")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAudit({
    actor: me,
    action: "view_personnel_profile",
    resourceType: "personnel",
    resourceId: id,
    metadata: { source: "drawer" },
  });

  return NextResponse.json(person as Personnel);
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

  const admin = createAdminClient();

  // Fetch the target to enforce the "can't change another admin's role" rule
  const { data: target } = await admin
    .from("personnel")
    .select("id, role")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build the update patch — only include fields that were sent
  const patch: Record<string, unknown> = {};

  if ("full_name" in body) {
    const v = typeof body.full_name === "string" ? body.full_name.trim() : "";
    if (!v) return NextResponse.json({ error: "Full name is required." }, { status: 422 });
    patch.full_name = v;
  }

  if ("phone" in body) {
    const v = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!PHONE_RE.test(v)) {
      return NextResponse.json(
        { error: "Phone must be in +639XXXXXXXXX format." },
        { status: 422 }
      );
    }
    // Duplicate phone check (exclude self)
    const { data: dup } = await admin
      .from("personnel")
      .select("id")
      .eq("phone", v)
      .neq("id", id)
      .maybeSingle();
    if (dup) {
      return NextResponse.json(
        { error: "Another account already uses that phone number." },
        { status: 409 }
      );
    }
    patch.phone = v;
  }

  if ("role" in body) {
    const v = body.role as string;
    if (!VALID_ROLES.includes(v as PersonnelRole)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 422 });
    }
    // Lock: cannot demote an existing admin
    if (target.role === "admin" && v !== "admin") {
      return NextResponse.json(
        { error: "Cannot change the role of an admin account." },
        { status: 422 }
      );
    }
    patch.role = v;
  }

  if ("badge_no" in body) {
    patch.badge_no = typeof body.badge_no === "string" && body.badge_no.trim()
      ? body.badge_no.trim() : null;
  }
  if ("organization" in body) {
    patch.organization = typeof body.organization === "string" && body.organization.trim()
      ? body.organization.trim() : null;
  }
  if ("city" in body) {
    patch.city = typeof body.city === "string" && body.city.trim()
      ? body.city.trim() : null;
  }
  if ("is_active" in body) {
    patch.is_active = body.is_active === true || body.is_active === false
      ? body.is_active : undefined;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 422 });
  }

  const { data: updated, error } = await admin
    .from("personnel")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    console.error("Failed to update personnel:", error?.message);
    return NextResponse.json({ error: "Failed to update personnel." }, { status: 500 });
  }

  await logAudit({
    actor: me,
    action: "update_personnel",
    resourceType: "personnel",
    resourceId: id,
    metadata: { fields: Object.keys(patch) },
  });

  return NextResponse.json(updated as Personnel);
}
