import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { siteUrl } from "@/lib/siteUrl";

/**
 * DM Sans, vendored into the repo rather than fetched from Google.
 *
 * `next/font/google` self-hosts at *runtime* but downloads the woff2 during the
 * build, which makes fonts.gstatic.com a hard build dependency. The URLs Next
 * derives for DM Sans's opsz+wght axes now 404 — Google rotated the files and
 * the ones Next asks for are gone — so every cold-cache build fails. It passes
 * locally only because a warm `.next/cache` still holds the old download, which
 * is why this surfaced in CI first. Vendoring takes the network out of the
 * build; the runtime behaviour is unchanged.
 *
 * Two subsets, not one: ₹ (U+20B9) is in latin-ext, and the payout and consent
 * screens use it. Listing the ext face after the latin one lets the browser
 * fall back per glyph, so ₹ renders in DM Sans instead of a system face.
 *
 * One variable file per subset covers the whole 300-700 range. The V7 source
 * links 300/400/500/600 but authors `font-weight: 700` ten times, which would
 * otherwise leave the browser synthesising a fake bold.
 */
const dmSansLatinExt = localFont({
  src: "./fonts/dm-sans-latin-ext.woff2",
  variable: "--font-dm-sans-ext",
  weight: "300 700",
  display: "swap",
});

const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  variable: "--font-dm-sans",
  weight: "300 700",
  display: "swap",
});

/**
 * Site-wide metadata defaults (audit H6). Each page still sets its own full
 * `title` (the established " — iqcommune" convention, so no template here to
 * avoid double-suffixing); this supplies `metadataBase` for absolute OG/canonical
 * URLs plus the OpenGraph/Twitter card every page inherits. The default OG image
 * comes from `app/opengraph-image.tsx`.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "iqcommune — financial intelligence connects",
  description:
    "iqcommune connects you with working finance professionals for small, in-person sessions.",
  applicationName: "iqcommune",
  openGraph: {
    type: "website",
    siteName: "iqcommune",
    url: siteUrl(),
    title: "iqcommune — financial intelligence connects",
    description:
      "Real financial insight from active professionals — small, in-person sessions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "iqcommune — financial intelligence connects",
    description:
      "Real financial insight from active professionals — small, in-person sessions.",
  },
};

/** Organization + WebSite structured data (audit M10). */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "iqcommune",
      url: siteUrl(),
      description:
        "Connects working finance professionals with small, in-person learning groups.",
    },
    {
      "@type": "WebSite",
      name: "iqcommune",
      url: siteUrl(),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSansLatinExt.variable}`}>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
