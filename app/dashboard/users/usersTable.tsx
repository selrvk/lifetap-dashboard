"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Pagination from "@/components/Pagination";
import ExportButton from "@/components/ExportButton";
import { User, UserRow } from "@/lib/types";
import { logout } from "@/app/actions/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

const BLOOD_TYPES = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = "blue" | "teal" | "red" | "amber" | "gray" | "green" | "purple";

function Badge({ children, variant = "gray" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const v = variant === "green" ? "teal" : variant;
  return (
    <span style={{
      background: `var(--badge-${v}-bg)`,
      color: `var(--badge-${v}-fg)`,
      border: `1px solid var(--badge-${v}-bd)`,
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

function UserDrawer({
  user,
  isAdmin,
  onClose,
  onToggleActive,
}: {
  user: User;
  isAdmin: boolean;
  onClose: () => void;
  onToggleActive: (newValue: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleToggle() {
    setToggling(true);
    setToggleError(null);
    const next = !user.is_active;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setToggleError((j as { error?: string }).error ?? "Request failed.");
        setConfirming(false);
      } else {
        onToggleActive(next);
      }
    } catch {
      setToggleError("Network error.");
      setConfirming(false);
    } finally {
      setToggling(false);
    }
  }

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
        height: "100%", width: "100%", maxWidth: 440,
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
            <div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Medical Profile
              </p>
              <h2 style={{ color: "white", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {user.n}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {user.id}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
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
            <QuickStat label="Blood Type" value={user.bt || "—"} />
            <QuickStat label="Age" value={user.dob ? `${calcAge(user.dob)} yrs` : "—"} />
            {user.od && <QuickStat label="Organ Donor" value="Yes" />}
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
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

          {user.a.length > 0 && (
            <Section label="Allergies">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {user.a.map((a) => <Badge key={a} variant="red">{a}</Badge>)}
              </div>
            </Section>
          )}

          {user.c.length > 0 && (
            <Section label="Medical Conditions">
              <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {user.c.map((c) => (
                  <li key={c} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--accent-gradient)",
                      flexShrink: 0, marginTop: 6,
                    }} />
                    <span style={{ color: "var(--text-2)", fontSize: 14 }}>{c}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {user.meds.length > 0 && (
            <Section label="Medications">
              <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {user.meds.map((m) => (
                  <li key={m} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--accent)", fontSize: 14, marginTop: 1 }}>◆</span>
                    <span style={{ color: "var(--text-2)", fontSize: 14 }}>{m}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {user.kin.length > 0 && (
            <Section label="Next of Kin">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {user.kin.map((k, i) => (
                  <div key={i} style={{
                    padding: "12px 14px",
                    background: "var(--surface-3)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                  }}>
                    <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>{k.n}</p>
                    <p style={{ color: "var(--text-4)", fontSize: 12, marginTop: 2 }}>{k.r} · {k.p}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section label="Consent">
            <Grid2>
              <Field label="Consent given">
                {user.consent_given_at
                  ? <Badge variant="teal">{formatDate(user.consent_given_at)}</Badge>
                  : <Badge variant="gray">Not recorded</Badge>}
              </Field>
              <Field label="Notice version" value={user.consent_version ?? "—"} />
              {user.consent_withdrawn_at && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Consent withdrawn">
                    <Badge variant="red">{formatDate(user.consent_withdrawn_at)}</Badge>
                  </Field>
                </div>
              )}
            </Grid2>
          </Section>

          {/* Admin-only: deactivate / reactivate */}
          {isAdmin && (
            <section style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <p style={{ color: "var(--text-5)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                Admin Actions
              </p>

              {toggleError && (
                <p style={{ fontSize: 12, color: "var(--badge-red-fg)", marginBottom: 8, background: "var(--badge-red-bg)", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--badge-red-bd)" }}>
                  {toggleError}
                </p>
              )}

              {/* Deactivate — needs confirmation */}
              {user.is_active && !confirming && (
                <>
                  <button
                    onClick={() => setConfirming(true)}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: 10,
                      border: "1px solid var(--badge-red-bd)",
                      background: "var(--badge-red-bg)", color: "var(--badge-red-fg)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    Deactivate Profile
                  </button>
                  <p style={{ fontSize: 11, color: "var(--text-6)", marginTop: 6, lineHeight: 1.5 }}>
                    Hides this profile from all dashboard lists. The record is preserved and reversible.
                  </p>
                </>
              )}

              {/* Confirmation step */}
              {user.is_active && confirming && (
                <div style={{ background: "var(--badge-red-bg)", border: "1px solid var(--badge-red-bd)", borderRadius: 10, padding: "14px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--badge-red-fg)", marginBottom: 4 }}>
                    Deactivate {user.n}?
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.5, marginBottom: 12 }}>
                    This profile will be hidden from all lists immediately. You can reactivate it at any time.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={toggling}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "var(--surface)",
                        color: "var(--text-4)", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleToggle}
                      disabled={toggling}
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 8,
                        border: "none", background: "var(--badge-red-fg)", color: "white",
                        fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                        cursor: toggling ? "not-allowed" : "pointer",
                        opacity: toggling ? 0.6 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {toggling ? "Deactivating…" : "Yes, Deactivate"}
                    </button>
                  </div>
                </div>
              )}

              {/* Reactivate — no confirmation needed, safe action */}
              {!user.is_active && (
                <>
                  <button
                    onClick={handleToggle}
                    disabled={toggling}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: 10,
                      border: "1px solid var(--badge-teal-bd)",
                      background: "var(--badge-teal-bg)", color: "var(--badge-teal-fg)",
                      fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                      cursor: toggling ? "not-allowed" : "pointer",
                      opacity: toggling ? 0.6 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {toggling ? "Reactivating…" : "Reactivate Profile"}
                  </button>
                  <p style={{ fontSize: 11, color: "var(--text-6)", marginTop: 6, lineHeight: 1.5 }}>
                    Makes this profile visible again in all dashboard lists.
                  </p>
                </>
              )}
            </section>
          )}

          <p style={{ color: "var(--text-6)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
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

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>{children}</div>;
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: "var(--text-5)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
      {children ?? <p style={{ color: "var(--text-2)", fontSize: 13, fontWeight: 500, marginTop: 2 }}>{value || "—"}</p>}
    </div>
  );
}

// ─── Drawer skeleton ────────────────────────────────────────────────────────

function DrawerSkeleton({ onClose, loading, notFound }: { onClose: () => void; loading: boolean; notFound?: boolean }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(13,45,53,0.4)", backdropFilter: "blur(4px)", zIndex: 40 }} />
      <aside style={{
        position: "fixed", right: 0, top: 0,
        height: "100%", width: "100%", maxWidth: 440,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "-8px 0 48px rgba(13,45,53,0.2)",
      }}>
        {notFound ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-5)", padding: "0 32px", textAlign: "center" }}>
            <span style={{ fontSize: 32 }}>—</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>Account not found</span>
            <span style={{ fontSize: 13 }}>This user may have deleted their account.</span>
            <button onClick={onClose} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}>
              Close
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-5)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 13 }}>Loading profile…</span>
          </div>
        ) : null}
      </aside>
    </>
  );
}

// ─── Main Table ──────────────────────────────────────────────────────────────

type Props = {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  personnelName: string;
  personnelRole: string;
};

export default function UsersTable({ users, total, page, pageSize, personnelName, personnelRole }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Drawer state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerNotFound, setDrawerNotFound] = useState(false);

  // Debounced search input
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

  // Sync draft when URL changes externally (e.g. back button)
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

  const bloodFilter = searchParams.get("bt") ?? "All";
  const organDonorOnly = searchParams.get("od") === "1";

  // Drawer fetch
  useEffect(() => {
    if (!selectedId) { setFullUser(null); setDrawerNotFound(false); return; }
    let cancelled = false;
    setDrawerLoading(true);
    setDrawerNotFound(false);
    fetch(`/api/users/${selectedId}`)
      .then((r) => {
        if (!cancelled) setDrawerNotFound(!r.ok);
        return r.ok ? r.json() : null;
      })
      .then((data) => { if (!cancelled) { setFullUser(data); setDrawerLoading(false); } })
      .catch(() => { if (!cancelled) { setDrawerLoading(false); } });
    return () => { cancelled = true; };
  }, [selectedId]);

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

        .user-row { transition: background 0.1s; cursor: pointer; }
        .user-row:hover { background: var(--surface-hover) !important; }

        .filter-input, .filter-select, .filter-btn, .count-chip {
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

      <div className="table-root" style={{ opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s" }}>
        <main className="table-main">

          <div style={{ marginBottom: 24 }}>
            <p className="eyebrow">Directory</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 4 }}>
              Registered Users
            </h1>
            <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 4 }}>
              {total.toLocaleString("en-US")} total record{total !== 1 ? "s" : ""} · Click a row to view the full profile
            </p>
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
                placeholder="Search name or city…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
              />
            </div>

            <select
              className="filter-select"
              value={bloodFilter}
              onChange={(e) => setParam("bt", e.target.value)}
              style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}
            >
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt === "All" ? "All Blood Types" : bt}</option>
              ))}
            </select>

            <button
              onClick={() => setParam("od", organDonorOnly ? null : "1")}
              className={`filter-btn${organDonorOnly ? " active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-4)" }}
            >
              Organ Donors Only
            </button>

            <div className="count-chip" style={{ display: "flex", alignItems: "center", padding: "10px 14px" }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-4)" }}>
                {users.length}<span style={{ margin: "0 4px", color: "var(--text-6)" }}>/</span>{total.toLocaleString("en-US")}
              </span>
            </div>

            <ExportButton href={`/api/export/users?${searchParams.toString()}`} />
          </div>

          {/* Table */}
          <div className="panel">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Name", "Age / DOB", "Blood", "Location", "Conditions", "Allergies", "Medications", "Status"].map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "64px 0", textAlign: "center", color: "var(--text-5)", fontSize: 14 }}>
                        No records match your filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((user, i) => (
                      <tr
                        key={user.id}
                        className="user-row"
                        onClick={() => setSelectedId(user.id)}
                        style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>{user.n}</p>
                          <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>{user.id}</p>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <p className="mono" style={{ fontSize: 14, color: "var(--text-2)", whiteSpace: "nowrap" }}>{user.dob ? `${calcAge(user.dob)} yrs` : "—"}</p>
                          <p style={{ fontSize: 11, color: "var(--text-5)", marginTop: 2 }}>{formatDate(user.dob)}</p>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: 15, background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {user.bt || "—"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>{user.cty || "—"}</p>
                          <p style={{ fontSize: 11, color: "var(--text-5)", marginTop: 2, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.brg || "—"}</p>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {user.c.length === 0
                              ? <span style={{ color: "var(--text-6)", fontSize: 12 }}>None</span>
                              : <><Badge variant="amber">{user.c[0].length > 22 ? user.c[0].slice(0, 22) + "…" : user.c[0]}</Badge>
                                {user.c.length > 1 && <Badge variant="gray">+{user.c.length - 1}</Badge>}</>}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {user.a.length === 0
                              ? <span style={{ color: "var(--text-6)", fontSize: 12 }}>None</span>
                              : <><Badge variant="red">{user.a[0]}</Badge>
                                {user.a.length > 1 && <Badge variant="gray">+{user.a.length - 1}</Badge>}</>}
                          </div>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <span className="mono" style={{ fontSize: 13, color: user.meds.length === 0 ? "var(--text-6)" : "var(--text-2)" }}>
                            {user.meds.length === 0 ? "None" : `${user.meds.length} med${user.meds.length !== 1 ? "s" : ""}`}
                          </span>
                        </td>

                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {user.od && <Badge variant="teal">Donor</Badge>}
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

          <Pagination page={page} pageSize={pageSize} total={total} />
        </main>
      </div>

      {selectedId && (
        fullUser
          ? <UserDrawer
              user={fullUser}
              isAdmin={personnelRole === "admin"}
              onClose={() => { setSelectedId(null); setFullUser(null); }}
              onToggleActive={(newValue) => {
                // Optimistically update the local full-user state, then refresh
                // the server list so the deactivated row disappears.
                setFullUser((u) => u ? { ...u, is_active: newValue } : u);
                if (!newValue) {
                  // Profile was deactivated — close drawer and reload list
                  setSelectedId(null);
                  setFullUser(null);
                  startTransition(() => router.refresh());
                }
              }}
            />
          : <DrawerSkeleton onClose={() => { setSelectedId(null); setDrawerNotFound(false); }} loading={drawerLoading} notFound={drawerNotFound} />
      )}
    </>
  );
}
