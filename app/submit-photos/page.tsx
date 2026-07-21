import type { Metadata } from "next";

import { PhotosPage } from "@/features/photos/PhotosPage";
import { verifyToken } from "@/lib/tokens";
import { getPhotoSession } from "@/services/link-pages";

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

  // Loaded from the row the token names. A missing or already-consumed row is
  // the same thing as a bad link to the person holding it, so it renders the
  // same state rather than a second error design.
  const session = await getPhotoSession(result.payload.id);
  if (!session) return <PhotosPage failure="malformed" />;

  return <PhotosPage session={session} token={t} />;
}
