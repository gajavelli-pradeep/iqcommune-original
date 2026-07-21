import { SiteFooter } from "@/components/layout/SiteFooter";

/**
 * P1 — main landing page. Composition only: this file stays a list of sections
 * so it can never grow into the 1,596-line page the previous build produced.
 *
 * Sections land in order; each is added here once it passes its checks.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">{/* sections land here */}</main>
      <SiteFooter />
    </div>
  );
}
