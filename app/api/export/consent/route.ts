import { NextRequest, NextResponse } from "next/server";
import { requirePersonnel } from "@/lib/auth/personnel";
import { logAudit } from "@/lib/audit";
import { checkExportRateLimit } from "@/lib/rate-limit";
import type { ConsentChoices, ConsentEventType } from "@/lib/types";

const WITHDRAWAL_EVENTS: ConsentEventType[] = ["withdrawn", "account_deleted"];

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function summarizeChoices(choices: ConsentChoices): string {
  if (!choices || Object.keys(choices).length === 0) return "";
  const parts: string[] = [];
  if (typeof choices.smsAlerts === "boolean") parts.push(`SMS ${choices.smsAlerts ? "on" : "off"}`);
  if (typeof choices.cloudBackup === "boolean") parts.push(`Backup ${choices.cloudBackup ? "on" : "off"}`);
  if (typeof choices.contactsConfirmed === "boolean") parts.push(`Contacts ${choices.contactsConfirmed ? "confirmed" : "unconfirmed"}`);
  if (choices.guardian) parts.push("Has guardian");
  return parts.join(" · ");
}

export async function GET(req: NextRequest) {
  let me, supabase;
  try {
    ({ me, supabase } = await requirePersonnel());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (me.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = await checkExportRateLimit(me);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Export limit reached. You can export up to 10 times per hour. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) before trying again.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const sp = req.nextUrl.searchParams;
  const eventFilter = sp.get("event") ?? "";
  const versionFilter = sp.get("version") ?? "";
  const dateFrom = sp.get("from") ?? "";
  const dateTo = sp.get("to") ?? "";
  const q = (sp.get("q") ?? "").trim();
  const withdrawalsOnly = sp.get("wd") === "1";

  let matchedOwnerIds: string[] | null = null;
  if (q) {
    const { data: matched } = await supabase
      .from("users")
      .select("id")
      .or(`n.ilike.%${q}%,phn.ilike.%${q}%`);
    matchedOwnerIds = (matched ?? []).map((u) => u.id as string);
    if (matchedOwnerIds.length === 0) {
      return new NextResponse(
        ["Event", "Occurred At", "Recorded At", "Notice Version", "Choices", "Owner ID", "Profile ID"].join(","),
        { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lifetap-consent-${new Date().toISOString().slice(0, 10)}.csv"` } }
      );
    }
  }

  let query = supabase
    .from("consent_events")
    .select("id, owner_id, profile_id, event, notice_version, choices, occurred_at, recorded_at")
    .order("occurred_at", { ascending: false });

  if (eventFilter && eventFilter !== "All") query = query.eq("event", eventFilter);
  if (versionFilter && versionFilter !== "All") query = query.eq("notice_version", versionFilter);
  if (dateFrom) query = query.gte("occurred_at", dateFrom);
  if (dateTo) query = query.lte("occurred_at", dateTo);
  if (withdrawalsOnly) query = query.in("event", WITHDRAWAL_EVENTS);
  if (matchedOwnerIds) query = query.in("owner_id", matchedOwnerIds);

  const { data: events, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actor: me,
    action: "export_consent_history",
    resourceType: "consent_events",
    metadata: { count: events?.length ?? 0, filters: { eventFilter, versionFilter, dateFrom, dateTo, q, withdrawalsOnly } },
  });

  const headers = ["Event", "Occurred At", "Recorded At", "Notice Version", "Choices", "Owner ID", "Profile ID"];
  const rows = (events ?? []).map((e) => [
    e.event, e.occurred_at, e.recorded_at, e.notice_version,
    summarizeChoices(e.choices as ConsentChoices), e.owner_id, e.profile_id ?? "",
  ].map(escapeCSV).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lifetap-consent-${date}.csv"`,
    },
  });
}
