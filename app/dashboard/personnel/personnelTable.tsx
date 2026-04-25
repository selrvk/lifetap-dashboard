"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Pagination from "@/components/Pagination";
import ExportButton from "@/components/ExportButton";
import { Personnel, PersonnelRole } from "@/lib/types";
import { PH_CITIES } from "@/lib/constants/ph-cities";
import { logout } from "@/app/actions/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
const ROLE_LABELS: Record<string, string> = { admin: "Admin", medic: "Medic", responder: "Responder" };
const EDITABLE_ROLES: PersonnelRole[] = ["admin", "medic", "responder"];

const PHONE_RE = /^\+639\d{9}$/;

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeVariant = "blue" | "teal" | "red" | "amber" | "gray" | "purple";

function Badge({ children, variant = "gray" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span style={{
      background: `var(--badge-${variant}-bg)`, color: `var(--badge-${variant}-fg)`,
      border: `1px solid var(--badge-${variant}-bd)`, display: "inline-block",
      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, lineHeight: 1.8, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

const ROLE_BADGE: Record<PersonnelRole, BadgeVariant> = { admin: "purple", medic: "blue", responder: "teal" };
function roleBadge(role: PersonnelRole) {
  return <Badge variant={ROLE_BADGE[role]}>{ROLE_LABELS[role]}</Badge>;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "var(--accent-gradient)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      color: "white", fontSize: size < 40 ? 13 : 18, fontWeight: 700, letterSpacing: "0.02em",
    }}>
      {initials}
    </div>
  );
}

// ─── Shared drawer sub-components ────────────────────────────────────────────

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "5px 10px" }}>
      <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p style={{ color: "var(--text-5)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontFamily: "'JetBrains Mono', monospace" }}>
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

// ─── Form helpers ─────────────────────────────────────────────────────────────

function FormField({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-5)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>
        {label}{required && <span style={{ color: "var(--badge-red-fg)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "var(--text-6)", marginTop: 0 }}>{hint}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  background: "var(--surface-3)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)", fontFamily: "inherit",
  outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
};

// ─── View Drawer ──────────────────────────────────────────────────────────────

function PersonnelDrawer({
  person,
  isAdmin,
  onClose,
  onEdit,
}: {
  person: Personnel;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(13,45,53,0.4)", backdropFilter: "blur(4px)", zIndex: 40 }} />
      <aside style={{
        position: "fixed", right: 0, top: 0, height: "100%", width: "100%", maxWidth: 420,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 50, overflowY: "auto", boxShadow: "-8px 0 48px rgba(13,45,53,0.2)",
      }}>
        <div style={{ background: "var(--accent-gradient)", padding: "24px 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 18, fontWeight: 700,
              }}>
                {person.full_name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")}
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Personnel Profile</p>
                <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{person.full_name}</h2>
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{person.id}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
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
              <Field label="Account Status"><Badge variant={person.is_active ? "teal" : "gray"}>{person.is_active ? "Active" : "Inactive"}</Badge></Field>
            </div>
          </Section>
          <Section label="Activity">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
              <Field label="Member Since" value={formatDate(person.created_at)} />
              <Field label="Last Login" value={formatDateTime(person.last_login)} />
            </div>
          </Section>

          {isAdmin && (
            <button
              onClick={onEdit}
              style={{
                width: "100%", padding: "10px 16px",
                background: "var(--surface-3)", border: "1px solid var(--border)",
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                color: "var(--text-2)", fontFamily: "inherit",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "border-color 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Edit Personnel
            </button>
          )}

          <p style={{ color: "var(--text-6)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            ID · {person.id}
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── Form Drawer (Add / Edit) ─────────────────────────────────────────────────

type FormData = {
  full_name: string;
  phone: string;
  role: PersonnelRole;
  badge_no: string;
  organization: string;
  city: string;
  is_active: boolean;
};

const BLANK_FORM: FormData = {
  full_name: "", phone: "+639", role: "responder",
  badge_no: "", organization: "", city: "", is_active: true,
};

function personnelToForm(p: Personnel): FormData {
  return {
    full_name: p.full_name,
    phone: p.phone,
    role: p.role,
    badge_no: p.badge_no ?? "",
    organization: p.organization ?? "",
    city: p.city ?? "",
    is_active: p.is_active,
  };
}

function PersonnelFormDrawer({
  initial,        // null = add mode
  onClose,
  onSuccess,
}: {
  initial: Personnel | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = initial !== null;
  const isTargetAdmin = isEdit && initial.role === "admin";

  const [form, setForm] = useState<FormData>(
    isEdit ? personnelToForm(initial) : BLANK_FORM
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
    setError(null);
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required.";
    if (!PHONE_RE.test(form.phone)) errs.phone = "Must be +639XXXXXXXXX (11 digits after +).";
    if (!EDITABLE_ROLES.includes(form.role)) errs.role = "Select a valid role.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      role: form.role,
      badge_no: form.badge_no.trim() || null,
      organization: form.organization.trim() || null,
      city: form.city || null,
      is_active: form.is_active,
    };

    try {
      const url = isEdit ? `/api/personnel/${initial.id}` : "/api/personnel";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error ?? "Request failed.");
      } else {
        onSuccess();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(13,45,53,0.4)", backdropFilter: "blur(4px)", zIndex: 40 }} />
      <aside style={{
        position: "fixed", right: 0, top: 0, height: "100%", width: "100%", maxWidth: 440,
        background: "var(--surface)", borderLeft: "1px solid var(--border)",
        zIndex: 50, overflowY: "auto", boxShadow: "-8px 0 48px rgba(13,45,53,0.2)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ background: "var(--accent-gradient)", padding: "24px 24px 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                {isEdit ? "Edit Personnel" : "Add Personnel"}
              </p>
              <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {isEdit ? initial.full_name : "New Account"}
              </h2>
              {isEdit && (
                <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  {initial.id}
                </p>
              )}
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          {error && (
            <div style={{ background: "var(--badge-red-bg)", border: "1px solid var(--badge-red-bd)", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 13, color: "var(--badge-red-fg)", fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <FormField label="Full Name" required>
            <input
              style={{ ...inputStyle, borderColor: fieldErrors.full_name ? "var(--badge-red-bd)" : "var(--border)" }}
              type="text" value={form.full_name} placeholder="Juan dela Cruz"
              onChange={(e) => set("full_name", e.target.value)}
              autoComplete="off"
            />
            {fieldErrors.full_name && <p style={{ fontSize: 11, color: "var(--badge-red-fg)" }}>{fieldErrors.full_name}</p>}
          </FormField>

          <FormField label="Phone" required hint="Philippine mobile number: +639XXXXXXXXX">
            <input
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", borderColor: fieldErrors.phone ? "var(--badge-red-bd)" : "var(--border)" }}
              type="tel" value={form.phone} placeholder="+639XXXXXXXXX"
              onChange={(e) => set("phone", e.target.value)}
              autoComplete="off"
            />
            {fieldErrors.phone && <p style={{ fontSize: 11, color: "var(--badge-red-fg)" }}>{fieldErrors.phone}</p>}
          </FormField>

          <FormField label="Role" required>
            <select
              style={{ ...inputStyle, cursor: isTargetAdmin ? "not-allowed" : "pointer", opacity: isTargetAdmin ? 0.6 : 1 }}
              value={form.role}
              onChange={(e) => set("role", e.target.value as PersonnelRole)}
              disabled={isTargetAdmin}
            >
              {EDITABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            {isTargetAdmin && (
              <p style={{ fontSize: 11, color: "var(--text-5)" }}>Admin role is locked and cannot be changed.</p>
            )}
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Badge No.">
              <input
                style={inputStyle} type="text" value={form.badge_no}
                placeholder="e.g. 00123"
                onChange={(e) => set("badge_no", e.target.value)}
              />
            </FormField>
            <FormField label="City">
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              >
                <option value="">— None —</option>
                {PH_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Organization">
            <input
              style={inputStyle} type="text" value={form.organization}
              placeholder="e.g. Quezon City DRRMO"
              onChange={(e) => set("organization", e.target.value)}
            />
          </FormField>

          <FormField label="Account Status">
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "9px 12px", background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 8 }}>
              <input
                type="checkbox" checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)" }}
              />
              <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
                {form.is_active ? "Active — can log in" : "Inactive — login blocked"}
              </span>
            </label>
          </FormField>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: "10px 16px",
                background: "var(--surface-3)", border: "1px solid var(--border)",
                borderRadius: 10, fontSize: 13, fontWeight: 600,
                color: "var(--text-4)", fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              style={{
                flex: 2, padding: "10px 16px",
                background: "var(--accent-gradient)", border: "none",
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                color: "white", fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Personnel"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DrawerSkeleton({ onClose, loading }: { onClose: () => void; loading: boolean }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(13,45,53,0.4)", backdropFilter: "blur(4px)", zIndex: 40 }} />
      <aside style={{ position: "fixed", right: 0, top: 0, height: "100%", width: "100%", maxWidth: 420, background: "var(--surface)", borderLeft: "1px solid var(--border)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "-8px 0 48px rgba(13,45,53,0.2)" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-5)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 13 }}>Loading profile…</span>
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Main Table ──────────────────────────────────────────────────────────────

type Props = {
  personnel: Personnel[];
  total: number;
  page: number;
  pageSize: number;
  personnelName: string;
  personnelRole: string;
};

export default function PersonnelTable({ personnel, total, page, pageSize, personnelName, personnelRole }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isAdmin = personnelRole === "admin";

  // View drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullPerson, setFullPerson] = useState<Personnel | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Form drawer
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Personnel | null>(null); // null = add mode

  // Debounced search
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

  const roleFilter = searchParams.get("role") ?? "All";
  const activeOnly = searchParams.get("active") === "1";

  // Fetch full record when a row is clicked
  useEffect(() => {
    if (!selectedId) { setFullPerson(null); return; }
    let cancelled = false;
    setDrawerLoading(true);
    fetch(`/api/personnel/${selectedId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) { setFullPerson(data); setDrawerLoading(false); } })
      .catch(() => { if (!cancelled) setDrawerLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  function openAdd() {
    setSelectedId(null);
    setFullPerson(null);
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(person: Personnel) {
    setSelectedId(null);
    setFullPerson(null);
    setEditTarget(person);
    setShowForm(true);
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditTarget(null);
    startTransition(() => router.refresh());
  }

  // Summary chips
  const roleCounts = { admin: 0, medic: 0, responder: 0, active: 0 };
  personnel.forEach((p) => {
    if (p.role in roleCounts) roleCounts[p.role as PersonnelRole]++;
    if (p.is_active) roleCounts.active++;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .table-root { background: var(--bg); min-height: calc(100vh - 60px); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; transition: background 0.2s ease; }
        .table-main { padding: 32px 32px 48px; max-width: 1400px; margin: 0 auto; }
        .eyebrow { font-size: 10px; font-weight: 700; color: var(--text-5); text-transform: uppercase; letter-spacing: 0.14em; font-family: 'JetBrains Mono', monospace; }
        .personnel-row { transition: background 0.1s; cursor: pointer; }
        .personnel-row:hover { background: var(--surface-hover) !important; }
        .filter-input, .filter-select, .filter-btn, .count-chip, .summary-chip { background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 10px; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s; }
        .filter-input:focus, .filter-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--ring); }
        .filter-input::placeholder { color: var(--text-5); }
        .filter-btn { cursor: pointer; }
        .filter-btn:hover { border-color: var(--border-strong); }
        .filter-btn.active { background: var(--badge-teal-bg) !important; border-color: var(--badge-teal-bd) !important; color: var(--badge-teal-fg) !important; }
        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
        .panel thead tr { background: var(--surface-3); border-bottom: 1px solid var(--border); }
        .panel th { padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 700; color: var(--text-5); text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; font-family: 'JetBrains Mono', monospace; }
        .add-btn { background: var(--accent-gradient); border: none; border-radius: 10px; color: white; font-family: inherit; font-size: 13px; font-weight: 700; padding: 10px 18px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: opacity 0.15s; }
        .add-btn:hover { opacity: 0.88; }
        .form-input:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--ring); }
        @media (max-width: 900px) { .table-main { padding: 20px 16px 40px; } }
      `}</style>

      <NavBar name={personnelName} role={personnelRole} onLogout={logout} />

      <div className="table-root" style={{ opacity: isPending ? 0.7 : 1, transition: "opacity 0.2s" }}>
        <main className="table-main">

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <p className="eyebrow">Team</p>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 4 }}>Personnel</h1>
              <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 4 }}>
                {total.toLocaleString("en-US")} total record{total !== 1 ? "s" : ""} · Click a row to view profile
              </p>
            </div>
            {isAdmin && (
              <button className="add-btn" onClick={openAdd}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                </svg>
                Add Personnel
              </button>
            )}
          </div>

          {/* Summary chips */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {(["admin", "medic", "responder"] as PersonnelRole[]).map((r) => (
              <div key={r} className="summary-chip" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}>
                <Badge variant={ROLE_BADGE[r]}>{ROLE_LABELS[r]}</Badge>
                <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{roleCounts[r]}</span>
              </div>
            ))}
            <div className="summary-chip" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Active</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{roleCounts.active}</span>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-5)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input className="filter-input" type="text" placeholder="Search name, phone, organization, city…" value={draft} onChange={(e) => setDraft(e.target.value)}
                style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13 }} />
            </div>

            <select className="filter-select" value={roleFilter} onChange={(e) => setParam("role", e.target.value)} style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
              {ROLES.map((r) => <option key={r} value={r}>{r === "All" ? "All Roles" : ROLE_LABELS[r]}</option>)}
            </select>

            <button onClick={() => setParam("active", activeOnly ? null : "1")} className={`filter-btn${activeOnly ? " active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--text-4)" }}>
              Active Only
            </button>

            <div className="count-chip" style={{ display: "flex", alignItems: "center", padding: "10px 14px" }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-4)" }}>
                {personnel.length}<span style={{ margin: "0 4px", color: "var(--text-6)" }}>/</span>{total.toLocaleString("en-US")}
              </span>
            </div>

            <ExportButton href={`/api/export/personnel?${searchParams.toString()}`} />
          </div>

          {/* Table */}
          <div className="panel">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Name", "Role", "Badge No.", "Organization", "City", "Last Login", "Status"].map((col) => <th key={col}>{col}</th>)}</tr>
                </thead>
                <tbody>
                  {personnel.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: "64px 0", textAlign: "center", color: "var(--text-5)", fontSize: 14 }}>No records match your filters.</td></tr>
                  ) : (
                    personnel.map((person, i) => (
                      <tr key={person.id} className="personnel-row" onClick={() => setSelectedId(person.id)}
                        style={{ borderBottom: i < personnel.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={person.full_name} />
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>{person.full_name}</p>
                              <p className="mono" style={{ fontSize: 11, color: "var(--text-6)", marginTop: 2 }}>{person.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>{roleBadge(person.role)}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span className="mono" style={{ fontSize: 13, color: person.badge_no ? "var(--text-2)" : "var(--text-6)" }}>{person.badge_no ?? "—"}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontSize: 13, color: person.organization ? "var(--text-2)" : "var(--text-6)" }}>{person.organization ?? "—"}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontSize: 13, color: person.city ? "var(--text-2)" : "var(--text-6)" }}>{person.city ?? "—"}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>{timeAgo(person.last_login)}</p>
                          {person.last_login && <p className="mono" style={{ fontSize: 11, color: "var(--text-5)", marginTop: 2, whiteSpace: "nowrap" }}>{formatDate(person.last_login)}</p>}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <Badge variant={person.is_active ? "teal" : "gray"}>{person.is_active ? "Active" : "Inactive"}</Badge>
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

      {/* View drawer */}
      {selectedId && !showForm && (
        fullPerson
          ? <PersonnelDrawer
              person={fullPerson}
              isAdmin={isAdmin}
              onClose={() => { setSelectedId(null); setFullPerson(null); }}
              onEdit={() => openEdit(fullPerson)}
            />
          : <DrawerSkeleton onClose={() => setSelectedId(null)} loading={drawerLoading} />
      )}

      {/* Add / Edit form drawer */}
      {showForm && (
        <PersonnelFormDrawer
          initial={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
