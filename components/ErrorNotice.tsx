import Link from "next/link";

/**
 * The one failure surface. Used by app/error.tsx, app/global-error.tsx and
 * ErrorBoundary so a failure looks and reads the same wherever it happens.
 *
 * Rules it exists to enforce: a user sees a human sentence and a way out —
 * never a stack trace, never a bare "Something went wrong" with no recovery.
 * The digest is shown only so someone can quote it in a support email.
 */
export function ErrorNotice({
  title = "Something went wrong",
  message = "This is on us, not you. Try again — if it keeps happening, get in touch and we'll sort it out.",
  digest,
  onRetry,
  retryLabel = "Try again",
  hardNav = false,
}: {
  title?: string;
  message?: string;
  digest?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /**
   * Force a full document load instead of client-side navigation. Set by
   * global-error.tsx: the root layout has crashed there, so the router this
   * page would need is exactly the thing that failed — only a fresh document
   * reliably recovers.
   */
  hardNav?: boolean;
}) {
  const homeClass =
    "w-full rounded-md px-6 py-3 text-md font-medium text-gold-dark underline-offset-4 hover:underline sm:w-auto";
  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-narrow rounded-lg bg-surface p-8 text-center shadow-card-soft">
        <h1 className="text-3xl font-semibold tracking-display text-ink">{title}</h1>
        <p className="mt-3 text-md leading-relaxed text-ink-muted">{message}</p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-md bg-ink px-6 py-3 text-md font-medium text-surface sm:w-auto"
            >
              {retryLabel}
            </button>
          )}
          {hardNav ? (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- see hardNav
            <a href="/" className={homeClass}>
              Back to home
            </a>
          ) : (
            <Link href="/" className={homeClass}>
              Back to home
            </Link>
          )}
        </div>

        {digest && (
          <p className="mt-6 font-mono text-2xs text-ink-faint">Reference: {digest}</p>
        )}
      </div>
    </div>
  );
}
