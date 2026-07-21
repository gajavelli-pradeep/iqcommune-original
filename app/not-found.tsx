import type { Metadata } from "next";
import { ErrorNotice } from "@/components/ErrorNotice";

export const metadata: Metadata = {
  title: "Page not found — iqcommune",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <ErrorNotice
      title="We couldn't find that page"
      message="The link may be out of date, or the page may have moved. If you followed a link from an email, it might have expired."
    />
  );
}
