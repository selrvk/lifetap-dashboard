export default function AuditLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ height: 60, background: "var(--surface)", borderBottom: "1px solid var(--border)" }} />
      <main style={{ padding: "32px 32px 48px", maxWidth: 1400, margin: "0 auto" }}>
        <Shimmer width={80} height={11} style={{ marginBottom: 8 }} />
        <Shimmer width={180} height={28} style={{ marginBottom: 6 }} />
        <Shimmer width={280} height={13} style={{ marginBottom: 24 }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <Shimmer height={42} style={{ flex: 1, borderRadius: 10 }} />
          <Shimmer width={180} height={42} style={{ borderRadius: 10 }} />
        </div>
        <Shimmer height={480} style={{ borderRadius: 14 }} />
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
