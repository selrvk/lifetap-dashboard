"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NavBarProps = {
  name: string;
  role: string;
  onLogout: () => Promise<void>;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  medic: "Medical Personnel",
  responder: "First Responder",
};

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/dashboard/users",
    label: "Users",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    href: "/dashboard/personnel",
    label: "Personnel",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function NavBar({ name, role, onLogout }: NavBarProps) {
  const path = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await onLogout();
    });
  }

  return (
    <header style={{
      background: "white",
      borderBottom: "1px solid #d4eef5",
      height: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      position: "sticky", top: 0, zIndex: 30,
      boxShadow: "0 1px 8px rgba(27,174,232,0.06)",
    }}>

      {/* ── Left: logo + nav ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/lifetap-logo.png" alt="LifeTap" width={30} height={30} style={{ borderRadius: 8 }} />
        </Link>
        <div style={{ width: 1, height: 20, background: "#d4eef5" }} />
        <nav style={{ display: "flex", gap: 4 }}>
          {NAV_LINKS.map((l) => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                textDecoration: "none", fontSize: 13, fontWeight: 600,
                color: active ? "#1BAEE8" : "#7aabb5",
                background: active ? "#e8f6fd" : "transparent",
                transition: "all 0.15s",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={l.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Right: user info + logout ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

        {/* User avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0d2d35", lineHeight: 1.2 }}>{name}</p>
            <p style={{ fontSize: 11, color: "#9acdd8" }}>{ROLE_LABELS[role] ?? role}</p>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #1BAEE8, #3ECFB2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "#d4eef5" }} />

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={isPending}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 13px",
            background: isPending ? "#f7fcfe" : "white",
            border: "1.5px solid #d4eef5",
            borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            color: isPending ? "#b8d8e0" : "#e05c5c",
            cursor: isPending ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            fontFamily: "Plus Jakarta Sans, sans-serif",
          }}
          onMouseEnter={(e) => {
            if (!isPending) {
              (e.currentTarget as HTMLElement).style.background = "#fff5f5";
              (e.currentTarget as HTMLElement).style.borderColor = "#f5a0a0";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = isPending ? "#f7fcfe" : "white";
            (e.currentTarget as HTMLElement).style.borderColor = "#d4eef5";
          }}
        >
          {isPending ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: "spin 0.7s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
            </svg>
          )}
          {isPending ? "Signing out…" : "Sign out"}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </header>
  );
}