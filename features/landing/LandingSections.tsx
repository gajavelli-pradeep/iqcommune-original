import { Suspense } from "react";

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
export function LandingSections({ gallery }: { gallery: React.ReactNode }) {
  return (
    <RequestSessionProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader right={<RequestSessionButton variant="nav" />} />
        <main className="flex-1">
          <Hero />
          <TrustBar />
          <AudienceRibbon />
          <TrainerComparison />
          <WhoIsThisFor />
          <TrainingTopics />
          <BundledSessions />
          <HowItWorks />
          <Takeaways />
          <Faqs />
          {/* Audit M6: an isolated crash in a calculator stays inside this
              boundary instead of blanking the whole landing page. */}
          <ErrorBoundary label="tools-calculators">
            <ToolsCalculators />
          </ErrorBoundary>
          <CtaSection />
          {/*
            Audit H2: the gallery is the only section that reads the database.
            Streaming it behind Suspense lets every section above (hero/LCP
            included) paint without waiting on that round-trip. The fallback is
            the pure Gallery in its designed placeholder state — identical
            chrome, so no layout shift when the real photos arrive.
          */}
          <Suspense fallback={<Gallery photos={[]} failed={false} />}>{gallery}</Suspense>
        </main>
        <SiteFooter />
      </div>
    </RequestSessionProvider>
  );
}
