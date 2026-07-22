"use client";

import { useEffect } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { log, newTraceId } from "@/lib/logger";

/** Route-level boundary: the layout survives, this replaces the page body. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Key the log on the digest the user is shown, so a support message quoting
    // it lands on this exact failure (audit M8).
    log.error(error.digest ?? newTraceId(), "route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return <ErrorNotice digest={error.digest} onRetry={reset} />;
}
