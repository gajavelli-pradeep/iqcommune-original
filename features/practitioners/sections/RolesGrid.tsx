import { SectionHeading } from "@/components/ui/SectionHeading";

/** Who the network is for — six live roles, data-driven, each with its V7 icon. */

const ROLES: ReadonlyArray<{ title: string; description: string; icon: React.ReactNode }> = [
  {
    title: "Equity Analysts",
    description:
      "Currently writing research, tracking companies, and forming views on markets every trading day.",
    icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  {
    title: "Portfolio Managers",
    description:
      "Actively managing equity, debt, or hybrid portfolios — with a live P&L attached to every call you make.",
    icon: (
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    ),
  },
  {
    title: "Certified Financial Planners",
    description:
      "SEBI-registered, currently advising clients on goal-based investing, retirement, or financial planning.",
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    title: "Wealth Advisors & RMs",
    description:
      "Working with HNI or retail clients every day — structuring portfolios, having money conversations for real.",
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    title: "Fund & Product Specialists",
    description:
      "Deep expertise in specific instruments — fixed income, derivatives, structured products — actively working with these today, whether in a firm or independently.",
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
  },
  {
    title: "Corporate Finance Professionals",
    description:
      "CFOs, treasury managers, or finance controllers with hands-on exposure to capital allocation and planning.",
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
];

export function RolesGrid() {
  return (
    <section className="bg-surface-soft px-8 py-16">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="Who we're looking for"
          headline={
            <>
              Currently in the field.
              <br />
              That&apos;s the only requirement that matters.
            </>
          }
          sub="We don't shortlist by credentials alone. What qualifies you is that you're actively doing the work — right now."
        />
        <ul className="mt-8 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3">
          {ROLES.map((role) => (
            <li
              key={role.title}
              className="rounded-[12px] border border-border bg-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-[3px] hover:border-gold motion-reduce:hover:translate-y-0"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-gold-light text-gold-dark">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden
                  focusable="false"
                >
                  {role.icon}
                </svg>
              </span>
              <h3 className="mb-1 text-lg font-semibold text-ink">{role.title}</h3>
              <p className="text-base leading-[1.55] text-ink-muted">{role.description}</p>
            </li>
          ))}
        </ul>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-center text-sm text-ink-faint">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
            focusable="false"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          Minimum 5 years of active, hands-on experience in your domain. Employed or independent —
          what matters is that you are actively practising.
        </p>
      </div>
    </section>
  );
}
