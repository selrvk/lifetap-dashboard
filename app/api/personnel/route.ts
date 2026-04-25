import { NextRequest, NextResponse } from "next/server";
import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { PersonnelRole } from "@/lib/types";

const VALID_ROLES: PersonnelRole[] = ["admin", "medic", "responder"];
const PHONE_RE = /^\+639\d{9}$/;

export async function POST(req: NextRequest) {
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

  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const phone     = typeof body.phone    === "string" ? body.phone.trim()     : "";
  const role      = typeof body.role     === "string" ? body.role             : "";
  const badge_no  = typeof body.badge_no === "string" && body.badge_no.trim()
    ? body.badge_no.trim() : null;
  const organization = typeof body.organization === "string" && body.organization.trim()
    ? body.organization.trim() : null;
  const city      = typeof body.city     === "string" && body.city.trim()
    ? body.city.trim() : null;
  const is_active = body.is_active !== false; // default true

  if (!full_name) {
    return NextResponse.json({ error: "Full name is required." }, { status: 422 });
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: "Phone must be in +639XXXXXXXXX format." },
      { status: 422 }
    );
  }
  if (!VALID_ROLES.includes(role as PersonnelRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 422 });
  }

  // Use admin client so we bypass RLS on insert (admin RLS write policy allows
  // this anyway, but the service-role client avoids any session JWT issues).
  const admin = createAdminClient();

  // Check for duplicate phone
  const { data: existing } = await admin
    .from("personnel")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A personnel account with that phone number already exists." },
      { status: 409 }
    );
  }

  const { data: created, error } = await admin
    .from("personnel")
    .insert({ full_name, phone, role, badge_no, organization, city, is_active })
    .select()
    .single();

  if (error || !created) {
    console.error("Failed to create personnel:", error?.message);
    return NextResponse.json({ error: "Failed to create personnel." }, { status: 500 });
  }

  await logAudit({
    actor: me,
    action: "create_personnel",
    resourceType: "personnel",
    resourceId: created.id,
    metadata: { full_name, phone, role, city },
  });

  return NextResponse.json(created, { status: 201 });
}
