"use client";

import { useEffect } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { log, newTraceId } from "@/lib/logger";
import "./globals.css";

/**
 * Root-layout boundary — the only thing standing between a layout crash and a
 * blank white page. It replaces the whole document, so it must render its own
 * <html> and <body>.
 *
 * The previous codebase had no global-error at all: any failure in the root
 * layout showed users nothing whatsoever.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error(error.digest ?? newTraceId(), "root layout error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorNotice
          title="This page didn't load"
          message="Something failed while starting the page up. Reloading usually fixes it — if it doesn't, get in touch and we'll take a look."
          digest={error.digest}
          onRetry={reset}
          retryLabel="Reload"
          hardNav
        />
      </body>
    </html>
  );
}
