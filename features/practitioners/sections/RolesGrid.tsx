import { SectionHeading } from "@/components/ui/SectionHeading";

/** Who the network is for — six live roles, data-driven. */

const ROLES: ReadonlyArray<{ title: string; description: string }> = [
  {
    title: "Equity Analysts",
    description:
      "Currently writing research, tracking companies, and forming views on markets every trading day.",
  },
  {
    title: "Portfolio Managers",
    description:
      "Actively managing equity, debt, or hybrid portfolios — with a live P&L attached to every call you make.",
  },
  {
    title: "Certified Financial Planners",
    description:
      "SEBI-registered, currently advising clients on goal-based investing, retirement, or financial planning.",
  },
  {
    title: "Wealth Advisors & RMs",
    description:
      "Working with HNI or retail clients every day — structuring portfolios, having money conversations for real.",
  },
  {
    title: "Fund & Product Specialists",
    description:
      "Deep expertise in specific instruments — fixed income, derivatives, structured products — actively working with these today, whether in a firm or independently.",
  },
  {
    title: "Corporate Finance Professionals",
    description:
      "CFOs, treasury managers, or finance controllers with hands-on exposure to capital allocation and planning.",
  },
];

export function RolesGrid() {
  return (
    <section className="bg-surface px-8 py-16">
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
        <ul className="mt-10 grid gap-4 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          {ROLES.map((role) => (
            <li
              key={role.title}
              className="rounded-lg border border-border bg-surface-soft p-5 transition-colors hover:border-gold-border"
            >
              <h3 className="mb-1.5 text-md font-semibold text-ink">{role.title}</h3>
              <p className="text-sm leading-[1.6] text-ink-muted">{role.description}</p>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-8 max-w-[780px] rounded-r-lg border border-l-[3px] border-border border-l-gold bg-surface-soft px-6 py-4 text-base leading-[1.6] text-ink-muted">
          Minimum 5 years of active, hands-on experience in your domain. Employed or independent
          — what matters is that you are actively practising.
        </p>
      </div>
    </section>
  );
}
