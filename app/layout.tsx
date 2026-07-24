import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

import { siteUrl } from "@/lib/siteUrl";

/**
 * DM Sans, self-hosted by next/font — no external request, so it survives the
 * CSP and costs no extra round trip.
 *
 * The V7 source links weights 300;400;500;600 but authors `font-weight: 700`
 * ten times, which leaves the browser synthesising a fake bold. 700 is loaded
 * here so those headings render in the real cut.
 */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className={dmSans.variable}>
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
