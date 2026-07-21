import type { Metadata } from "next";

import { PhotosPage } from "@/features/photos/PhotosPage";
import { verifyToken } from "@/lib/tokens";

/** Photo links identify a specific session and must never be indexed. */
export const metadata: Metadata = {
  title: "Submit session photos — iqcommune",
  robots: { index: false, follow: false },
};

export default async function SubmitPhotos({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const result = verifyToken("photos", t);

  if (!result.ok) return <PhotosPage failure={result.reason} />;

  // The practitioner and session are read from the row the token names once the
  // data layer lands. The spec fills them from query params, which would let
  // anyone put any practitioner's name on an iqcommune page.
  return <PhotosPage failure="malformed" />;
}
