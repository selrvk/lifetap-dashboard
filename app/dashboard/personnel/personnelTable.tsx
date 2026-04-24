"use client";

import { useState, useMemo } from "react";
import NavBar from "@/components/NavBar";
import { Personnel, PersonnelRole } from "@/lib/types";
import { logout } from "@/app/actions/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

const ROLES: Array<"All" | PersonnelRole> = ["All", "admin", "medic", "responder"];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  medic: "Medic",
  responder: "Responder",
};

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

const ROLE_BADGE: Record<PersonnelRole, BadgeVariant> = {
  admin: "purple",
  medic: "blue",
  responder: "teal",
};

function roleBadge(role: PersonnelRole) {
  return <Badge variant={ROLE_BADGE[role]}>{ROLE_LABELS[role]}</Badge>;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
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

function PersonnelDrawer({ person, onClose }: { person: Personnel; onClose: () => void }) {
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
        height: "100%", width: "100%", maxWidth: 420,
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
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                border: "2px solid rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 18, fontWeight: 700,
              }}>
                {person.full_name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")}
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                  Personnel Profile
                </p>
                <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {person.full_name}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  {person.id}
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
            <QuickStat label="Role" value={ROLE_LABELS[person.role]} />
            {person.badge_no && <QuickStat label="Badge" value={person.badge_no} />}
            <QuickStat label="Status" value={person.is_active ? "Active" : "Inactive"} />
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <Section label="Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Phone" value={person.phone} />
              <Field label="Badge No." value={person.badge_no ?? "—"} />
              <Field label="Organization" value={person.organization ?? "—"} />
              <Field label="City" value={person.city ?? "—"} />
              <Field label="Role">{roleBadge(person.role)}</Field>
              <Field label="Account Status">
                <Badge variant={person.is_active ? "teal" : "gray"}>
                  {person.is_active ? "Active" : "Inactive"}
                </Badge>
              </Field>
            </div>
          </Section>

          <Section label="Activity">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Member Since" value={formatDate(person.created_at)} />
              <Field label="Last Login" value={formatDateTime(person.last_login)} />
            </div>
          </Section>

          <p style={{ color: "var(--text-6)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            ID · {person.id}
          </p>
        </div>
      </aside>
    </>
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
  personnel: Personnel[];
  personnelName: string;
  personnelRole: string;
};

export default function PersonnelTable({ personnel, personnelName, personnelRole }: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | PersonnelRole>("All");
  const [activeOnly, setActiveOnly] = useState(false);
  const [selected, setSelected] = useState<Personnel | null>(null);

  const filtered = useMemo(() => {
    return personnel.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.full_name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.organization ?? "").toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q) ||
        (p.badge_no ?? "").toLowerCase().includes(q);
      return (
        matchSearch &&
        (roleFilter === "All" || p.role === roleFilter) &&
        (!activeOnly || p.is_active)
      );
    });
  }, [personnel, search, roleFilter, activeOnly]);

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

        .personnel-row { transition: background 0.1s; cursor: pointer; }
        .personnel-row:hover { background: var(--surface-hover) !important; }

        .filter-input, .filter-select, .filter-btn, .count-chip, .summary-chip {
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
        .filter-btn { cursor: pointer; }
        .filter-btn:hover { border-color: var(--border-strong); }
        .filter-btn.active {
          background: var(--badge-teal-bg) !important;
          border-color: var(--badge-teal-bd) !important;
          color: var(--badge-teal-fg) !important;
        }

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
            <p className="eyebrow">Team</p>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: "var(--text)",
              letterSpacing: "-0.02em", marginTop: 4,
            }}>
              Personnel
            </h1>
            <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 4 }}>
              {personnel.length} total record{personnel.length !== 1 ? "s" : ""} · Click a row to view profile
            </p>
          </div>

          {/* Summary chips */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {(["admin", "medic", "responder"] as PersonnelRole[]).map((r) => {
              const count = personnel.filter((p) => p.role === r).length;
              return (
                <div key={r} className="summary-chip" style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px",
                }}>
                  <Badge variant={ROLE_BADGE[r]}>{ROLE_LABELS[r]}</Badge>
                  <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{count}</span>
                </div>
              );
            })}
            <div className="summary-chip" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px",
            }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Active</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>
                {personnel.filter((p) => p.is_active).length}
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
                placeholder="Search name, phone, organization, city…"
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
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "All" | PersonnelRole)}
              style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r === "All" ? "All Roles" : ROLE_LABELS[r]}</option>
              ))}
            </select>

            <button
              onClick={() => setActiveOnly((v) => !v)}
              className={`filter-btn${activeOnly ? " active" : ""}`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 16px",
                fontSize: 13, fontWeight: 600,
                color: "var(--text-4)",
              }}
            >
              Active Only
            </button>

            <div className="count-chip" style={{
              display: "flex", alignItems: "center",
              padding: "10px 14px",
            }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-4)" }}>
                {filtered.length}<span style={{ margin: "0 4px", color: "var(--text-6)" }}>/</span>{personnel.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="panel">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Name", "Role", "Badge No.", "Organization", "City", "Last Login", "Status"].map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "64px 0", textAlign: "center", color: "var(--text-5)", fontSize: 14 }}>
                        No records match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((person, i) => (
                      <tr
                        key={person.id}
                        className="personnel-row"
                        onClick={() => setSelected(person)}
                        style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={person.full_name} />
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>
                                {person.full_name}
                              </p>
                              <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>{person.phone}</p>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          {roleBadge(person.role)}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span className="mono" style={{ fontSize: 13, color: person.badge_no ? "var(--text-2)" : "var(--text-6)" }}>
                            {person.badge_no ?? "—"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontSize: 13, color: person.organization ? "var(--text-2)" : "var(--text-6)" }}>
                            {person.organization ?? "—"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontSize: 13, color: person.city ? "var(--text-2)" : "var(--text-6)" }}>
                            {person.city ?? "—"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>{timeAgo(person.last_login)}</p>
                          {person.last_login && (
                            <p className="mono" style={{ fontSize: 11, color: "var(--text-5)", marginTop: 2, whiteSpace: "nowrap" }}>
                              {formatDate(person.last_login)}
                            </p>
                          )}
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <Badge variant={person.is_active ? "teal" : "gray"}>
                            {person.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {selected && <PersonnelDrawer person={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
