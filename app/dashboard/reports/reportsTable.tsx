"use client";

import { useState, useMemo, Fragment } from "react";
import NavBar from "@/components/NavBar";
import { Report } from "@/lib/types";
import { logout } from "@/app/actions/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = "blue" | "teal" | "red" | "amber" | "gray" | "purple";

function Badge({ children, variant = "gray" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span style={{
      background: `var(--badge-${variant}-bg)`,
      color: `var(--badge-${variant}-fg)`,
      border: `1px solid var(--badge-${variant}-bd)`,
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1.8,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--accent-gradient)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      color: "white", fontSize: size < 40 ? 13 : 18, fontWeight: 700,
      letterSpacing: "0.02em",
    }}>
      {initials}
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

function ReportDrawer({ report, onClose }: { report: Report; onClose: () => void }) {
  const entries = Array.isArray(report.entries) ? report.entries : [];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(13,45,53,0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
        }}
      />
      <aside style={{
        position: "fixed", right: 0, top: 0,
        height: "100%", width: "100%", maxWidth: 480,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        zIndex: 50,
        overflowY: "auto",
        boxShadow: "-8px 0 48px rgba(13,45,53,0.2)",
      }}>
        <div style={{
          background: "var(--accent-gradient)",
          padding: "24px 24px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: "rgba(255,255,255,0.25)",
                border: "2px solid rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                  Incident Report
                </p>
                <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {report.name}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  {report.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none", borderRadius: 8,
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "white", flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <QuickStat label="Date" value={formatDate(report.date)} />
            {report.city && <QuickStat label="City" value={report.city} />}
            <QuickStat label="Entries" value={String(entries.length)} />
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <Section label="Incident">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Date" value={formatDate(report.date)} />
              <Field label="City" value={report.city ?? "—"} />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Location" value={report.location} />
              </div>
            </div>
          </Section>

          <Section label="Responder">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Name" value={report.responder_name} />
              <Field label="Phone" value={report.responder_phone} />
            </div>
          </Section>

          <Section label={`Entries (${entries.length})`}>
            {entries.length === 0 ? (
              <p style={{ color: "var(--text-5)", fontSize: 13 }}>No entries recorded.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entries.map((entry, i) => (
                  <EntryCard key={i} index={i} entry={entry} />
                ))}
              </div>
            )}
          </Section>

          <p style={{ color: "var(--text-6)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            Created · {formatDateTime(report.created_at)}
          </p>
        </div>
      </aside>
    </>
  );
}

function EntryCard({ index, entry }: { index: number; entry: unknown }) {
  const isObject = entry !== null && typeof entry === "object" && !Array.isArray(entry);
  return (
    <div style={{
      background: "var(--surface-3)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "10px 12px",
    }}>
      <p style={{
        color: "var(--text-5)", fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.1em",
        fontFamily: "'JetBrains Mono', monospace", marginBottom: 6,
      }}>
        Entry #{index + 1}
      </p>
      {isObject ? (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
          {Object.entries(entry as Record<string, unknown>).map(([k, v]) => (
            <Fragment key={k}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: "var(--text-5)", fontWeight: 600,
              }}>
                {k}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-2)", wordBreak: "break-word" }}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </Fragment>
          ))}
        </div>
      ) : (
        <pre style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, color: "var(--text-2)",
          whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
        }}>
          {typeof entry === "string" ? entry : JSON.stringify(entry, null, 2)}
        </pre>
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.18)",
      border: "1px solid rgba(255,255,255,0.25)",
      borderRadius: 8, padding: "5px 10px",
    }}>
      <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p style={{
        color: "var(--text-5)", fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span style={{ flex: 1, height: 1, background: "var(--border)", display: "inline-block" }} />
        {label}
        <span style={{ flex: 1, height: 1, background: "var(--border)", display: "inline-block" }} />
      </p>
      {children}
    </section>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: "var(--text-5)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
      {children ?? <p style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 500, marginTop: 2 }}>{value || "—"}</p>}
    </div>
  );
}

// ─── Main Table ──────────────────────────────────────────────────────────────

type Props = {
  reports: Report[];
  personnelName: string;
  personnelRole: string;
};

export default function ReportsTable({ reports, personnelName, personnelRole }: Props) {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Report | null>(null);

  const cities = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => { if (r.city) set.add(r.city); });
    return ["All", ...Array.from(set).sort()];
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.responder_name.toLowerCase().includes(q) ||
        r.responder_phone.includes(q) ||
        (r.city ?? "").toLowerCase().includes(q);
      return matchSearch && (cityFilter === "All" || r.city === cityFilter);
    });
  }, [reports, search, cityFilter]);

  const totalEntries = useMemo(
    () => reports.reduce((acc, r) => acc + (Array.isArray(r.entries) ? r.entries.length : 0), 0),
    [reports]
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .table-root {
          background: var(--bg);
          min-height: calc(100vh - 60px);
          color: var(--text);
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: background 0.2s ease;
        }
        .table-main { padding: 32px 32px 48px; max-width: 1400px; margin: 0 auto; }
        .eyebrow {
          font-size: 10px; font-weight: 700; color: var(--text-5);
          text-transform: uppercase; letter-spacing: 0.14em;
          font-family: 'JetBrains Mono', monospace;
        }

        .report-row { transition: background 0.1s; cursor: pointer; }
        .report-row:hover { background: var(--surface-hover) !important; }

        .filter-input, .filter-select, .count-chip, .summary-chip {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 10px;
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--ring);
        }
        .filter-input::placeholder { color: var(--text-5); }

        .panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        .panel thead tr {
          background: var(--surface-3);
          border-bottom: 1px solid var(--border);
        }
        .panel th {
          padding: 12px 16px; text-align: left;
          font-size: 10px; font-weight: 700;
          color: var(--text-5);
          text-transform: uppercase; letter-spacing: 0.1em;
          white-space: nowrap;
          font-family: 'JetBrains Mono', monospace;
        }

        @media (max-width: 900px) { .table-main { padding: 20px 16px 40px; } }
      `}</style>

      <NavBar name={personnelName} role={personnelRole} onLogout={logout} />

      <div className="table-root">
        <main className="table-main">

          {/* Page title */}
          <div style={{ marginBottom: 20 }}>
            <p className="eyebrow">Operations</p>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: "var(--text)",
              letterSpacing: "-0.02em", marginTop: 4,
            }}>
              Reports
            </h1>
            <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 4 }}>
              {reports.length} total report{reports.length !== 1 ? "s" : ""} · Click a row to view details
            </p>
          </div>

          {/* Summary chips */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <div className="summary-chip" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px",
            }}>
              <Badge variant="teal">Total Reports</Badge>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{reports.length}</span>
            </div>
            <div className="summary-chip" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px",
            }}>
              <Badge variant="blue">Total Entries</Badge>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{totalEntries}</span>
            </div>
            <div className="summary-chip" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px",
            }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cities</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>
                {Math.max(0, cities.length - 1)}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-5)" }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="filter-input"
                type="text"
                placeholder="Search name, location, responder, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 38, paddingRight: 14,
                  paddingTop: 10, paddingBottom: 10,
                  fontSize: 13,
                }}
              />
            </div>

            <select
              className="filter-select"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}
            >
              {cities.map((c) => (
                <option key={c} value={c}>{c === "All" ? "All Cities" : c}</option>
              ))}
            </select>

            <div className="count-chip" style={{
              display: "flex", alignItems: "center",
              padding: "10px 14px",
            }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-4)" }}>
                {filtered.length}<span style={{ margin: "0 4px", color: "var(--text-6)" }}>/</span>{reports.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="panel">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Report", "Date", "Location", "City", "Responder", "Entries", "Created"].map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "64px 0", textAlign: "center", color: "var(--text-5)", fontSize: 14 }}>
                        No reports match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((report, i) => {
                      const entryCount = Array.isArray(report.entries) ? report.entries.length : 0;
                      return (
                        <tr
                          key={report.id}
                          className="report-row"
                          onClick={() => setSelected(report)}
                          style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar name={report.name} />
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                                  {report.name}
                                </p>
                                <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>{report.id}</p>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>
                              {formatDate(report.date)}
                            </span>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                              {report.location}
                            </span>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: 13, color: report.city ? "var(--text-2)" : "var(--text-6)" }}>
                              {report.city ?? "—"}
                            </span>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                              {report.responder_name}
                            </p>
                            <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>
                              {report.responder_phone}
                            </p>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <Badge variant={entryCount > 0 ? "blue" : "gray"}>
                              {entryCount} {entryCount === 1 ? "entry" : "entries"}
                            </Badge>
                          </td>

                          <td style={{ padding: "14px 16px" }}>
                            <p style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>{timeAgo(report.created_at)}</p>
                            <p className="mono" style={{ fontSize: 11, color: "var(--text-5)", marginTop: 2, whiteSpace: "nowrap" }}>
                              {formatDate(report.created_at)}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {selected && <ReportDrawer report={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
