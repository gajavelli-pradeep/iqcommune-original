import { GalleryCarousel, type GallerySlide } from "./GalleryCarousel";
import { listPublishedPhotos, type GalleryPhoto } from "@/services/gallery";

/**
 * "Sessions in the room" — the landing page's one read, and the reason F2 exists.
 *
 * Until photos are published from the admin console (P8) the spec itself says
 * this section shows illustrative placeholders, so an empty database is a
 * designed state rather than a hole.
 *
 * A failed read lands in that same state. It used to raise an alert on the
 * landing page instead, on the reasoning that an outage must never hide behind
 * a plausible-looking page — right for a section whose content is the product,
 * wrong for this one. There is nothing to hide: no photo has ever been
 * published, so a working read and a broken one both show the artwork. All the
 * alert did was tell a first-time visitor that the site is broken. The outage
 * still has to be loud, so it goes to the server log, where whoever can act on
 * it is looking.
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
 * The first seven captions are the spec's; the rest have no spec counterpart and
 * take the line printed on their own artwork. Slides 11-20 were drawn to match
 * by scripts/generate-gallery-placeholders.mjs.
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
  { caption: "Questions you were told were too basic" },
  { caption: "Twenty-five people, one room, no jargon" },
  { caption: "The person teaching still does the job" },
  { caption: "Bring your actual numbers. We'll work through them." },
  { caption: "No commission. No product. No catch." },
  { caption: "Money talk, without the sales pitch" },
  { caption: "Learn it once, use it for life" },
  { caption: "Weekends well spent, in a room that gets it" },
  { caption: "Every session ends with what to do next" },
  { caption: "Built for people, not for portfolios" },
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
  try {
    photos = await listPublishedPhotos();
  } catch (error) {
    // Loud here, silent on the page — see the note above.
    console.error("[gallery] published-photo read failed, falling back to artwork:", error);
  }
  return <Gallery photos={photos} />;
}

export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
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

      <GalleryCarousel slides={slides} />

      <p className="px-8 pb-2 text-center text-[12.5px] text-surface/30">
        Attended a session? Share it on social media and tag{" "}
        <strong className="font-medium text-surface/55">@iqcommune</strong> — we feature the best
        ones here.
      </p>
    </section>
  );
}
