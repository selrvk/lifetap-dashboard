"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Pagination from "@/components/Pagination";
import { logout } from "@/app/actions/auth";
import type { AuditEntry } from "./page";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const ACTION_LABELS: Record<string, string> = {
  view_dashboard:        "View dashboard",
  list_users:            "List users",
  list_personnel:        "List personnel",
  list_reports:          "List reports",
  view_user_profile:     "View user profile",
  view_personnel_profile:"View personnel profile",
  view_report:           "View report",
};

const ALL_ACTIONS = ["All", ...Object.keys(ACTION_LABELS)];

type BadgeVariant = "blue" | "teal" | "amber" | "gray" | "purple" | "red";

const ACTION_VARIANT: Record<string, BadgeVariant> = {
  view_user_profile:      "red",
  view_personnel_profile: "purple",
  view_report:            "amber",
  list_users:             "blue",
  list_personnel:         "blue",
  list_reports:           "blue",
  view_dashboard:         "gray",
};

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

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  personnelName: string;
  personnelRole: string;
};

export default function AuditTable({ entries, total, page, pageSize, personnelName, personnelRole }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState(searchParams.get("actor") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString());
      if (draft) p.set("actor", draft); else p.delete("actor");
      p.delete("page");
      startTransition(() => router.push(`${pathname}?${p.toString()}`));
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    setDraft(searchParams.get("actor") ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("actor")]);

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "All") p.set(key, value); else p.delete(key);
    p.delete("page");
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  }

  const actionFilter = searchParams.get("action") ?? "All";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .table-root { background: var(--bg); min-height: calc(100vh - 60px); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; }
        .table-main { padding: 32px 32px 48px; max-width: 1400px; margin: 0 auto; }
        .eyebrow { font-size: 10px; font-weight: 700; color: var(--text-5); text-transform: uppercase; letter-spacing: 0.14em; font-family: 'JetBrains Mono', monospace; }
        .audit-row { transition: background 0.1s; }
        .filter-input, .filter-select, .count-chip { background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 10px; font-family: inherit; transition: border-color 0.15s; }
        .filter-input:focus, .filter-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--ring); }
        .filter-input::placeholder { color: var(--text-5); }
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
        .panel thead tr { background: var(--surface-3); border-bottom: 1px solid var(--border); }
        .panel th { padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 700; color: var(--text-5); text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; font-family: 'JetBrains Mono', monospace; }
        @media (max-width: 900px) { .table-main { padding: 20px 16px 40px; } }
      `}</style>

      <NavBar name={personnelName} role={personnelRole} onLogout={logout} />

      <div className="table-root" style={{ opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s" }}>
        <main className="table-main">
          <div style={{ marginBottom: 24 }}>
            <p className="eyebrow">Security</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 4 }}>Audit Log</h1>
            <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 4 }}>
              {total.toLocaleString("en-US")} event{total !== 1 ? "s" : ""} recorded · Read-only
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-5)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input className="filter-input" type="text" placeholder="Filter by actor name…" value={draft} onChange={(e) => setDraft(e.target.value)}
                style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13 }} />
            </div>

            <select className="filter-select" value={actionFilter} onChange={(e) => setParam("action", e.target.value)} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
              {ALL_ACTIONS.map((a) => <option key={a} value={a}>{a === "All" ? "All Actions" : ACTION_LABELS[a] ?? a}</option>)}
            </select>

            <div className="count-chip" style={{ display: "flex", alignItems: "center", padding: "10px 14px" }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-4)" }}>
                {entries.length}<span style={{ margin: "0 4px", color: "var(--text-6)" }}>/</span>{total.toLocaleString("en-US")}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="panel">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Timestamp", "Actor", "Role", "Action", "Resource", "IP"].map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "64px 0", textAlign: "center", color: "var(--text-5)", fontSize: 14 }}>No events match your filters.</td></tr>
                  ) : entries.map((e, i) => (
                    <tr key={e.id} className="audit-row"
                      style={{ borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                          {formatDateTime(e.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                          {e.personnel?.full_name ?? "—"}
                        </p>
                        <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>
                          {e.personnel?.phone ?? "—"}
                        </p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge variant={e.actor_role === "admin" ? "purple" : e.actor_role === "medic" ? "blue" : "teal"}>
                          {e.actor_role ?? "—"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge variant={ACTION_VARIANT[e.action] ?? "gray"}>
                          {ACTION_LABELS[e.action] ?? e.action}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {e.resource_type ? (
                          <>
                            <span style={{ fontSize: 12, color: "var(--text-3)", textTransform: "capitalize" }}>{e.resource_type}</span>
                            {e.resource_id && (
                              <p className="mono" style={{ fontSize: 10, color: "var(--text-6)", marginTop: 2, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {e.resource_id}
                              </p>
                            )}
                          </>
                        ) : <span style={{ color: "var(--text-6)", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-4)" }}>
                          {(e.metadata?.ip as string) ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
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
