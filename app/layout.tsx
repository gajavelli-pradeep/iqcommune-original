import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

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

/** Per-route metadata is set by each page; this is only the fallback title. */
export const metadata: Metadata = {
  title: "iqcommune",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
