import { Suspense } from "react";

import { MobileNav, type NavLink } from "@/components/layout/MobileNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BundledSessions } from "@/features/landing/sections/BundledSessions";
import { CtaSection } from "@/features/landing/sections/CtaSection";
import { Faqs } from "@/features/landing/sections/Faqs";
import { Gallery } from "@/features/landing/sections/Gallery";
import { Hero } from "@/features/landing/sections/Hero";
import { HowItWorks } from "@/features/landing/sections/HowItWorks";
import { Takeaways } from "@/features/landing/sections/Takeaways";
import { ToolsCalculators } from "@/features/landing/sections/ToolsCalculators";
import { TrainerComparison } from "@/features/landing/sections/TrainerComparison";
import { TrainingTopics } from "@/features/landing/sections/TrainingTopics";
import { AudienceRibbon, TrustBar } from "@/features/landing/sections/TrustStrips";
import { WhoIsThisFor } from "@/features/landing/sections/WhoIsThisFor";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { senderFor } from "@/lib/email/send";

import { RequestSessionButton, RequestSessionProvider } from "./RequestSession";

/**
 * P1 — the landing page's section list, and nothing else. Composition only, so
 * this file can never grow into the 1,596-line page the previous build produced.
 *
 * `gallery` is injected rather than imported: the route passes the server
 * component that reads the database, and the content-parity gate passes the
 * same section with fixed data. One list, two callers, no drift between what
 * ships and what is verified.
 */
/**
 * The drawer's contents. Anchors to the sections a visitor on a phone would
 * otherwise have to scroll eleven screens to find, plus the one page this site
 * links out to.
 */
const MOBILE_LINKS: readonly NavLink[] = [
  { href: "#who-its-for", label: "Who it's for" },
  { href: "#topics", label: "What we cover" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#tools", label: "Free calculators" },
  { href: "#sessions", label: "Sessions in the room" },
  { href: "#faqs", label: "FAQs" },
  { href: "/practitioners", label: "For practitioners" },
];

/**
 * Anchor target for a section that owns its own `<section>` element.
 *
 * A transparent wrapper rather than an id on each section component: the id is
 * a property of the page's navigation, not of the section, and threading one
 * through six components to serve one drawer is the wrong trade. `scroll-mt`
 * clears the sticky header, which would otherwise cover the heading a visitor
 * just jumped to.
 */
function Anchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-[68px]">
      {children}
    </div>
  );
}

export function LandingSections({ gallery }: { gallery: React.ReactNode }) {
  return (
    // Resolved here rather than in the modal: this is the last server component
    // in the chain, so the address is read once on the server and handed down as
    // a plain prop — never a NEXT_PUBLIC_ variable baked into the bundle, which
    // would need a rebuild to change and would ship `mailto:undefined` when unset.
    //
    // Falls back to the session sender so the offer still appears before anyone
    // sets the dedicated variable; see FEATURE_ENV for why they are separate.
    <RequestSessionProvider
      sessionEmail={process.env.SESSION_CONTACT_EMAIL || senderFor("session")}
    >
      <div className="flex min-h-dvh flex-col">
        <SiteHeader
          right={<RequestSessionButton variant="nav" />}
          menu={<MobileNav links={MOBILE_LINKS} action={<RequestSessionButton variant="gold" className="w-full justify-center px-5 py-3 text-md" />} />}
        />
        <main className="flex-1">
          <Hero />
          <TrustBar />
          <AudienceRibbon />
          <TrainerComparison />
          <Anchor id="who-its-for">
            <WhoIsThisFor />
          </Anchor>
          <Anchor id="topics">
            <TrainingTopics />
          </Anchor>
          <BundledSessions />
          <Anchor id="how-it-works">
            <HowItWorks />
          </Anchor>
          <Takeaways />
          <Anchor id="faqs">
            <Faqs />
          </Anchor>
          {/* Audit M6: an isolated crash in a calculator stays inside this
              boundary instead of blanking the whole landing page. */}
          <Anchor id="tools">
            <ErrorBoundary label="tools-calculators">
              <ToolsCalculators />
            </ErrorBoundary>
          </Anchor>
          <CtaSection />
          {/*
            Audit H2: the gallery is the only section that reads the database.
            Streaming it behind Suspense lets every section above (hero/LCP
            included) paint without waiting on that round-trip. The fallback is
            the pure Gallery in its designed placeholder state — identical
            chrome, so no layout shift when the real photos arrive.
          */}
          <Anchor id="sessions">
            <Suspense fallback={<Gallery photos={[]} />}>{gallery}</Suspense>
          </Anchor>
        </main>
        <SiteFooter />
      </div>
    </RequestSessionProvider>
  );
}
