"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Pagination from "@/components/Pagination";
import ExportButton from "@/components/ExportButton";
import { logout } from "@/app/actions/auth";
import { CURRENT_NOTICE_VERSION } from "@/lib/constants/consent";
import type { ConsentChoices, ConsentEvent, ConsentEventType, ConsentPersonRef } from "@/lib/types";
import type { ConsentStats } from "./page";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const EVENT_LABELS: Record<ConsentEventType, string> = {
  given: "Consent given",
  renewed: "Notice renewed",
  changed: "Preferences changed",
  cloud_backup_given: "Cloud backup enabled",
  withdrawn: "Consent withdrawn",
  account_deleted: "Account deleted",
};

const ALL_EVENTS: ConsentEventType[] = ["given", "renewed", "changed", "cloud_backup_given", "withdrawn", "account_deleted"];

type BadgeVariant = "blue" | "teal" | "amber" | "gray" | "purple" | "red";

const EVENT_VARIANT: Record<ConsentEventType, BadgeVariant> = {
  given: "gray",
  renewed: "blue",
  changed: "gray",
  cloud_backup_given: "teal",
  withdrawn: "red",
  account_deleted: "red",
};

function summarizeChoices(choices: ConsentChoices): string {
  if (!choices || Object.keys(choices).length === 0) return "—";
  const parts: string[] = [];
  if (typeof choices.smsAlerts === "boolean") parts.push(`SMS ${choices.smsAlerts ? "on" : "off"}`);
  if (typeof choices.cloudBackup === "boolean") parts.push(`Backup ${choices.cloudBackup ? "on" : "off"}`);
  if (choices.guardian) parts.push("Guardian");
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function sourceLabel(id: string): "App" | "Server" {
  return id.startsWith("srv-") ? "Server" : "App";
}

function recordedLate(occurredAt: string, recordedAt: string): boolean {
  return new Date(recordedAt).getTime() - new Date(occurredAt).getTime() > 60 * 60 * 1000;
}

function Badge({ children, variant = "gray" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span style={{
      background: `var(--badge-${variant}-bg)`, color: `var(--badge-${variant}-fg)`,
      border: `1px solid var(--badge-${variant}-bd)`,
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 600, lineHeight: 1.8, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
      padding: "16px 18px", boxShadow: "var(--shadow-sm)", flex: "1 1 200px", minWidth: 200,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text-5)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  entries: ConsentEvent[];
  owners: ConsentPersonRef[];
  total: number;
  page: number;
  pageSize: number;
  stats: ConsentStats;
  noticeVersions: string[];
  personnelName: string;
  personnelRole: string;
};

export default function ConsentTable({
  entries, owners, total, page, pageSize, stats, noticeVersions, personnelName, personnelRole,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  const [draft, setDraft] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString());
      if (draft) p.set("q", draft); else p.delete("q");
      p.delete("page");
      startTransition(() => router.push(`${pathname}?${p.toString()}`));
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    setDraft(searchParams.get("q") ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("q")]);

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "All") p.set(key, value); else p.delete(key);
    p.delete("page");
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  }

  const eventFilter = searchParams.get("event") ?? "All";
  const versionFilter = searchParams.get("version") ?? "All";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const withdrawalsOnly = searchParams.get("wd") === "1";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .table-root { background: var(--bg); min-height: calc(100vh - 60px); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; }
        .table-main { padding: 32px 32px 48px; max-width: 1400px; margin: 0 auto; }
        .eyebrow { font-size: 10px; font-weight: 700; color: var(--text-5); text-transform: uppercase; letter-spacing: 0.14em; font-family: 'JetBrains Mono', monospace; }
        .consent-row { transition: background 0.1s; cursor: pointer; }
        .consent-row:hover { background: var(--surface-hover) !important; }
        .filter-input, .filter-select, .filter-btn, .count-chip { background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 10px; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s; }
        .filter-input:focus, .filter-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--ring); }
        .filter-input::placeholder { color: var(--text-5); }
        .filter-btn { cursor: pointer; }
        .filter-btn:hover { border-color: var(--border-strong); }
        .filter-btn.active { background: var(--badge-red-bg) !important; border-color: var(--badge-red-bd) !important; color: var(--badge-red-fg) !important; }
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
        .panel thead tr { background: var(--surface-3); border-bottom: 1px solid var(--border); }
        .panel th { padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 700; color: var(--text-5); text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; font-family: 'JetBrains Mono', monospace; }
        @media (max-width: 900px) { .table-main { padding: 20px 16px 40px; } }
      `}</style>

      <NavBar name={personnelName} role={personnelRole} onLogout={logout} />

      <div className="table-root" style={{ opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s" }}>
        <main className="table-main">
          <div style={{ marginBottom: 24 }}>
            <p className="eyebrow">Privacy</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 4 }}>Consent History</h1>
            <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 4 }}>
              {total.toLocaleString("en-US")} event{total !== 1 ? "s" : ""} recorded · Read-only
            </p>
          </div>

          {/* Info note on the limits of this data */}
          <div style={{
            background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 12,
            padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "var(--text-4)", lineHeight: 1.6,
          }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Only people with cloud backup turned on have history here — everyone else&#39;s stays on their phone.</li>
              <li>&ldquo;When&rdquo; comes from the person&#39;s phone clock, which may have been offline at the time.</li>
              <li>Withdrawal and deletion records are kept after an account is gone, as proof the request was carried out, and are deleted along with the rest of the pilot data.</li>
            </ul>
          </div>

          {/* Summary cards */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
            <StatCard label="On Current Notice" value={stats.onCurrentVersion.toLocaleString("en-US")} sub={CURRENT_NOTICE_VERSION} />
            <StatCard label="On Older Notice" value={stats.onOlderVersion.toLocaleString("en-US")} sub="Must re-accept in app" />
            <StatCard label="Withdrawals / Deletions (30d)" value={stats.recentWithdrawals.toLocaleString("en-US")} />
            <StatCard label="SMS Opt-In Rate" value={`${stats.smsOptInRate}%`} />
            <StatCard label="With a Guardian" value={`${stats.guardianShareRate}%`} />
          </div>
          <p style={{ fontSize: 11, color: "var(--text-5)", marginBottom: 20 }}>Only people with cloud backup are counted.</p>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-5)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input className="filter-input" type="text" placeholder="Search name or phone…" value={draft} onChange={(e) => setDraft(e.target.value)}
                style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13 }} />
            </div>

            <select className="filter-select" value={eventFilter} onChange={(e) => setParam("event", e.target.value)} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
              <option value="All">All Events</option>
              {ALL_EVENTS.map((ev) => <option key={ev} value={ev}>{EVENT_LABELS[ev]}</option>)}
            </select>

            <select className="filter-select" value={versionFilter} onChange={(e) => setParam("version", e.target.value)} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
              <option value="All">All Versions</option>
              {noticeVersions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>

            <input className="filter-input" type="date" value={dateFrom} onChange={(e) => setParam("from", e.target.value || null)} style={{ padding: "10px 12px", fontSize: 13 }} />
            <input className="filter-input" type="date" value={dateTo} onChange={(e) => setParam("to", e.target.value || null)} style={{ padding: "10px 12px", fontSize: 13 }} />

            <button
              onClick={() => setParam("wd", withdrawalsOnly ? null : "1")}
              className={`filter-btn${withdrawalsOnly ? " active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-4)" }}
            >
              Withdrawals &amp; Deletions Only
            </button>

            <div className="count-chip" style={{ display: "flex", alignItems: "center", padding: "10px 14px" }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-4)" }}>
                {entries.length}<span style={{ margin: "0 4px", color: "var(--text-6)" }}>/</span>{total.toLocaleString("en-US")}
              </span>
            </div>

            <ExportButton href={`/api/export/consent?${searchParams.toString()}`} />
          </div>

          {/* Table */}
          <div className="panel">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["When", "Person", "Event", "Notice Version", "Choices", "Source"].map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "64px 0", textAlign: "center", color: "var(--text-5)", fontSize: 14 }}>No events match your filters.</td></tr>
                  ) : entries.map((e, i) => {
                    const owner = ownerMap.get(e.owner_id);
                    const isOld = e.notice_version !== CURRENT_NOTICE_VERSION;
                    return (
                      <tr key={e.id} className="consent-row"
                        onClick={() => router.push(`/dashboard/consent/${e.owner_id}`)}
                        style={{ borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="mono" style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                            {formatDateTime(e.occurred_at)}
                          </span>
                          {recordedLate(e.occurred_at, e.recorded_at) && (
                            <p style={{ fontSize: 10, color: "var(--text-6)", marginTop: 2 }} title={`Recorded ${formatDateTime(e.recorded_at)}`}>
                              recorded later (phone offline)
                            </p>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {owner ? (
                            <>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>{owner.n}</p>
                              <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>{owner.phn}</p>
                            </>
                          ) : (
                            <>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-4)" }}>Deleted account</p>
                              <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>{e.owner_id.slice(0, 8)}</p>
                            </>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge variant={EVENT_VARIANT[e.event]}>{EVENT_LABELS[e.event] ?? e.event}</Badge>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className="mono" style={{ fontSize: 12, color: isOld ? "var(--badge-amber-fg)" : "var(--text-3)" }}>
                            {e.notice_version}
                          </span>
                          {isOld && <p style={{ fontSize: 10, color: "var(--badge-amber-fg)", marginTop: 2 }}>Older version</p>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{summarizeChoices(e.choices)}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge variant={sourceLabel(e.id) === "Server" ? "purple" : "gray"}>{sourceLabel(e.id)}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} pageSize={pageSize} total={total} />
        </main>
      </div>
    </>
  );
}
