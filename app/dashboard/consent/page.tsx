import { requirePersonnel } from "@/lib/auth/personnel";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CURRENT_NOTICE_VERSION } from "@/lib/constants/consent";
import type { ConsentChoices, ConsentEvent, ConsentEventType, ConsentPersonRef } from "@/lib/types";
import ConsentTable from "./consentTable";

const PAGE_SIZE = 50;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const WITHDRAWAL_EVENTS: ConsentEventType[] = ["withdrawn", "account_deleted"];

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
}

export type ConsentStats = {
  onCurrentVersion: number;
  onOlderVersion: number;
  recentWithdrawals: number;
  smsOptInRate: number;
  guardianShareRate: number;
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection(); // this page computes a "last 30 days" cutoff from the current time
  const { supabase, me } = await requirePersonnel();
  if (me.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10));
  const eventFilter = String(sp.event ?? "");
  const versionFilter = String(sp.version ?? "");
  const dateFrom = String(sp.from ?? "").trim();
  const dateTo = String(sp.to ?? "").trim();
  const q = String(sp.q ?? "").trim();
  const withdrawalsOnly = sp.wd === "1";

  // ── Stats: pull the whole (lightweight) event stream once, and derive
  // per-owner "latest event" + rates in memory. Only people with cloud
  // backup on ever have rows here, so this stays small for a pilot deployment.
  const { data: allEvents, error: statsError } = await supabase
    .from("consent_events")
    .select("owner_id, event, notice_version, occurred_at, choices")
    .order("occurred_at", { ascending: true });

  if (statsError) console.error("Failed to fetch consent stats:", statsError.message);

  type StatsRow = { owner_id: string; event: ConsentEventType; notice_version: string; occurred_at: string; choices: ConsentChoices };
  const events = (allEvents ?? []) as unknown as StatsRow[];

  const latestByOwner = new Map<string, StatsRow>();
  for (const row of events) latestByOwner.set(row.owner_id, row);

  let onCurrentVersion = 0;
  let onOlderVersion = 0;
  let activeCount = 0;
  let smsOptIn = 0;
  let withGuardian = 0;

  for (const row of latestByOwner.values()) {
    if (WITHDRAWAL_EVENTS.includes(row.event)) continue;
    activeCount++;
    if (row.notice_version === CURRENT_NOTICE_VERSION) onCurrentVersion++;
    else onOlderVersion++;
    const choices = row.choices ?? {};
    if (choices.smsAlerts) smsOptIn++;
    if (choices.guardian) withGuardian++;
  }

  const thirtyDaysAgo = thirtyDaysAgoIso();
  const recentWithdrawals = events.filter(
    (e) => WITHDRAWAL_EVENTS.includes(e.event) && e.occurred_at >= thirtyDaysAgo
  ).length;

  const stats: ConsentStats = {
    onCurrentVersion,
    onOlderVersion,
    recentWithdrawals,
    smsOptInRate: activeCount > 0 ? Math.round((smsOptIn / activeCount) * 100) : 0,
    guardianShareRate: activeCount > 0 ? Math.round((withGuardian / activeCount) * 100) : 0,
  };

  const noticeVersions = Array.from(new Set(events.map((e) => e.notice_version))).sort();

  // ── Filtered, paginated events list ──────────────────────────────────────
  let matchedOwnerIds: string[] | null = null;
  if (q) {
    const { data: matched } = await supabase
      .from("users")
      .select("id")
      .or(`n.ilike.%${q}%,phn.ilike.%${q}%`);
    matchedOwnerIds = (matched ?? []).map((u) => u.id as string);
  }

  let entries: ConsentEvent[] = [];
  let total = 0;

  if (q && matchedOwnerIds && matchedOwnerIds.length === 0) {
    // Search resolved to no one — short-circuit rather than sending an
    // empty .in() filter (which Postgrest rejects).
    entries = [];
    total = 0;
  } else {
    let query = supabase
      .from("consent_events")
      .select("id, owner_id, profile_id, event, notice_version, choices, occurred_at, recorded_at", { count: "exact" })
      .order("occurred_at", { ascending: false });

    if (eventFilter && eventFilter !== "All") query = query.eq("event", eventFilter);
    if (versionFilter && versionFilter !== "All") query = query.eq("notice_version", versionFilter);
    if (dateFrom) query = query.gte("occurred_at", dateFrom);
    if (dateTo) query = query.lte("occurred_at", dateTo);
    if (withdrawalsOnly) query = query.in("event", WITHDRAWAL_EVENTS);
    if (matchedOwnerIds) query = query.in("owner_id", matchedOwnerIds);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count, error } = await query.range(from, to);

    if (error) console.error("Failed to fetch consent events:", error.message);
    entries = (data ?? []) as unknown as ConsentEvent[];
    total = count ?? 0;
  }

  // consent_events has no FK to users — resolve this page's owners separately.
  const ownerIds = Array.from(new Set(entries.map((e) => e.owner_id)));
  let owners: ConsentPersonRef[] = [];
  if (ownerIds.length > 0) {
    const { data } = await supabase.from("users").select("id, n, phn, cty").in("id", ownerIds);
    owners = (data ?? []) as unknown as ConsentPersonRef[];
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ConsentTable
        entries={entries}
        owners={owners}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        stats={stats}
        noticeVersions={noticeVersions}
        personnelName={me.full_name}
        personnelRole={me.role}
      />
    </div>
  );
}
