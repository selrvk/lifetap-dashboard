"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

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
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function NavBar({ name, role, onLogout }: NavBarProps) {
  const path = usePathname();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    startTransition(async () => {
      await onLogout();
    });
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .nav-header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px;
          position: sticky; top: 0; z-index: 30;
          box-shadow: var(--shadow-sm);
        }

        .nav-divider { width: 1px; height: 20px; background: var(--border); }

        .nav-link {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px;
          text-decoration: none; font-size: 13px; font-weight: 600;
          color: var(--text-4);
          transition: all 0.15s;
        }
        .nav-link:hover { background: var(--surface-hover); color: var(--accent); }
        .nav-link.active { background: var(--accent-soft); color: var(--accent); }

        .user-name { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.2; }
        .user-role { font-size: 11px; color: var(--text-5); }

        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--accent-gradient);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .avatar.sm { width: 32px; height: 32px; }
        .avatar.md { width: 36px; height: 36px; }

        .signout-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 13px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 13px; font-weight: 600;
          color: var(--danger);
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .signout-btn:hover:not(:disabled) {
          background: var(--danger-bg);
          border-color: var(--danger-border);
        }
        .signout-btn:disabled {
          background: var(--surface-3);
          color: var(--text-6);
          cursor: not-allowed;
        }

        .hamburger-btn {
          display: flex; flex-direction: column; justify-content: center; align-items: center;
          gap: 5px; width: 36px; height: 36px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px; cursor: pointer; padding: 0;
          transition: background 0.15s;
        }
        .hamburger-btn.open { background: var(--accent-soft); }
        .hamburger-line {
          width: 16px; height: 2px;
          background: var(--text-4);
          border-radius: 2px;
          transition: all 0.2s;
        }
        .hamburger-btn.open .hamburger-line { background: var(--accent); }

        .navbar-desktop-nav { display: flex; gap: 4px; }
        .navbar-desktop-right { display: flex; align-items: center; gap: 12px; }
        .navbar-hamburger { display: none; }
        .navbar-mobile-menu { display: none; }

        @media (max-width: 767px) {
          .navbar-desktop-nav { display: none; }
          .navbar-desktop-right { display: none; }
          .navbar-hamburger { display: flex; align-items: center; gap: 10px; }
          .navbar-mobile-menu {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 60px; left: 0; right: 0;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            box-shadow: var(--shadow-md);
            z-index: 29;
            padding: 12px 16px 16px;
            gap: 4px;
            animation: slideDown 0.2s cubic-bezier(0.16,1,0.3,1);
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .navbar-mobile-menu-hidden { display: none !important; }
        }

        .nav-link-mobile {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px; border-radius: 10px;
          text-decoration: none; font-size: 14px; font-weight: 600;
          color: var(--text-4);
          transition: all 0.15s;
        }
        .nav-link-mobile:hover { background: var(--surface-hover); color: var(--accent); }
        .nav-link-mobile.active { background: var(--accent-soft); color: var(--accent); }
      `}</style>

      <header className="nav-header">

        {/* ── Left: logo + desktop nav ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/lifetap-logo.png" alt="LifeTap" width={30} height={30} style={{ borderRadius: 8 }} />
          </Link>
          <div className="nav-divider" />

          <nav className="navbar-desktop-nav">
            {NAV_LINKS.map((l) => {
              const active = path === l.href;
              return (
                <Link key={l.href} href={l.href} className={`nav-link${active ? " active" : ""}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={l.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Desktop right: theme + user + logout ── */}
        <div className="navbar-desktop-right">
          <ThemeToggle />

          <div className="nav-divider" />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <p className="user-name">{name}</p>
              <p className="user-role">{ROLE_LABELS[role] ?? role}</p>
            </div>
            <div className="avatar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>

          <div className="nav-divider" />

          <button onClick={handleLogout} disabled={isPending} className="signout-btn">
            {isPending ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: "spin 0.7s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
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
        </div>

        {/* ── Mobile right: theme + avatar + hamburger ── */}
        <div className="navbar-hamburger">
          <ThemeToggle />
          <div className="avatar sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`hamburger-btn${menuOpen ? " open" : ""}`}
          >
            <span className="hamburger-line" style={{ transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span className="hamburger-line" style={{ opacity: menuOpen ? 0 : 1 }} />
            <span className="hamburger-line" style={{ transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        </div>
      </header>

      {/* ── Mobile dropdown menu ── */}
      <div className={`navbar-mobile-menu${menuOpen ? "" : " navbar-mobile-menu-hidden"}`}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px 14px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 8,
        }}>
          <div className="avatar md">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{name}</p>
            <p style={{ fontSize: 12, color: "var(--text-5)" }}>{ROLE_LABELS[role] ?? role}</p>
          </div>
        </div>

        {NAV_LINKS.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`nav-link-mobile${active ? " active" : ""}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={l.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {l.label}
            </Link>
          );
        })}

        <button
          onClick={() => { setMenuOpen(false); handleLogout(); }}
          disabled={isPending}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 14px",
            marginTop: 4,
            borderTop: "1px solid var(--border)",
            background: "none", border: "none",
            width: "100%", textAlign: "left",
            fontSize: 14, fontWeight: 600,
            color: isPending ? "var(--text-6)" : "var(--danger)",
            cursor: isPending ? "not-allowed" : "pointer",
            borderRadius: 10,
            fontFamily: "inherit",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
          </svg>
          {isPending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </>
  );
}
