"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>Something went wrong</p>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
        We hit an unexpected error
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
        The page encountered an error and could not load. You can try again or return home.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          onClick={reset}
          style={{
            background: "var(--gold)",
            color: "var(--ink)",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Try again
        </button>
        {/* Intentional full-document navigation (not <Link>): a hard reload
            guarantees a clean slate, clearing any client state corrupted by the
            error that a soft client-side navigation would carry to the homepage. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            background: "var(--surface-soft)",
            color: "var(--ink-soft)",
            border: "1px solid rgba(20,18,12,.12)",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Return home
        </a>
      </div>
      {error.digest && (
        <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4, fontFamily: "monospace" }}>
          Error ID: {error.digest}
        </p>
      )}
    </main>
  );
}
