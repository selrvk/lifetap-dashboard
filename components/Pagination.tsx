"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
};

export default function Pagination({ page, pageSize, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  // Show up to 7 page numbers with ellipsis
  function pageNumbers(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (page >= totalPages - 3) return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", page - 1, page, page + 1, "…", totalPages];
  }

  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-3)", cursor: "pointer", transition: "all 0.1s",
    fontFamily: "'JetBrains Mono', monospace",
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12, marginTop: 16,
      opacity: isPending ? 0.6 : 1, transition: "opacity 0.15s",
    }}>
      <span style={{ fontSize: 12, color: "var(--text-5)", fontFamily: "'JetBrains Mono', monospace" }}>
        {from}–{to} of {total.toLocaleString("en-US")}
      </span>

      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          style={{
            ...btnBase,
            opacity: page === 1 ? 0.35 : 1,
            cursor: page === 1 ? "not-allowed" : "pointer",
          }}
          aria-label="Previous page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {pageNumbers().map((n, i) =>
          n === "…" ? (
            <span key={`ellipsis-${i}`} style={{ width: 32, textAlign: "center", fontSize: 13, color: "var(--text-5)" }}>…</span>
          ) : (
            <button
              key={n}
              onClick={() => goTo(n)}
              style={{
                ...btnBase,
                background: n === page ? "var(--accent-gradient)" : "var(--surface)",
                color: n === page ? "white" : "var(--text-3)",
                border: n === page ? "1px solid transparent" : "1px solid var(--border)",
              }}
            >
              {n}
            </button>
          )
        )}

        <button
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          style={{
            ...btnBase,
            opacity: page === totalPages ? 0.35 : 1,
            cursor: page === totalPages ? "not-allowed" : "pointer",
          }}
          aria-label="Next page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
