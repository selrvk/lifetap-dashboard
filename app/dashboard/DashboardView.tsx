"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import { logout } from "@/app/actions/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  personnelName: string;
  personnelRole: string;
  personnelOrg: string | null;
  stats: {
    totalUsers: number;
    publicUsers: number;
    organDonors: number;
    withAllergies: number;
    withConditions: number;
    withMeds: number;
    totalPersonnel: number;
  };
  bloodTypes: [string, number][];
  cities: [string, number][];
  roleMap: Record<string, number>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function today() {
  return new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  medic: "Medical Personnel",
  responder: "First Responder",
};

// ─── Small building blocks ──────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, color: "var(--text-5)",
      textTransform: "uppercase", letterSpacing: "0.14em",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {children}
    </p>
  );
}

function SegBar({ value, total, gradient }: { value: number; total: number; gradient?: string }) {
  const w = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${w}%`,
        background: gradient ?? "var(--accent-gradient)",
        borderRadius: 999,
        transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
      }} />
    </div>
  );
}

// ─── Hero stat (total users) ────────────────────────────────────────────────

function HeroStat({ total, publicCount }: { total: number; publicCount: number }) {
  const privateCount = total - publicCount;
  const publicPct = pct(publicCount, total);
  return (
    <div className="card hero-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow>Registered users</Eyebrow>
          <p className="mono" style={{
            fontSize: 44, fontWeight: 700, color: "var(--text)",
            letterSpacing: "-0.035em", lineHeight: 1.05, marginTop: 8,
          }}>
            {fmt(total)}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-4)", marginTop: 4 }}>
            Across all profiles in the system
          </p>
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <MiniKPI label="Public" value={publicCount} accent="var(--accent)" />
          <MiniKPI label="Private" value={privateCount} accent="var(--text-5)" />
        </div>
      </div>

      {/* Segmented split bar */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          height: 8, borderRadius: 999,
          background: "var(--surface-2)",
          overflow: "hidden", display: "flex",
        }}>
          <div style={{
            height: "100%", width: `${publicPct}%`,
            background: "var(--accent-gradient)",
            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-4)" }}>
            {publicPct}% public
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-5)" }}>
            {100 - publicPct}% private
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniKPI({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: accent, display: "inline-block" }} />
        <span style={{ fontSize: 11, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
          {label}
        </span>
      </div>
      <p className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginTop: 4, letterSpacing: "-0.02em" }}>
        {fmt(value)}
      </p>
    </div>
  );
}

// ─── Compact stat card ──────────────────────────────────────────────────────

function StatCard({
  label, value, of, icon, gradient,
}: {
  label: string; value: number; of: number;
  icon: React.ReactNode; gradient?: string;
}) {
  const p = pct(value, of);
  return (
    <div className="card stat-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow>{label}</Eyebrow>
        <span className="stat-icon" style={{ color: "var(--accent)" }}>{icon}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <span className="mono" style={{
          fontSize: 26, fontWeight: 700, color: "var(--text)",
          letterSpacing: "-0.025em", lineHeight: 1,
        }}>
          {fmt(value)}
        </span>
        <span className="mono" style={{ fontSize: 12, color: "var(--text-4)" }}>
          / {fmt(of)}
        </span>
        <span className="mono" style={{
          marginLeft: "auto", fontSize: 12, fontWeight: 700,
          color: "var(--accent)",
        }}>
          {p}%
        </span>
      </div>
      <div style={{ marginTop: 12 }}>
        <SegBar value={value} total={of} gradient={gradient} />
      </div>
    </div>
  );
}

// ─── Distribution cards ─────────────────────────────────────────────────────

function Card({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <Eyebrow>{title}</Eyebrow>
        {meta && (
          <span className="mono" style={{ fontSize: 10, color: "var(--text-5)" }}>
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function BloodRow({ label, value, max, total, rank }: {
  label: string; value: number; max: number; total: number; rank: number;
}) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="mono" style={{ width: 20, fontSize: 10, color: "var(--text-5)", textAlign: "right" }}>
        {String(rank).padStart(2, "0")}
      </span>
      <span className="mono" style={{
        width: 40, fontSize: 13, fontWeight: 700, color: "var(--text-2)",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 6, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`,
          background: "var(--accent-gradient)",
          borderRadius: 999,
          transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <span className="mono" style={{ width: 36, fontSize: 12, fontWeight: 600, color: "var(--text-2)", textAlign: "right" }}>
        {value}
      </span>
      <span className="mono" style={{ width: 36, fontSize: 11, color: "var(--text-5)", textAlign: "right" }}>
        {pct(value, total)}%
      </span>
    </div>
  );
}

function CityRow({ name, value, max, total, rank }: {
  name: string; value: number; max: number; total: number; rank: number;
}) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="mono" style={{ width: 20, fontSize: 10, color: "var(--text-5)", textAlign: "right" }}>
        {String(rank).padStart(2, "0")}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: "var(--text-2)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {name}
          </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--text-4)", flexShrink: 0 }}>
            {value} · {pct(value, total)}%
          </span>
        </div>
        <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${w}%`,
            background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
            borderRadius: 999,
            transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function DashboardView({
  personnelName, personnelRole, personnelOrg,
  stats, bloodTypes, cities, roleMap,
}: Props) {
  const firstName = personnelName.split(" ")[0];
  const maxBlood = bloodTypes[0]?.[1] ?? 1;
  const maxCity = cities[0]?.[1] ?? 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .dash-root {
          background: var(--bg);
          min-height: calc(100vh - 60px);
          color: var(--text);
          transition: background 0.25s ease;
        }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { opacity: 0; animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
        .d-1 { animation-delay: 0.04s; }
        .d-2 { animation-delay: 0.08s; }
        .d-3 { animation-delay: 0.12s; }
        .d-4 { animation-delay: 0.16s; }

        /* ── Card ── */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px 22px;
          box-shadow: var(--shadow-sm);
          position: relative;
        }
        .card::before {
          content: "";
          position: absolute; inset: 0;
          border-radius: 14px;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 40%);
          opacity: 0.5;
        }
        html[data-theme="dark"] .card::before {
          background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%);
        }
        .card > * { position: relative; }

        .hero-card {
          padding: 28px 28px;
          background:
            radial-gradient(circle at 100% 0%, var(--accent-soft), transparent 55%),
            var(--surface);
        }

        .stat-card { padding: 18px 20px; }
        .stat-icon {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: var(--accent-soft);
          border-radius: 8px;
        }

        /* ── Header strip ── */
        .header-strip {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .status-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 11px; font-weight: 600; color: var(--text-3);
        }
        .status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #3ECFB2;
          box-shadow: 0 0 0 3px rgba(62,207,178,0.2);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(62,207,178,0.2); }
          50%      { box-shadow: 0 0 0 6px rgba(62,207,178,0.05); }
        }

        /* ── Grids ── */
        .dash-main   { padding: 32px 32px 48px; max-width: 1280px; margin: 0 auto; }
        .grid-stats  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .grid-charts { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .grid-links  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        @media (max-width: 1024px) {
          .grid-charts { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 900px) {
          .dash-main  { padding: 20px 20px 40px; }
          .grid-stats { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .dash-main  { padding: 16px 14px 32px; }
          .grid-stats,
          .grid-charts,
          .grid-links { grid-template-columns: 1fr; }
          .hero-card  { padding: 22px 20px; }
        }

        /* ── Quick link ── */
        .quick-link {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          text-decoration: none;
          box-shadow: var(--shadow-sm);
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .quick-link:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--ring);
          transform: translateY(-1px);
        }

        /* ── Role legend ── */
        .role-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px dashed var(--border);
        }
        .role-row:last-child { border-bottom: none; }
      `}</style>

      <NavBar name={personnelName} role={personnelRole} onLogout={logout} />

      <div className="dash-root">
        <main className="dash-main">

          {/* ── Header strip ── */}
          <div className="header-strip fade-up">
            <div>
              <Eyebrow>{today()}</Eyebrow>
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: "var(--text)",
                letterSpacing: "-0.02em", marginTop: 4,
              }}>
                {greeting()}, {firstName}
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-4)", marginTop: 2 }}>
                {ROLE_LABELS[personnelRole] ?? personnelRole}
                {personnelOrg && <> · {personnelOrg}</>}
              </p>
            </div>
            <span className="status-pill">
              <span className="status-dot" />
              System online
            </span>
          </div>

          {/* ── Hero stat ── */}
          <div className="fade-up d-1" style={{ marginBottom: 14 }}>
            <HeroStat total={stats.totalUsers} publicCount={stats.publicUsers} />
          </div>

          {/* ── Secondary stats ── */}
          <div className="grid-stats fade-up d-2">
            <StatCard
              label="Public profiles"
              value={stats.publicUsers} of={stats.totalUsers}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" /></svg>}
            />
            <StatCard
              label="Organ donors"
              value={stats.organDonors} of={stats.totalUsers}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" /></svg>}
            />
            <StatCard
              label="With allergies"
              value={stats.withAllergies} of={stats.totalUsers}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" /><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" /></svg>}
            />
            <StatCard
              label="With conditions"
              value={stats.withConditions} of={stats.totalUsers}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
            <StatCard
              label="On medication"
              value={stats.withMeds} of={stats.totalUsers}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.5 20.5a7 7 0 0 1-9.9-9.9l10-10a7 7 0 0 1 9.9 9.9z" strokeLinecap="round" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" strokeLinecap="round" /></svg>}
            />
            <StatCard
              label="Active personnel"
              value={stats.totalPersonnel} of={stats.totalPersonnel}
              gradient="linear-gradient(90deg, var(--accent-2), var(--accent))"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" /></svg>}
            />
          </div>

          {/* ── Distributions ── */}
          <div className="grid-charts fade-up d-3">
            <Card title="Blood type distribution" meta={`${bloodTypes.length} types`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bloodTypes.length === 0
                  ? <p style={{ color: "var(--text-5)", fontSize: 13 }}>No data</p>
                  : bloodTypes.map(([bt, count], i) => (
                      <BloodRow key={bt} rank={i + 1} label={bt}
                        value={count} max={maxBlood} total={stats.totalUsers} />
                    ))}
              </div>
            </Card>

            <Card title="Users by city" meta={`${cities.length} cities`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {cities.length === 0
                  ? <p style={{ color: "var(--text-5)", fontSize: 13 }}>No data</p>
                  : cities.slice(0, 6).map(([city, count], i) => (
                      <CityRow key={city} rank={i + 1} name={city}
                        value={count} max={maxCity} total={stats.totalUsers} />
                    ))}
              </div>
            </Card>

            <Card title="Personnel by role" meta={`${stats.totalPersonnel} active`}>
              <div>
                {Object.entries(roleMap).length === 0
                  ? <p style={{ color: "var(--text-5)", fontSize: 13 }}>No data</p>
                  : Object.entries(roleMap).map(([role, count]) => {
                      const color = role === "admin"
                        ? "var(--accent-gradient)"
                        : role === "medic"
                          ? "var(--accent-2)"
                          : "var(--accent)";
                      return (
                        <div key={role} className="role-row">
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                            <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
                              {ROLE_LABELS[role] ?? role}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="mono" style={{ fontSize: 11, color: "var(--text-5)" }}>
                              {pct(count, stats.totalPersonnel)}%
                            </span>
                            <span className="mono" style={{
                              fontSize: 15, fontWeight: 700, color: "var(--text)",
                              minWidth: 20, textAlign: "right",
                            }}>
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </Card>
          </div>

          {/* ── Quick links ── */}
          <div className="grid-links fade-up d-4">
            {[
              { href: "/dashboard/users", label: "Manage users", desc: "View, search, and inspect registered user profiles." },
              { href: "/dashboard/personnel", label: "Manage personnel", desc: "Medics, responders, and admin accounts." },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="quick-link">
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: "var(--accent-gradient)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                    {link.label}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.4 }}>
                    {link.desc}
                  </p>
                </div>
                <svg style={{ color: "var(--text-5)", flexShrink: 0 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                </svg>
              </Link>
            ))}
          </div>

        </main>
      </div>
    </>
  );
}
