"use client";

import { useState, useMemo } from "react";
import NavBar from "@/components/NavBar";
import { User } from "@/lib/types";
import { logout } from "@/app/actions/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

const BLOOD_TYPES = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = "blue" | "teal" | "red" | "amber" | "gray" | "green";

function Badge({ children, variant = "gray" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const styles: Record<BadgeVariant, React.CSSProperties> = {
    blue:  { background: "#e8f6fd", color: "#1a7da8", border: "1px solid #b8dff0" },
    teal:  { background: "#edfaf6", color: "#1e8a6e", border: "1px solid #b0ead8" },
    red:   { background: "#fff0f0", color: "#c0392b", border: "1px solid #f5c0bc" },
    amber: { background: "#fff8e8", color: "#9a6800", border: "1px solid #f0d898" },
    gray:  { background: "#f2f6f8", color: "#5a8090", border: "1px solid #d8e8ee" },
    green: { background: "#edfaf6", color: "#1e8a6e", border: "1px solid #b0ead8" },
  };
  return (
    <span style={{
      ...styles[variant],
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

// ─── Drawer ──────────────────────────────────────────────────────────────────

function UserDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(13,45,53,0.25)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
        }}
      />
      <aside style={{
        position: "fixed", right: 0, top: 0,
        height: "100%", width: "100%", maxWidth: 440,
        background: "white",
        borderLeft: "1px solid #d4eef5",
        zIndex: 50,
        overflowY: "auto",
        boxShadow: "-8px 0 48px rgba(27,174,232,0.12)",
      }}>
        {/* Gradient header strip */}
        <div style={{
          background: "linear-gradient(135deg, #1BAEE8 0%, #3ECFB2 100%)",
          padding: "24px 24px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Medical Profile
              </p>
              <h2 style={{ color: "white", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {user.n}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                {user.id}
              </p>
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

          {/* Quick stats row */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <QuickStat label="Blood Type" value={user.bt} />
            <QuickStat label="Age" value={`${calcAge(user.dob)} yrs`} />
            {user.od && <QuickStat label="Organ Donor" value="Yes 🫀" />}
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Identity */}
          <Section label="Identity">
            <Grid2>
              <Field label="Date of Birth" value={formatDate(user.dob)} />
              <Field label="Phone" value={user.phn} />
              <Field label="Religion" value={user.rel} />
              <Field label="Barangay" value={user.brg} />
              <Field label="City" value={user.cty} />
              <Field label="Profile">
                <Badge variant={user.is_public ? "blue" : "gray"}>
                  {user.is_public ? "Public" : "Private"}
                </Badge>
              </Field>
            </Grid2>
          </Section>

          {/* Allergies */}
          {user.a.length > 0 && (
            <Section label="⚠ Allergies">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {user.a.map((a) => <Badge key={a} variant="red">{a}</Badge>)}
              </div>
            </Section>
          )}

          {/* Conditions */}
          {user.c.length > 0 && (
            <Section label="Medical Conditions">
              <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {user.c.map((c) => (
                  <li key={c} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "linear-gradient(135deg, #1BAEE8, #3ECFB2)",
                      flexShrink: 0, marginTop: 6,
                    }} />
                    <span style={{ color: "#2d5a68", fontSize: 14 }}>{c}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Medications */}
          {user.meds.length > 0 && (
            <Section label="Medications">
              <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {user.meds.map((m) => (
                  <li key={m} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#1BAEE8", fontSize: 14, marginTop: 1 }}>◆</span>
                    <span style={{ color: "#2d5a68", fontSize: 14 }}>{m}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Next of Kin */}
          {user.kin.length > 0 && (
            <Section label="Next of Kin">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {user.kin.map((k, i) => (
                  <div key={i} style={{
                    padding: "12px 14px",
                    background: "#f7fcfe",
                    border: "1px solid #d4eef5",
                    borderRadius: 10,
                  }}>
                    <p style={{ color: "#0d2d35", fontSize: 14, fontWeight: 600 }}>{k.n}</p>
                    <p style={{ color: "#7aabb5", fontSize: 12, marginTop: 2 }}>{k.r} · {k.p}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <p style={{ color: "#c8dde4", fontSize: 11, fontFamily: "JetBrains Mono, monospace", paddingTop: 8, borderTop: "1px solid #e8f4f8" }}>
            Last updated {formatDate(user.updated_at)}
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
        color: "#9acdd8", fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ flex: 1, height: 1, background: "#e8f4f8", display: "inline-block" }} />
        {label}
        <span style={{ flex: 1, height: 1, background: "#e8f4f8", display: "inline-block" }} />
      </p>
      {children}
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>{children}</div>;
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: "#9acdd8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      {children ?? <p style={{ color: "#2d5a68", fontSize: 13, fontWeight: 500, marginTop: 2 }}>{value || "—"}</p>}
    </div>
  );
}

// ─── Main Table ──────────────────────────────────────────────────────────────

type Props = {
  users: User[];
  personnelName: string;
  personnelRole: string;
};

export default function UsersTable({ users, personnelName, personnelRole }: Props) {
  const [search, setSearch] = useState("");
  const [bloodFilter, setBloodFilter] = useState("All");
  const [organDonorOnly, setOrganDonorOnly] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        u.n.toLowerCase().includes(q) ||
        u.cty.toLowerCase().includes(q) ||
        u.brg.toLowerCase().includes(q) ||
        u.c.some((c) => c.toLowerCase().includes(q)) ||
        u.a.some((a) => a.toLowerCase().includes(q));
      return matchSearch && (bloodFilter === "All" || u.bt === bloodFilter) && (!organDonorOnly || u.od);
    });
  }, [users, search, bloodFilter, organDonorOnly]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f4fafc; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f0f8fb; }
        ::-webkit-scrollbar-thumb { background: #c0dde8; border-radius: 3px; }
        .user-row { transition: background 0.1s; cursor: pointer; }
        .user-row:hover { background: #f0f8fb !important; }
        .filter-input:focus { outline: none; border-color: #1BAEE8 !important; box-shadow: 0 0 0 3px rgba(27,174,232,0.12); }
        .filter-select:focus { outline: none; border-color: #1BAEE8; }
        .donor-btn-active { background: #edfaf6 !important; border-color: #3ECFB2 !important; color: #1e8a6e !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f4fafc" }}>

        <NavBar name={personnelName} role={personnelRole} onLogout={logout} />

        <div style={{ padding: "32px 32px", maxWidth: 1400, margin: "0 auto" }}>

          {/* Page title */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 4, height: 24, borderRadius: 2,
                background: "linear-gradient(to bottom, #1BAEE8, #3ECFB2)",
              }} />
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: "#0d2d35",
                letterSpacing: "-0.02em",
              }}>
                Registered Users
              </h1>
            </div>
            <p style={{ color: "#9acdd8", fontSize: 13, marginLeft: 14 }}>
              {users.length} total record{users.length !== 1 ? "s" : ""} · Click a row to view full profile
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9acdd8" }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="filter-input"
                type="text"
                placeholder="Search name, city, condition, allergy…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 38, paddingRight: 14,
                  paddingTop: 10, paddingBottom: 10,
                  background: "white", border: "1.5px solid #d4eef5",
                  borderRadius: 10, fontSize: 13, color: "#0d2d35",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              />
            </div>

            {/* Blood type */}
            <select
              className="filter-select"
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                background: "white", border: "1.5px solid #d4eef5",
                borderRadius: 10, fontSize: 13, color: "#2d5a68",
                fontFamily: "Plus Jakarta Sans, sans-serif", cursor: "pointer",
              }}
            >
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt === "All" ? "All Blood Types" : bt}</option>
              ))}
            </select>

            {/* Organ donor toggle */}
            <button
              onClick={() => setOrganDonorOnly((v) => !v)}
              className={organDonorOnly ? "donor-btn-active" : ""}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 16px",
                background: "white", border: "1.5px solid #d4eef5",
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                color: "#7aabb5", cursor: "pointer",
                fontFamily: "Plus Jakarta Sans, sans-serif",
                transition: "all 0.15s",
              }}
            >
              🫀 Organ Donors Only
            </button>

            {/* Count chip */}
            <div style={{
              display: "flex", alignItems: "center",
              padding: "10px 14px",
              background: "white", border: "1.5px solid #d4eef5",
              borderRadius: 10,
            }}>
              <span className="mono" style={{ fontSize: 13, color: "#9acdd8" }}>
                {filtered.length}<span style={{ margin: "0 4px", color: "#d4eef5" }}>/</span>{users.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: "white",
            border: "1.5px solid #d4eef5",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 2px 16px rgba(27,174,232,0.06)",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f7fcfe", borderBottom: "1.5px solid #d4eef5" }}>
                    {["Name", "Age / DOB", "Blood", "Location", "Conditions", "Allergies", "Medications", "Status"].map((col) => (
                      <th key={col} style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: 10, fontWeight: 700,
                        color: "#9acdd8",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        whiteSpace: "nowrap",
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "64px 0", textAlign: "center", color: "#9acdd8", fontSize: 14 }}>
                        No records match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user, i) => (
                      <tr
                        key={user.id}
                        className="user-row"
                        onClick={() => setSelected(user)}
                        style={{ borderBottom: i < filtered.length - 1 ? "1px solid #edf5f8" : "none" }}
                      >
                        {/* Name */}
                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#0d2d35", whiteSpace: "nowrap" }}>
                            {user.n}
                          </p>
                          <p className="mono" style={{ fontSize: 11, color: "#b8d8e0", marginTop: 2 }}>{user.id}</p>
                        </td>

                        {/* Age */}
                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 14, color: "#2d5a68", whiteSpace: "nowrap" }}>{calcAge(user.dob)} yrs</p>
                          <p style={{ fontSize: 11, color: "#9acdd8", marginTop: 2 }}>{formatDate(user.dob)}</p>
                        </td>

                        {/* Blood type */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontWeight: 700, fontSize: 15,
                            background: "linear-gradient(135deg, #1BAEE8, #3ECFB2)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}>
                            {user.bt}
                          </span>
                        </td>

                        {/* Location */}
                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 13, color: "#2d5a68", whiteSpace: "nowrap" }}>{user.cty}</p>
                          <p style={{ fontSize: 11, color: "#9acdd8", marginTop: 2, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.brg}
                          </p>
                        </td>

                        {/* Conditions */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {user.c.length === 0
                              ? <span style={{ color: "#c8dde4", fontSize: 12 }}>None</span>
                              : <>
                                  <Badge variant="amber">{user.c[0].length > 22 ? user.c[0].slice(0, 22) + "…" : user.c[0]}</Badge>
                                  {user.c.length > 1 && <Badge variant="gray">+{user.c.length - 1}</Badge>}
                                </>
                            }
                          </div>
                        </td>

                        {/* Allergies */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {user.a.length === 0
                              ? <span style={{ color: "#c8dde4", fontSize: 12 }}>None</span>
                              : <>
                                  <Badge variant="red">{user.a[0]}</Badge>
                                  {user.a.length > 1 && <Badge variant="gray">+{user.a.length - 1}</Badge>}
                                </>
                            }
                          </div>
                        </td>

                        {/* Meds */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontSize: 13, color: user.meds.length === 0 ? "#c8dde4" : "#2d5a68" }}>
                            {user.meds.length === 0 ? "None" : `${user.meds.length} med${user.meds.length !== 1 ? "s" : ""}`}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {user.od && <Badge variant="teal">🫀 Donor</Badge>}
                            <Badge variant={user.is_public ? "blue" : "gray"}>
                              {user.is_public ? "Public" : "Private"}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
    </>
  );
}