import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Who this suits and who it does not.
 *
 * Both columns are kept at every width. The section's whole value is that it
 * says no as clearly as it says yes; dropping the second list on mobile would
 * turn an honest page into a sales page.
 */

const GOOD_FIT = [
  "Are actively practising in finance — employed, self-employed, or independent",
  "Are comfortable talking about what you do without a script",
  "Want a side income without any business development work",
  "Available for at least one session every few months — and when you say yes, you see it through",
  "Comfortable with the disclosure terms — what gets shared with session organisers and when",
] as const;

const POOR_FIT = [
  "Have left finance and are looking to transition into training full-time",
  "Want to actively pitch or sell products, funds, or services during sessions",
  "Are looking for a regular, guaranteed monthly income",
  "Say yes to sessions and then become unavailable — reliability matters more than frequency",
  "Have fewer than 5 years of active, full-time finance experience",
] as const;

function FitList({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "good" | "poor";
}) {
  const isGood = tone === "good";
  return (
    <div
      className={`rounded-lg border p-6 ${isGood ? "border-flag-good-edge bg-flag-good" : "border-tool-edge bg-tool-card"}`}
    >
      <h3 className={`mb-4 text-md font-semibold ${isGood ? "text-result-good" : "text-on-dark-muted"}`}>
        {title}
      </h3>
      <ul>
        {items.map((item) => (
          <li
            key={item}
            className={`mb-3 flex items-start gap-2.5 text-base leading-[1.55] last:mb-0 ${
              isGood ? "text-on-dark-bright" : "text-on-dark-muted"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
              focusable="false"
              className={`mt-[4px] shrink-0 ${isGood ? "text-result-good" : "text-result-bad"}`}
            >
              {isGood ? <polyline points="20 6 9 17 4 12" /> : <path d="M18 6 6 18M6 6l12 12" />}
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FitLists() {
  return (
    <section className="bg-ink px-8 py-16">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tone="dark"
          tag="Before you apply"
          headline={
            <>
              This works well for some people.
              <br />
              Not for everyone.
            </>
          }
        />
        <div className="mt-10 grid gap-4 min-[720px]:grid-cols-2">
          <FitList title="This is a good fit if you…" items={GOOD_FIT} tone="good" />
          <FitList title="This is not for you if you…" items={POOR_FIT} tone="poor" />
        </div>
      </div>
    </section>
  );
}
