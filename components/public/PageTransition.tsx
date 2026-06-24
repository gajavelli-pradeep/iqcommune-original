"use client";

import { usePathname } from "next/navigation";

/**
 * Fades + rises the page content on every route change. Keying the wrapper by
 * pathname remounts it on navigation, which replays the `iq-page-in` animation
 * defined in globals.css. Honours prefers-reduced-motion (animation is gated).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
