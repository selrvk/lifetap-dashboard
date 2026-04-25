"use client";

import { useState } from "react";

type Toast = { message: string } | null;

/**
 * Replaces the plain <a download> pattern with a fetch-based download so we
 * can intercept non-2xx responses (especially 429 rate-limit) and show a
 * visible toast instead of silently doing nothing.
 */
export default function ExportButton({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  function dismiss() { setToast(null); }

  function showToast(message: string) {
    setToast({ message });
    setTimeout(() => setToast(null), 7000);
  }

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(href);

      if (res.status === 429) {
        const json = await res.json().catch(() => ({}));
        showToast((json as { error?: string }).error ?? "Export limit reached. Please wait before trying again.");
        return;
      }

      if (!res.ok) {
        showToast("Export failed. Please try again or contact your administrator.");
        return;
      }

      // Trigger browser download from the blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "lifetap-export.csv";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "10px 16px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          color: "var(--text-4)", fontFamily: "inherit",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "border-color 0.15s, opacity 0.15s",
        }}
      >
        {loading ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Exporting…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" />
              <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
            </svg>
            Export CSV
          </>
        )}
      </button>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, display: "flex", alignItems: "flex-start", gap: 12,
          background: "var(--badge-red-bg)",
          border: "1px solid var(--badge-red-bd)",
          color: "var(--badge-red-fg)",
          padding: "14px 18px",
          borderRadius: 12, fontSize: 13, fontWeight: 500,
          maxWidth: "min(480px, calc(100vw - 48px))",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          lineHeight: 1.5,
          animation: "toast-in 0.2s ease",
        }}>
          <style>{`
            @keyframes toast-in {
              from { opacity: 0; transform: translateX(-50%) translateY(8px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button onClick={dismiss} aria-label="Dismiss"
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, flexShrink: 0, opacity: 0.7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
