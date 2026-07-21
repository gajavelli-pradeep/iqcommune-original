import { FaqAccordion, type Faq } from "@/components/ui/FaqAccordion";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Ten practitioner questions, on the accordion shared with the landing page. */

const FAQS: ReadonlyArray<Faq> = [
  {
    question: "Will my employer or clients know I'm doing this?",
    answer:
      "We never publish your name, job title, or organisation anywhere on our platform or in any public channel. However, we want to be fully honest about what happens operationally: once you confirm availability for a session, the session organiser receives a brief profile — your first name, organisation or practice name, domain, and years of experience. This is shared with your explicit consent (captured during onboarding) and adds credibility with the organiser. If you are independent, we describe you as an independent practitioner in your domain — never as a freelancer or trainer. All coordination goes through iqcommune, not your personal contact. Whether you inform your employer (if you have one) is entirely your call — we don't require it and we don't make it necessary.",
  },
  {
    question: "Will clients eventually find out who I am?",
    answer:
      "We want to be honest about this too. Once a session is confirmed, the organiser knows your name and your organisation or practice — and in an in-person session, your identity becomes known in the room. We can't prevent that, and we won't pretend otherwise. What we control is the layer before that: nothing appears publicly, your personal contact details are never given to clients, and employer disclosure to organisers only happens after your explicit availability confirmation and consent. Our empanelment agreement also asks participants not to seek commercial relationships with practitioners outside of the platform — but we acknowledge we can't fully control what happens after a session. The best protection is a platform worth staying on, which is what we're building.",
  },
  {
    question: "How does the revenue sharing work?",
    answer:
      "The exact revenue share percentage is discussed and confirmed during the onboarding conversation — before you commit to anything. We don't publish a fixed number here because it may vary based on session type, audience, and format. What we can say: you will always know the exact amount you'll earn before a session is confirmed. There are no surprises.",
  },
  {
    question: "Do I need to prepare a presentation or course material?",
    answer:
      "No. The entire premise of iqcommune is that you teach from your own experience — not from a scripted deck. You don't need slides, notes, or a curriculum. We'll share a loose session outline (the key areas participants expect to cover) but what happens in the room is driven by you and the questions the group asks. That's the point.",
  },
  {
    question: "Can I be listed for more than one module?",
    answer:
      "Yes — if your experience genuinely spans multiple areas, you can indicate that in the application. We'll have a conversation to understand your depth in each. We'd rather match you to one module you're excellent at than spread you across three where the quality thins out. We'll guide this together.",
  },
  {
    question: "Will I ever be asked to teach a longer, bundled session?",
    answer:
      "Occasionally. Any booking — Groups, Organisations, or AMC/wealth-firm clients — can request two related modules back-to-back as a single 6-hour session. Three combinations are available: Foundations of Personal Finance with Retirement & Goal-Based Financial Planning; Equity Investing Simplified with Debt & Fixed Income Investing; or Asset Allocation & Portfolio Construction with Investment Solutions & Portfolio Strategies. This only happens when one practitioner can credibly cover both halves. If a bundled request comes in, we'll check with you specifically before confirming anything — your revenue share is adjusted to reflect the longer session, and you're never auto-enrolled into a bundle you didn't agree to.",
  },
  {
    question: "What if I'm approached by a participant after the session?",
    answer:
      "That's entirely up to you. You're welcome to share your own contact details or business card with attendees during or after the session — that's your professional identity to share as you see fit. What we ask is that the session itself stays clean: no product pitching, no cross-selling, and no collecting attendee contact details in bulk during the session. What happens between you and an individual after the session — a conversation, a professional connection, or anything else — is purely between the two of you. iqcommune has no role in it and places no restriction on it.",
  },
  {
    question: "How far in advance will I know about a session?",
    answer:
      "We typically confirm sessions 1–2 weeks in advance. Before we confirm anything, we always check your availability first. You're never committed to a session you didn't agree to. If the timing doesn't work, we find another practitioner for that request — no pressure, no obligation.",
  },
  {
    question: "Is there any exclusivity — can I do similar sessions independently?",
    answer:
      "No exclusivity. You're free to conduct your own independent sessions or workshops. The empanelment is non-exclusive by design — we don't want to restrict what you do with your own expertise outside of our platform.",
  },
  {
    question: "How does payment actually work?",
    answer:
      "This application only covers who you are and what you'd teach — payment and invoicing details aren't collected here. Once you're empanelled, our finance team will reach out separately to set that up directly with you.",
  },
];

export function Faqs() {
  return (
    <section className="bg-surface px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-page">
        <SectionHeading
          tag="FAQs"
          headline="Things practitioners ask."
          sub="Honest answers — no fine print."
        />
        <FaqAccordion faqs={FAQS} />
      </div>
    </section>
  );
}
