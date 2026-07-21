import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

import { ApplyButton } from "./ApplyButton";
import { DivisionOfWork } from "./sections/DivisionOfWork";
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
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        badge={["Practitioner", "Network"] as const}
        right={
          <Link
            href="/"
            className="whitespace-nowrap text-2xs font-semibold uppercase tracking-caps text-ink-muted transition-colors hover:text-gold-dark"
          >
            See iqcommune for Learners
          </Link>
        }
      />
      <main className="flex-1">
        <Hero apply={<ApplyButton />} />
        <RolesGrid />
        <ProcessSteps />
        <DivisionOfWork />
      </main>
      <SiteFooter tagline="practitioner network" email="practitioners@iqcommune.com" top={false} />
    </div>
  );
}
