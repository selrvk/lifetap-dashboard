"use client";

import { useState, useEffect, useTransition, useMemo, Fragment } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Pagination from "@/components/Pagination";
import ExportButton from "@/components/ExportButton";
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

          <EntriesSection entries={entries} />


          <p style={{ color: "var(--text-6)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            Created · {formatDateTime(report.created_at)}
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── Entry Schema ────────────────────────────────────────────────────────────

type Kin = { n?: string; p?: string; r?: string };
type EntryShape = {
  id?: string;
  n?: string;
  bt?: string;
  dob?: string;
  a?: unknown;
  c?: unknown;
  meds?: unknown;
  kin?: unknown;
  smsSent?: unknown;
  scannedAt?: unknown;
  [k: string]: unknown;
};

const FIELD_LABELS: Record<string, string> = {
  n: "Name",
  bt: "Blood Type",
  id: "ID",
  dob: "Date of Birth",
  a: "Allergies",
  c: "Conditions",
  meds: "Medications",
  kin: "Next of Kin",
  smsSent: "SMS Sent",
  scannedAt: "Scanned At",
};

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

function parseKin(v: unknown): Kin[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x && typeof x === "object" ? (x as Kin) : null))
    .filter((x): x is Kin => x !== null);
}

function entryAge(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return years >= 0 && years < 150 ? years : null;
}

function formatScannedAt(v: unknown): string {
  if (typeof v === "number") return formatDateTime(new Date(v).toISOString());
  if (typeof v === "string") return formatDateTime(v);
  return "—";
}

function bloodTypeVariant(bt?: string): BadgeVariant {
  if (!bt) return "gray";
  if (bt.includes("-")) return "red";
  if (bt.startsWith("O")) return "teal";
  if (bt.startsWith("A")) return "blue";
  if (bt.startsWith("B")) return "purple";
  return "amber";
}

function entryHaystack(e: EntryShape): string {
  const parts: string[] = [];
  if (e.n) parts.push(String(e.n));
  if (e.id) parts.push(String(e.id));
  if (e.bt) parts.push(String(e.bt));
  if (e.dob) parts.push(String(e.dob));
  parts.push(...toArray(e.a));
  parts.push(...toArray(e.c));
  parts.push(...toArray(e.meds));
  parseKin(e.kin).forEach((k) => {
    if (k.n) parts.push(k.n);
    if (k.p) parts.push(k.p);
    if (k.r) parts.push(k.r);
  });
  return parts.join(" ").toLowerCase();
}

// ─── Entries Section ─────────────────────────────────────────────────────────

function EntriesSection({ entries }: { entries: unknown[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const normalized = useMemo(
    () =>
      entries.map((e, i) => ({
        i,
        raw: e,
        obj:
          e && typeof e === "object" && !Array.isArray(e)
            ? (e as EntryShape)
            : null,
      })),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((n) => {
      if (!n.obj) return JSON.stringify(n.raw).toLowerCase().includes(q);
      return entryHaystack(n.obj).includes(q);
    });
  }, [normalized, query]);

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const allOpen = filtered.length > 0 && filtered.every((n) => expanded.has(n.i));
  const toggleAll = () => {
    if (allOpen) setExpanded(new Set());
    else setExpanded(new Set(filtered.map((n) => n.i)));
  };

  return (
    <Section label={`Entries (${entries.length})`}>
      {entries.length === 0 ? (
        <p style={{ color: "var(--text-5)", fontSize: 13 }}>No entries recorded.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <svg
                style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", color: "var(--text-5)",
                }}
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="filter-input"
                type="text"
                placeholder="Search name, ID, blood type, allergy, kin…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 30, paddingRight: 12,
                  paddingTop: 8, paddingBottom: 8, fontSize: 12,
                }}
              />
            </div>
            <button
              onClick={toggleAll}
              className="mono"
              style={{
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 10px",
                fontSize: 10, fontWeight: 700, color: "var(--text-4)",
                textTransform: "uppercase", letterSpacing: "0.08em",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {allOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          <p className="mono" style={{ fontSize: 10, color: "var(--text-5)", marginBottom: 8 }}>
            {filtered.length} / {entries.length} shown
          </p>

          {filtered.length === 0 ? (
            <p style={{ color: "var(--text-5)", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
              No entries match your search.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(({ i, raw, obj }) => (
                <EntryCard
                  key={i}
                  index={i}
                  entry={raw}
                  obj={obj}
                  open={expanded.has(i)}
                  onToggle={() => toggle(i)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function EntryCard({
  index,
  entry,
  obj,
  open,
  onToggle,
}: {
  index: number;
  entry: unknown;
  obj: EntryShape | null;
  open: boolean;
  onToggle: () => void;
}) {
  if (!obj) {
    return (
      <div style={{
        background: "var(--surface-3)",
        border: "1px solid var(--border)",
        borderRadius: 10, padding: "10px 12px",
      }}>
        <p className="mono" style={{
          color: "var(--text-5)", fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6,
        }}>
          Entry #{index + 1}
        </p>
        <pre style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, color: "var(--text-2)",
          whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0,
        }}>
          {typeof entry === "string" ? entry : JSON.stringify(entry, null, 2)}
        </pre>
      </div>
    );
  }

  const name = typeof obj.n === "string" && obj.n ? obj.n : "Unnamed";
  const bt = typeof obj.bt === "string" ? obj.bt : "";
  const id = typeof obj.id === "string" ? obj.id : "";
  const dob = typeof obj.dob === "string" ? obj.dob : "";
  const age = entryAge(dob);
  const allergies = toArray(obj.a);
  const conditions = toArray(obj.c);
  const meds = toArray(obj.meds);
  const kin = parseKin(obj.kin);
  const sms = obj.smsSent === true;

  const knownKeys = new Set(["n", "bt", "id", "dob", "a", "c", "meds", "kin", "smsSent", "scannedAt"]);
  const extras = Object.entries(obj).filter(([k]) => !knownKeys.has(k));

  return (
    <div style={{
      background: "var(--surface-3)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", textAlign: "left", background: "transparent",
          border: "none", cursor: "pointer", padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 12,
          color: "inherit", fontFamily: "inherit",
        }}
      >
        <Avatar name={name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{name}</p>
            {bt && <Badge variant={bloodTypeVariant(bt)}>{bt}</Badge>}
            {age !== null && (
              <span className="mono" style={{ fontSize: 11, color: "var(--text-5)" }}>
                {age} yrs
              </span>
            )}
            {sms && <Badge variant="teal">SMS sent</Badge>}
          </div>
          <p className="mono" style={{ fontSize: 10, color: "var(--text-6)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {id || `Entry #${index + 1}`}
          </p>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          style={{
            color: "var(--text-5)", flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "12px",
          display: "flex", flexDirection: "column", gap: 12,
          background: "var(--surface)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
            <Field label="Date of Birth" value={dob ? formatDate(dob) : "—"} />
            <Field label="Blood Type" value={bt || "—"} />
          </div>

          <ChipList label="Allergies" items={allergies} variant="red" emptyText="None recorded" />
          <ChipList label="Conditions" items={conditions} variant="amber" emptyText="None recorded" />
          <ChipList label="Medications" items={meds} variant="purple" emptyText="None recorded" />

          <div>
            <p className="mono" style={{
              color: "var(--text-5)", fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
            }}>
              Next of Kin
            </p>
            {kin.length === 0 ? (
              <p style={{ color: "var(--text-5)", fontSize: 12 }}>None recorded</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {kin.map((k, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px",
                    background: "var(--surface-3)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}>
                    <Avatar name={k.n || "?"} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                          {k.n || "—"}
                        </span>
                        {k.r && <Badge variant="gray">{k.r}</Badge>}
                      </div>
                      {k.p && (
                        <a
                          href={`tel:${k.p}`}
                          className="mono"
                          style={{
                            fontSize: 11, color: "var(--accent)",
                            textDecoration: "none", marginTop: 2, display: "inline-block",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {k.p}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between",
            paddingTop: 8, borderTop: "1px solid var(--border)",
            gap: 12, flexWrap: "wrap",
          }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-6)" }}>
              Scanned · {formatScannedAt(obj.scannedAt)}
            </span>
            {id && (
              <span className="mono" style={{ fontSize: 10, color: "var(--text-6)", wordBreak: "break-all" }}>
                {id}
              </span>
            )}
          </div>

          {extras.length > 0 && (
            <div>
              <p className="mono" style={{
                color: "var(--text-5)", fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
              }}>
                Other
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                {extras.map(([k, v]) => (
                  <Fragment key={k}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--text-5)", fontWeight: 600 }}>
                      {FIELD_LABELS[k] ?? k}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-2)", wordBreak: "break-word" }}>
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChipList({
  label, items, variant, emptyText,
}: { label: string; items: string[]; variant: BadgeVariant; emptyText: string }) {
  return (
    <div>
      <p className="mono" style={{
        color: "var(--text-5)", fontSize: 10, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
      }}>
        {label}
      </p>
      {items.length === 0 ? (
        <p style={{ color: "var(--text-5)", fontSize: 12 }}>{emptyText}</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((it, i) => (
            <Badge key={i} variant={variant}>{it}</Badge>
          ))}
        </div>
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
  total: number;
  page: number;
  pageSize: number;
  personnelName: string;
  personnelRole: string;
};


function DrawerSkeleton({ onClose, loading }: { onClose: () => void; loading: boolean }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(13,45,53,0.4)", backdropFilter: "blur(4px)", zIndex: 40 }} />
      <aside style={{
        position: "fixed", right: 0, top: 0,
        height: "100%", width: "100%", maxWidth: 480,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "-8px 0 48px rgba(13,45,53,0.2)",
      }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-5)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 13 }}>Loading report…</span>
          </div>
        )}
      </aside>
    </>
  );
}

export default function ReportsTable({ reports, total, page, pageSize, personnelName, personnelRole }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullReport, setFullReport] = useState<Report | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
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

  const cityFilter = searchParams.get("city") ?? "All";

  useEffect(() => {
    if (!selectedId) { setFullReport(null); return; }
    let cancelled = false;
    setDrawerLoading(true);
    fetch(`/api/reports/${selectedId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) { setFullReport(data); setDrawerLoading(false); } })
      .catch(() => { if (!cancelled) setDrawerLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const cities = ["All", ...Array.from(new Set(reports.map((r) => r.city).filter(Boolean) as string[])).sort()];
  const pageEntries = reports.reduce((acc, r) => acc + (Array.isArray(r.entries) ? r.entries.length : 0), 0);

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

      <div className="table-root" style={{ opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s" }}>
        <main className="table-main">

          {/* Page title */}
          <div style={{ marginBottom: 20 }}>
            <p className="eyebrow">Operations</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 4 }}>
              Reports
            </h1>
            <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 4 }}>
              {total.toLocaleString("en-US")} total report{total !== 1 ? "s" : ""} · Click a row to view details
            </p>
          </div>

          {/* Summary chips */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <div className="summary-chip" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}>
              <Badge variant="teal">Total Reports</Badge>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{total.toLocaleString("en-US")}</span>
            </div>
            <div className="summary-chip" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}>
              <Badge variant="blue">Entries (page)</Badge>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{pageEntries}</span>
            </div>
            <div className="summary-chip" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Cities</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{Math.max(0, cities.length - 1)}</span>
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
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
              />
            </div>

            <select
              className="filter-select"
              value={cityFilter}
              onChange={(e) => setParam("city", e.target.value)}
              style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}
            >
              {cities.map((c) => <option key={c} value={c}>{c === "All" ? "All Cities" : c}</option>)}
            </select>

            <div className="count-chip" style={{ display: "flex", alignItems: "center", padding: "10px 14px" }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-4)" }}>
                {reports.length}<span style={{ margin: "0 4px", color: "var(--text-6)" }}>/</span>{total.toLocaleString("en-US")}
              </span>
            </div>

            <ExportButton href={`/api/export/reports?${searchParams.toString()}`} />
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
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "64px 0", textAlign: "center", color: "var(--text-5)", fontSize: 14 }}>
                        No reports match your filters.
                      </td>
                    </tr>
                  ) : (
                    reports.map((report, i) => {
                      const entryCount = Array.isArray(report.entries) ? report.entries.length : 0;
                      return (
                        <tr
                          key={report.id}
                          className="report-row"
                          onClick={() => setSelectedId(report.id)}
                          style={{ borderBottom: i < reports.length - 1 ? "1px solid var(--border)" : "none" }}
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

          <Pagination page={page} pageSize={pageSize} total={total} />
        </main>
      </div>

      {selectedId && (
        fullReport
          ? <ReportDrawer report={fullReport} onClose={() => { setSelectedId(null); setFullReport(null); }} />
          : <DrawerSkeleton onClose={() => setSelectedId(null)} loading={drawerLoading} />
      )}
    </>
  );
}
