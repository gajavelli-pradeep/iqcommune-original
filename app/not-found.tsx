import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | iqcommune",
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "var(--font-sans, 'DM Sans', system-ui, sans-serif)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          background: "radial-gradient(circle, rgba(201,152,42,.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              color: "#c9982a",
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "-0.04em",
            }}
          >
            iq
          </span>
          <span
            style={{
              color: "#ffffff",
              fontWeight: 300,
              fontSize: 26,
              letterSpacing: "-0.04em",
            }}
          >
            commune
          </span>
        </div>
      </Link>

      {/* 404 number */}
      <div
        style={{
          fontSize: "clamp(80px, 18vw, 160px)",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: "rgba(201,152,42,.18)",
          marginBottom: "1.5rem",
          userSelect: "none",
        }}
      >
        404
      </div>

      {/* Message */}
      <h1
        style={{
          fontSize: "clamp(20px, 3vw, 28px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#ffffff",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,.45)",
          maxWidth: 380,
          textAlign: "center",
          lineHeight: 1.65,
          marginBottom: "2.5rem",
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* CTAs */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/"
          style={{
            background: "#c9982a",
            color: "#ffffff",
            textDecoration: "none",
            borderRadius: 100,
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Go home
        </Link>
        <Link
          href="/practitioners"
          style={{
            background: "rgba(255,255,255,.08)",
            color: "rgba(255,255,255,.75)",
            textDecoration: "none",
            borderRadius: 100,
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 500,
            border: "1px solid rgba(255,255,255,.12)",
          }}
        >
          For practitioners
        </Link>
      </div>
    </main>
  );
}
