import Link from "next/link";

import { MobileNav, type NavLink } from "@/components/layout/MobileNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { contactEmail } from "@/lib/env";

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
/**
 * The drawer's contents here. The learner site is the first item, not the last:
 * below 640px the header's own link to it shortens to "For Learners", and this
 * is the unabbreviated way back.
 */
const PRACTITIONER_LINKS: readonly NavLink[] = [
  { href: "/", label: "See iqcommune for Learners" },
  { href: "#roles", label: "Who we're looking for" },
  { href: "#process", label: "How empanelment works" },
  { href: "#modules", label: "Modules you can teach" },
  { href: "#faqs", label: "FAQs" },
];

export function PractitionerSections() {
  return (
    // Resolved here, the last server component in the chain, and handed down as
    // a plain prop — never a NEXT_PUBLIC_ variable baked into the bundle, which
    // would need a rebuild to change and would ship `mailto:undefined` unset.
    //
    // Falls back to the public inbox, NOT to the practitioner sender — see the
    // same note in LandingSections. A contact address shown to an applicant must
    // never borrow the mail-sending account, which in practice was a personal
    // Gmail and appeared on the page as the place to write to.
    <ApplyProvider
      practitionerEmail={process.env.PRACTITIONER_CONTACT_EMAIL || contactEmail()}
    >
      <div className="flex min-h-dvh flex-col">
      <SiteHeader
        badge={["Practitioner", "Network"] as const}
        menu={
          <MobileNav
            links={PRACTITIONER_LINKS}
            action={<ApplyButton className="w-full justify-center px-5 py-3 text-md" />}
          />
        }
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
            //
            // The label shortens below 640px because the full one does not fit
            // the header's measured 162px right-hand budget. That is a
            // compromise, not a safety net: the route to the learner site is
            // the footer link above, which the spec also specifies and which
            // has no width budget to fit into.
            aria-label="See iqcommune for Learners"
            // V7 `.btn-nav-subtle`: outlined gold pill, not plain text.
            className="inline-flex items-center whitespace-nowrap rounded-full border border-border-strong px-[18px] py-[9px] text-2xs font-semibold uppercase tracking-caps text-gold-dark transition-[background-color,border-color] hover:border-gold-dark hover:bg-gold-glow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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
        {/* Anchor targets for the drawer — see LandingSections for why these are
            wrappers rather than ids threaded through each section. */}
        <div id="roles" className="scroll-mt-[68px]">
          <RolesGrid />
        </div>
        <div id="process" className="scroll-mt-[68px]">
          <ProcessSteps />
        </div>
        <DivisionOfWork />
        <div id="modules" className="scroll-mt-[68px]">
          <ModulesGrid />
        </div>
        <FitLists />
        <DisclosureCards />
        {/* The spec writes this CTA "Apply to join the Network" and the hero's
            "Apply to Join the Network" — the same control, two capitalisations.
            Both take the title-case default; see pending-practitioners.ts. */}
        <ApplyCta apply={<ApplyButton icon="arrow" />} />
        <div id="faqs" className="scroll-mt-[68px]">
          <Faqs />
        </div>
      </main>
      <SiteFooter
        // No `email` override on purpose. The V7 spec puts practitioners@ here;
        // the client replaced that with the one shared inbox, which is now the
        // footer's own default — so this page takes it rather than restating it.
        top={
          <Link
            href="/"
            // V7 .footer-btn: outlined white pill on the dark footer.
            className="inline-flex items-center rounded-full border border-on-dark-edge px-5 py-[9px] text-base font-medium text-on-dark-bright transition-[background-color,border-color,color] hover:border-on-dark-muted hover:bg-tool-card-hover hover:text-surface"
          >
            See iqcommune for Learners
          </Link>
        }
      />
      </div>
    </ApplyProvider>
  );
}
