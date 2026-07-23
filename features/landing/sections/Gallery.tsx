import { GalleryCarousel, type GallerySlide } from "./GalleryCarousel";
import { listPublishedPhotos, type GalleryPhoto } from "@/services/gallery";

/**
 * "Sessions in the room" — the landing page's one read, and the reason F2 exists.
 *
 * Until photos are published from the admin console (P8) the spec itself says
 * this section shows illustrative placeholders, so an empty database is a
 * designed state rather than a hole. A *failed* read is not: it renders as a
 * stated problem, never as "no photos", because silently showing an empty
 * gallery would hide an outage behind a plausible-looking page.
 *
 * V7 renders this as a full-bleed carousel with a bespoke (pill-less) header —
 * see GalleryCarousel for the slider itself.
 */

/**
 * The client's illustrative artwork, one file per slide.
 *
 * Each image already carries its own caption bar, printed in the same place the
 * carousel draws one — so these slides set `captionInArt` and let the artwork
 * speak, rather than stacking a translucent bar on top of a painted one. The
 * caption still travels as the image's alt text, so the spec's copy stays in
 * the DOM for a screen reader and for the parity gate.
 *
 * The first seven captions are the spec's; slides 8-10 have no spec counterpart
 * and take the line printed on their own artwork.
 */
const PLACEHOLDERS: readonly GallerySlide[] = [
  { caption: "Deep in a foundations session" },
  { caption: "Full house for equity investing", city: "Mumbai" },
  { caption: "Wrapping up on a high note" },
  { caption: "Working through a retirement plan", city: "Bengaluru" },
  { caption: "Building out a portfolio, live" },
  { caption: "Great question from the back row", city: "Pune" },
  { caption: "Foundations, session two", city: "Delhi" },
  { caption: "Finance, explained by someone still in it" },
  { caption: "Pan-India reach — metros to tier 2 cities" },
  { caption: "No funnel. No upsell. Just knowledge shared." },
].map((slide, i) => ({
  ...slide,
  url: `/gallery/gallery-placeholder-${i + 1}.png`,
  captionInArt: true,
}));

/**
 * The async read lives in this wrapper, not in `Gallery`, so the section itself
 * stays a plain function of its data. A server component that fetches cannot be
 * rendered in jsdom, and the content-parity gate has to render the real page.
 */
export async function GallerySection() {
  let photos: GalleryPhoto[] = [];
  let failed = false;
  try {
    photos = await listPublishedPhotos();
  } catch {
    failed = true;
  }
  return <Gallery photos={photos} failed={failed} />;
}

export function Gallery({ photos, failed }: { photos: GalleryPhoto[]; failed: boolean }) {
  const slides: readonly GallerySlide[] =
    photos.length > 0
      ? photos.map((p) => ({ caption: p.caption, city: p.city, url: p.url }))
      : PLACEHOLDERS;

  return (
    <section className="overflow-hidden bg-gallery-bg pt-16">
      {/* Bespoke header — V7 uses plain gold eyebrow text, not the pill. */}
      <div className="mb-10 px-8 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-pill text-gold">
          Sessions in the room
        </p>
        <h2 className="text-[clamp(22px,2.8vw,30px)] font-semibold leading-[1.25] text-surface">
          Where it actually happens.
        </h2>
        <p className="mt-1.5 text-[13.5px] text-surface/40">
          Photos from sessions conducted across India — real rooms, real conversations.
        </p>
      </div>

      {failed ? (
        <p
          role="alert"
          className="mx-auto mb-8 max-w-[560px] rounded-md border border-flag-warn-edge bg-flag-warn px-4 py-3 text-center text-base text-gold"
        >
          We couldn&apos;t load the session photos just now. Please refresh in a moment.
        </p>
      ) : (
        <GalleryCarousel slides={slides} />
      )}

      <p className="px-8 pb-2 text-center text-[12.5px] text-surface/30">
        Attended a session? Share it on social media and tag{" "}
        <strong className="font-medium text-surface/55">@iqcommune</strong> — we feature the best
        ones here.
      </p>
    </section>
  );
}
