import Image from "next/image";

import { SectionHeading } from "@/components/ui/SectionHeading";

import { SubmitPhotosButton } from "../RequestSession";
import { listPublishedPhotos, type GalleryPhoto } from "@/services/gallery";

/**
 * "Sessions in the room" — the landing page's one read, and the reason F2 exists.
 *
 * Until photos are published from the admin console (P8) the spec itself says
 * this section shows illustrative placeholders, so an empty database is a
 * designed state rather than a hole. A *failed* read is not: it renders as a
 * stated problem, never as "no photos", because silently showing an empty
 * gallery would hide an outage behind a plausible-looking page.
 */

const PLACEHOLDERS: ReadonlyArray<{ caption: string; city?: string }> = [
  { caption: "Deep in a foundations session" },
  { caption: "Full house for equity investing", city: "Mumbai" },
  { caption: "Wrapping up on a high note" },
  { caption: "Working through a retirement plan", city: "Bengaluru" },
  { caption: "Building out a portfolio, live" },
  { caption: "Great question from the back row", city: "Pune" },
  { caption: "Foundations, session two", city: "Delhi" },
];

function Frame({
  caption,
  city,
  children,
}: {
  caption: string;
  city?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="w-[260px] shrink-0 snap-start overflow-hidden rounded-lg border border-on-dark-divider bg-tool-card">
      <div className="relative flex h-[170px] items-center justify-center bg-tool-well">
        {children ?? (
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            aria-hidden
            focusable="false"
            className="text-gold-rule-strong"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        )}
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm leading-[1.45] text-on-dark-bright">{caption}</p>
        {city ? <p className="mt-0.5 text-2xs uppercase tracking-label text-gold">{city}</p> : null}
      </div>
    </li>
  );
}

/**
 * The async read lives in this wrapper, not in `Gallery`, so the section itself
 * stays a plain function of its data. A server component that fetches cannot be
 * rendered in jsdom, and the content-parity gate has to render the real page.
 */
export async function GallerySection() {
  // Only the *read* is guarded. Constructing JSX inside try/catch would not
  // catch render errors anyway — React renders later — and lint rightly rejects
  // it; render failures belong to the error boundary in the app shell.
  let photos: GalleryPhoto[] = [];
  let failed = false;
  try {
    photos = await listPublishedPhotos();
  } catch {
    // The detail is already logged by the service; the page states the fact.
    failed = true;
  }
  return <Gallery photos={photos} failed={failed} />;
}

export function Gallery({ photos, failed }: { photos: GalleryPhoto[]; failed: boolean }) {
  return (
    <section className="bg-ink px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tone="dark"
          tag="Sessions in the room"
          headline="Where it actually happens."
          sub="Photos from sessions conducted across India — real rooms, real conversations."
        />

        {failed ? (
          <p
            role="alert"
            className="mx-auto max-w-[560px] rounded-md border border-flag-warn-edge bg-flag-warn px-4 py-3 text-center text-base text-gold"
          >
            We couldn&apos;t load the session photos just now. Please refresh in a moment.
          </p>
        ) : (
          <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
            {photos.length > 0
              ? photos.map((photo) => (
                  <Frame key={photo.id} caption={photo.caption} city={photo.city}>
                    <Image
                      src={photo.url}
                      alt={photo.caption}
                      fill
                      sizes="260px"
                      className="object-cover"
                    />
                  </Frame>
                ))
              : PLACEHOLDERS.map((slide) => (
                  <Frame key={slide.caption} caption={slide.caption} city={slide.city} />
                ))}
          </ul>
        )}

        <p className="mt-8 text-center text-base text-on-dark-muted">
          Attended a session? Share it on social media and tag{" "}
          <span className="font-medium text-gold">@iqcommune</span> — we feature the best ones here.
        </p>
        <p className="mt-2 text-center text-base text-on-dark-muted">
          Ran a session? <SubmitPhotosButton />
        </p>
      </div>
    </section>
  );
}
