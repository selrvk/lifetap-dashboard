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

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div style={{
      background: accent
        ? "linear-gradient(135deg, #1BAEE8 0%, #3ECFB2 100%)"
        : "white",
      border: accent ? "none" : "1.5px solid #d4eef5",
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: accent
        ? "0 4px 20px rgba(27,174,232,0.25)"
        : "0 1px 8px rgba(27,174,232,0.04)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: accent ? "rgba(255,255,255,0.2)" : "#f0f8fb",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ color: accent ? "white" : "#1BAEE8" }}>{icon}</span>
      </div>
      <div>
        <p style={{
          fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em",
          color: accent ? "white" : "#0d2d35",
          fontFamily: "Plus Jakarta Sans, sans-serif",
        }}>
          {value}
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: accent ? "rgba(255,255,255,0.75)" : "#7aabb5", marginTop: 2 }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: 11, color: accent ? "rgba(255,255,255,0.55)" : "#b8d8e0", marginTop: 3 }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Bar Row ─────────────────────────────────────────────────────────────────

function BarRow({ label, value, max, total, color }: {
  label: string; value: number; max: number; total: number; color?: string;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        width: 56, fontSize: 12, fontWeight: 700,
        color: "#2d5a68", fontFamily: "JetBrains Mono, monospace",
        textAlign: "right", flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 10, background: "#f0f8fb", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${width}%`,
          background: color ?? "linear-gradient(90deg, #1BAEE8, #3ECFB2)",
          borderRadius: 999,
          transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <span style={{ width: 28, fontSize: 12, color: "#9acdd8", textAlign: "right", flexShrink: 0 }}>{value}</span>
      <span style={{ width: 32, fontSize: 11, color: "#b8d8e0", textAlign: "right", flexShrink: 0 }}>{pct(value, total)}%</span>
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white", border: "1.5px solid #d4eef5",
      borderRadius: 16, padding: "22px 24px",
      boxShadow: "0 1px 8px rgba(27,174,232,0.04)",
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: "#9acdd8",
        textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 18,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f4fafc; margin: 0; }
        a { font-family: 'Plus Jakarta Sans', sans-serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f0f8fb; }
        ::-webkit-scrollbar-thumb { background: #c0dde8; border-radius: 3px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up  { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        .delay-1  { animation-delay: 0.05s; }
        .delay-2  { animation-delay: 0.10s; }
        .delay-3  { animation-delay: 0.15s; }

        /* ── Base (desktop) ── */
        .dash-main   { padding: 36px 32px; max-width: 1200px; margin: 0 auto; }
        .welcome-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .welcome-meta { text-align: right; flex-shrink: 0; }

        .stats-grid  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .links-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .quick-link {
          display: flex; align-items: center; gap: 16px;
          padding: 18px 22px;
          background: white; border: 1.5px solid #d4eef5;
          border-radius: 16px; text-decoration: none;
          box-shadow: 0 1px 8px rgba(27,174,232,0.04);
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .quick-link:hover {
          border-color: #1BAEE8;
          box-shadow: 0 4px 20px rgba(27,174,232,0.12);
          transform: translateY(-1px);
        }

        /* ── Tablet  ≤ 900px ── */
        @media (max-width: 900px) {
          .dash-main   { padding: 24px 20px; }
          .stats-grid  { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .charts-grid { grid-template-columns: 1fr 1fr; }
        }

        /* ── Mobile  ≤ 600px ── */
        @media (max-width: 600px) {
          .dash-main   { padding: 16px; }

          /* Welcome: stack vertically */
          .welcome-row  { flex-direction: column; align-items: flex-start; gap: 12px; }
          .welcome-meta { text-align: left; width: 100%; display: flex; align-items: center; justify-content: space-between; }

          /* Stat cards: 2-col tight */
          .stats-grid  { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }

          /* Charts & links: single column */
          .charts-grid { grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px; }
          .links-grid  { grid-template-columns: 1fr; gap: 10px; }
          .quick-link  { padding: 14px 16px; }
        }
      `}</style>

      <NavBar name={personnelName} role={personnelRole} onLogout={logout} />

      <main className="dash-main">

        {/* ── Welcome banner ── */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div style={{
            background: "white", border: "1.5px solid #d4eef5",
            borderRadius: 20, padding: "28px 32px",
            boxShadow: "0 2px 16px rgba(27,174,232,0.06)",
            overflow: "hidden", position: "relative",
          }}>
            {/* Decorative blobs */}
            <div style={{ position: "absolute", right: -60, top: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(27,174,232,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 120, bottom: -80, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(62,207,178,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

            <div className="welcome-row">
              <div>
                <p style={{ color: "#9acdd8", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {greeting()},
                </p>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0d2d35", letterSpacing: "-0.025em", marginBottom: 10 }}>
                  {firstName} 👋
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "4px 10px",
                    background: "linear-gradient(135deg, #1BAEE8, #3ECFB2)",
                    borderRadius: 20, fontSize: 11, fontWeight: 700,
                    color: "white", textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>
                    {ROLE_LABELS[personnelRole] ?? personnelRole}
                  </span>
                  {personnelOrg && (
                    <span style={{ color: "#9acdd8", fontSize: 13 }}>· {personnelOrg}</span>
                  )}
                </div>
              </div>

              <div className="welcome-meta">
                <p style={{ fontSize: 12, color: "#b8d8e0" }}>{today()}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3ECFB2" }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#3ECFB2" }}>System Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="stats-grid fade-up delay-1">
          <StatCard label="Registered Users" value={stats.totalUsers} sub="All profiles in system" accent
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" strokeLinecap="round" /></svg>}
          />
          <StatCard label="Public Profiles" value={stats.publicUsers} sub={`${pct(stats.publicUsers, stats.totalUsers)}% of users`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" /></svg>}
          />
          <StatCard label="Organ Donors" value={stats.organDonors} sub={`${pct(stats.organDonors, stats.totalUsers)}% of users`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" /></svg>}
          />
          <StatCard label="With Allergies" value={stats.withAllergies} sub={`${pct(stats.withAllergies, stats.totalUsers)}% of users`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" /><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" /></svg>}
          />
          <StatCard label="With Conditions" value={stats.withConditions} sub={`${pct(stats.withConditions, stats.totalUsers)}% of users`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          />
          <StatCard label="On Medication" value={stats.withMeds} sub={`${pct(stats.withMeds, stats.totalUsers)}% of users`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L18.5 2.5z" strokeLinecap="round" /></svg>}
          />
          <StatCard label="Active Personnel" value={stats.totalPersonnel} sub="Medics + Responders + Admins"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" /><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" /></svg>}
          />
        </div>

        {/* ── Charts ── */}
        <div className="charts-grid fade-up delay-2">
          <Card title="Blood Type Distribution">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bloodTypes.length === 0
                ? <p style={{ color: "#b8d8e0", fontSize: 13 }}>No data</p>
                : bloodTypes.map(([bt, count]) => (
                    <BarRow key={bt} label={bt} value={count} max={maxBlood} total={stats.totalUsers} />
                  ))}
            </div>
          </Card>

          <Card title="Users by City">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cities.length === 0
                ? <p style={{ color: "#b8d8e0", fontSize: 13 }}>No data</p>
                : cities.map(([city, count]) => (
                    <BarRow key={city} label={city} value={count} max={maxCity}
                      total={stats.totalUsers} color="linear-gradient(90deg, #3ECFB2, #1BAEE8)" />
                  ))}
            </div>
          </Card>

          <Card title="Personnel by Role">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(roleMap).length === 0
                ? <p style={{ color: "#b8d8e0", fontSize: 13 }}>No data</p>
                : Object.entries(roleMap).map(([role, count]) => (
                    <div key={role} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                          background: role === "admin" ? "linear-gradient(135deg,#1BAEE8,#3ECFB2)" : role === "medic" ? "#3ECFB2" : "#1BAEE8",
                        }} />
                        <span style={{ fontSize: 13, color: "#2d5a68", fontWeight: 500 }}>{ROLE_LABELS[role] ?? role}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: "#f0f8fb", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 999,
                            width: `${pct(count, stats.totalPersonnel)}%`,
                            background: role === "admin" ? "linear-gradient(90deg,#1BAEE8,#3ECFB2)" : role === "medic" ? "#3ECFB2" : "#1BAEE8",
                          }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0d2d35", fontFamily: "JetBrains Mono, monospace", minWidth: 20, textAlign: "right" }}>
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              <div style={{ marginTop: 8, paddingTop: 14, borderTop: "1px solid #edf5f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#9acdd8" }}>Total active</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#0d2d35", fontFamily: "JetBrains Mono, monospace" }}>{stats.totalPersonnel}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Quick links ── */}
        <div className="links-grid fade-up delay-3">
          {[
            { href: "/dashboard/users", label: "Manage Users", desc: "View, search, and inspect all registered user profiles.", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
            { href: "/dashboard/personnel", label: "Manage Personnel", desc: "View medics, responders, and admin accounts.", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="quick-link">
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: "linear-gradient(135deg, #1BAEE8, #3ECFB2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d={link.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0d2d35", marginBottom: 2 }}>{link.label}</p>
                <p style={{ fontSize: 12, color: "#9acdd8", lineHeight: 1.4 }}>{link.desc}</p>
              </div>
              <svg style={{ marginLeft: "auto", color: "#b8d8e0", flexShrink: 0 }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" />
              </svg>
            </Link>
          ))}
        </div>

      </main>
    </>
  );
}