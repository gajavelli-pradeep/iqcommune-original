import { LandingSections } from "@/features/landing/LandingSections";
import { GallerySection } from "@/features/landing/sections/Gallery";

export default function HomePage() {
  return <LandingSections gallery={<GallerySection />} />;
}
