import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { validateEnv } from "@/lib/env";

validateEnv();

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    template: "%s | iqcommune",
    default: "iqcommune — Finance Learning Sessions",
  },
  description:
    "In-person finance sessions led by practitioners. No products. No pitch. Just knowledge.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    siteName: "iqcommune",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "iqcommune — Finance Learning Sessions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "iqcommune — Finance Learning Sessions",
    description:
      "In-person finance sessions led by practitioners. No products. No pitch.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.className}>
      <body>{children}</body>
    </html>
  );
}
