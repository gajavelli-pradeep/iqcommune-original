import type { Metadata } from "next";

import { LandingSections } from "@/features/landing/LandingSections";
import { GallerySection } from "@/features/landing/sections/Gallery";

export const metadata: Metadata = {
  title: "iqcommune — Real financial insight from active professionals",
  description:
    "iqcommune connects you with working finance professionals for small, in-person sessions — real insight from people still in the field, not full-time trainers.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingSections gallery={<GallerySection />} />;
}
