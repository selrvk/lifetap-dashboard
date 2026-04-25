"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen message={error.message} onRetry={reset} />;
}

export function ErrorScreen({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: 32,
    }}>
      <div style={{
        maxWidth: 400, width: "100%", textAlign: "center",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "40px 32px",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "var(--badge-red-bg)", border: "1px solid var(--badge-red-bd)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--badge-red-fg)" strokeWidth="2.2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" />
            <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
          </svg>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em", marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-4)", lineHeight: 1.6, marginBottom: 24 }}>
          {message ?? "An unexpected error occurred. Please try again or contact your system administrator if the problem persists."}
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: "10px 24px",
              background: "var(--accent-gradient)",
              border: "none", borderRadius: 10,
              color: "white", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
