"use client";

import { useEffect } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";

/** Route-level boundary: the layout survives, this replaces the page body. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by the structured logger with a trace ID once F2 lands.
    console.error("Route error", { message: error.message, digest: error.digest });
  }, [error]);

  return <ErrorNotice digest={error.digest} onRetry={reset} />;
}
