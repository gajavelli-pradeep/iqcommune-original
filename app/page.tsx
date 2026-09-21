import type { Metadata } from "next";

import { BRAND_TITLE } from "@/constants/brand";
import { LandingSections } from "@/features/landing/LandingSections";
import { GallerySection } from "@/features/landing/sections/Gallery";
import { isGalleryVisible } from "@/services/settings";

export const metadata: Metadata = {
  // The home page is the brand's own page, so it carries the brand line rather
  // than a page name. Every other route keeps the "<page> — iqcommune" form.
  title: BRAND_TITLE,
  // Deliberately not the strapline: this is the search-result snippet, where
  // Google gives ~155 characters and truncates nothing. The short line belongs
  // on the social cards, which is where `layout.tsx` puts it.
  description:
    "iqcommune connects you with working finance professionals for small, in-person sessions — real insight from people still in the field, not full-time trainers.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // A global admin can hide "Sessions in the room" from Settings. Off drops the
  // section and its nav link together; a failed read shows it (services/settings).
  const showGallery = await isGalleryVisible();
  return <LandingSections gallery={showGallery ? <GallerySection /> : null} />;
}
