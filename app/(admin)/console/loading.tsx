export default function ConsoleLoading() {
  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`@keyframes iq-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* Tab bar skeleton */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 28,
          borderBottom: "1px solid rgba(20,18,12,.09)",
          paddingBottom: 0,
        }}
      >
        {[88, 110, 96, 120, 80, 100].map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: 36,
              borderRadius: "6px 6px 0 0",
              background: "var(--surface-soft)",
              animation: "iq-pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>

      {/* Table header skeleton */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, padding: "8px 12px", background: "var(--surface-soft)", borderRadius: 6 }}>
        {[140, 110, 90, 130, 80].map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: 12,
              borderRadius: 4,
              background: "var(--surface-sunken)",
              animation: "iq-pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            padding: "14px 12px",
            borderBottom: "1px solid rgba(20,18,12,.07)",
            opacity: 1 - i * 0.07,
          }}
        >
          {[140, 110, 90, 130, 80].map((w, j) => (
            <div
              key={j}
              style={{
                width: w,
                height: 14,
                borderRadius: 4,
                background: "var(--surface-soft)",
                animation: "iq-pulse 1.5s ease-in-out infinite",
                animationDelay: `${(i * 5 + j) * 40}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
