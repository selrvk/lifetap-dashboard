export default function ConsentTimelineLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ height: 60, background: "var(--surface)", borderBottom: "1px solid var(--border)" }} />
      <main style={{ padding: "32px 32px 48px", maxWidth: 900, margin: "0 auto" }}>
        <Shimmer width={160} height={13} style={{ marginBottom: 16 }} />
        <Shimmer height={160} style={{ borderRadius: 14, marginBottom: 20 }} />
        <Shimmer width={140} height={11} style={{ marginBottom: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map((i) => <Shimmer key={i} height={90} style={{ borderRadius: 12 }} />)}
        </div>
      </main>
    </div>
  );
}

function Shimmer({ width, height, style }: { width?: number | string; height: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: width ?? "100%", height, borderRadius: 8, background: "var(--surface-2)", position: "relative", overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, var(--surface-3) 50%, transparent 100%)", animation: "shimmer 1.4s ease-in-out infinite" }} />
      <style>{`@keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
    </div>
  );
}
