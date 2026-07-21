import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

import { ApplyButton, ApplyProvider } from "./ApplyModal";
import { ApplyCta } from "./sections/ApplyCta";
import { DisclosureCards } from "./sections/DisclosureCards";
import { DivisionOfWork } from "./sections/DivisionOfWork";
import { Faqs } from "./sections/Faqs";
import { FitLists } from "./sections/FitLists";
import { ModulesGrid } from "./sections/ModulesGrid";
import { TrustBar } from "./sections/TrustBar";
import { Hero } from "./sections/Hero";
import { ProcessSteps } from "./sections/ProcessSteps";
import { RolesGrid } from "./sections/RolesGrid";

/**
 * P2 — the practitioner network page. Composition only, same rule as P1.
 *
 * Header and footer are the shared chrome built in P1: this page inherits both
 * for free and supplies only its own badge and right-hand link.
 */
export function PractitionerSections() {
  return (
    <ApplyProvider>
      <div className="flex min-h-dvh flex-col">
      <SiteHeader
        badge={["Practitioner", "Network"] as const}
        right={
          /* The full label overflows a 320px header by 4px, so below 640px the
             visible text shortens to "For Learners" while the spec's wording
             stays in the accessible name and in the DOM.

             It is NOT hidden. An earlier version hid it, which left the learner
             site with no route from this page on a phone — the empanelment spec
             offers no other path, and this page's footer omits the cross-link.
             Shortening a label is a compromise; removing the only way out is a
             defect. */
          <Link
            href="/"
            // One accessible name at every width. An earlier attempt paired a
            // short visible label with an sr-only full one, which made a screen
            // reader announce "For Learners See iqcommune for Learners" — the
            // visible text is part of the name, not replaced by the hidden one.
            aria-label="See iqcommune for Learners"
            className="inline-flex whitespace-nowrap text-2xs font-semibold uppercase tracking-caps text-ink-muted transition-colors hover:text-gold-dark"
          >
            <span aria-hidden className="sm:hidden">
              For Learners
            </span>
            <span className="hidden sm:inline">See iqcommune for Learners</span>
          </Link>
        }
      />
      <main className="flex-1">
        <Hero apply={<ApplyButton />} />
        <TrustBar />
        <RolesGrid />
        <ProcessSteps />
        <DivisionOfWork />
        <ModulesGrid />
        <FitLists />
        <DisclosureCards />
        <ApplyCta apply={<ApplyButton label="Apply to join the Network" />} />
        <Faqs />
      </main>
      <SiteFooter tagline="practitioner network" email="practitioners@iqcommune.com" top={false} />
      </div>
    </ApplyProvider>
  );
}
