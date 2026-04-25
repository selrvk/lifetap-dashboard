export default function DashboardLoading() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Nav skeleton */}
      <div style={{ height: 60, background: "var(--surface)", borderBottom: "1px solid var(--border)" }} />

      <main style={{ padding: "32px 32px 48px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <Shimmer width={120} height={12} style={{ marginBottom: 8 }} />
        <Shimmer width={220} height={28} style={{ marginBottom: 6 }} />
        <Shimmer width={280} height={14} style={{ marginBottom: 32 }} />

        {/* Hero card */}
        <Shimmer height={140} style={{ borderRadius: 14, marginBottom: 14 }} />

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {[...Array(6)].map((_, i) => <Shimmer key={i} height={96} style={{ borderRadius: 14 }} />)}
        </div>

        {/* Chart cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 14 }}>
          {[...Array(3)].map((_, i) => <Shimmer key={i} height={220} style={{ borderRadius: 14 }} />)}
        </div>
      </main>
    </div>
  );
}

function Shimmer({ width, height, style }: { width?: number | string; height: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: width ?? "100%",
      height,
      borderRadius: 8,
      background: "var(--surface-2)",
      position: "relative",
      overflow: "hidden",
      ...style,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, var(--surface-3) 50%, transparent 100%)",
        animation: "shimmer 1.4s ease-in-out infinite",
      }} />
      <style>{`@keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
    </div>
  );
}
