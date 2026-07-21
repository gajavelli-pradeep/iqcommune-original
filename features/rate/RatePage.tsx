import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { TokenFailure } from "@/lib/tokens";

import { InvalidLink } from "./InvalidLink";
import { RateForm } from "./RateForm";
import type { RatedSession } from "./SessionDetailsCard";

/**
 * P3 — `/rate`. One of two mutually exclusive states: a session to rate, or an
 * explanation of why the link did not work. There is no third state where the
 * form renders without a verified token.
 */
export function RatePage({
  session,
  failure,
}: {
  session?: RatedSession;
  failure?: TokenFailure;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-soft">
      <SiteHeader badge={["Session Feedback"]} />
      <main className="flex-1 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-narrow">
          {session ? <RateForm session={session} /> : <InvalidLink reason={failure ?? "malformed"} />}
          <p className="mt-6 text-center text-sm leading-[1.6] text-ink-faint">
            Confidential · Questions? Reply to the email this link was sent from, or write to{" "}
            <a
              href="mailto:hello@iqcommune.com"
              className="underline underline-offset-2 transition-colors hover:text-ink-muted"
            >
              hello@iqcommune.com
            </a>
          </p>
        </div>
      </main>
      <SiteFooter top={false} />
    </div>
  );
}
