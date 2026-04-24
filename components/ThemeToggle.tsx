"use client";

import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <>
      <style>{`
        .theme-toggle {
          width: 52px; height: 26px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 999px;
          cursor: pointer;
          padding: 2px;
          position: relative;
          flex-shrink: 0;
          transition: background 0.2s, border-color 0.2s;
        }
        .theme-toggle:hover { border-color: var(--border-strong); }
        .theme-toggle-thumb {
          position: absolute;
          top: 2px; left: 2px;
          width: 20px; height: 20px;
          background: var(--surface);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--accent);
          box-shadow: var(--shadow-sm);
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .theme-toggle-thumb[data-theme="dark"] {
          transform: translateX(26px);
        }
      `}</style>
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        aria-label="Toggle color theme"
        className="theme-toggle"
      >
        <span className="theme-toggle-thumb" data-theme={theme}>
          {theme === "light" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </span>
      </button>
    </>
  );
}
