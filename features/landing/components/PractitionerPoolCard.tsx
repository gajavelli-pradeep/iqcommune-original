import { InfoCircleIcon } from "@/components/ui/icons";

/**
 * The hero's right-hand panel: headline stats, then the four practitioner
 * archetypes, then the qualifying note.
 *
 * Data-driven rather than four pasted card blocks — identical structure with
 * different content is one component over an array, so a fix lands once.
 */

const STATS = [
  { figure: "12+", label: "Years avg. experience" },
  { figure: "20+", label: "Active practitioners" },
  { figure: "6", label: "Specialisations" },
] as const;

const ROLES = [
  {
    title: "Equity Analysts",
    sub: "At brokerages & research desks",
    path: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  {
    title: "Portfolio Managers",
    sub: "Active at AMCs & wealth firms",
    path: (
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    ),
  },
  {
    title: "Certified Financial Planners",
    sub: "SEBI-registered, currently practising",
    path: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    title: "Wealth Managers",
    sub: "Serving HNI clients day-to-day",
    path: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
] as const;

export function PractitionerPoolCard() {
  return (
    <div className="animate-fade-up animate-fade-up-card rounded-xl border border-border-strong bg-surface p-8 shadow-card-soft">
      <p className="mb-[1.1rem] text-xs font-semibold uppercase tracking-caps text-gold-dark">
        Our practitioner pool
      </p>

      <div className="grid grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="border-r border-border px-2 py-[0.65rem] text-center last:border-r-0"
          >
            <div className="text-6xl font-semibold leading-[1.1] tracking-tight text-ink">
              {stat.figure}
            </div>
            <div className="mt-0.5 text-xs leading-[1.3] text-ink-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="my-4 h-px bg-border" />

      {/* One column below 480px — three role titles wrap badly in a half-width
          card on a small phone. Matches the spec's own 480px rule. */}
      <div className="mb-4 grid grid-cols-1 gap-[0.6rem] min-[480px]:grid-cols-2">
        {ROLES.map((role) => (
          <div key={role.title} className="rounded-md bg-surface-soft px-[0.9rem] py-3">
            <div className="mb-[5px] text-gold-dark">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                {role.path}
              </svg>
            </div>
            <div className="mb-0.5 text-sm font-semibold text-ink">{role.title}</div>
            <div className="text-xs leading-[1.4] text-ink-muted">{role.sub}</div>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 border-t border-border pt-4 text-sm text-ink-faint">
        <InfoCircleIcon className="mt-0.5 shrink-0" />
        Every session is led by a practitioner currently active in that specific area of
        finance.
      </p>
    </div>
  );
}
