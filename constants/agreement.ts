/**
 * The empanelment agreement, clause for clause.
 *
 * Transcribed from `iqcommune-onboarding.html` by script rather than by hand:
 * this is a legal document the practitioner signs, and a typo introduced by
 * retyping it would be a real defect, not a cosmetic one.
 *
 * The first version of this generator read only clause bodies and sub-clauses
 * and silently dropped clause 4's disclosure block, which the spec marks up as
 * a highlight. The parity gate caught it. Highlights are kept as their own
 * field because the spec renders them differently, and because losing one
 * again should look like a missing field rather than missing prose.
 */

export interface AgreementClause {
  title: string;
  paragraphs: readonly string[];
  subClauses?: readonly string[];
  /** Called out in a tinted panel by the spec. */
  highlights?: readonly string[];
}

export const AGREEMENT_CLAUSES: readonly AgreementClause[] = [
  {
    title: "1. NATURE OF ENGAGEMENT",
    paragraphs: [
      "The Practitioner is empanelled as an independent contributor — not an employee, agent, or partner of the Platform. No employment relationship, joint venture, or partnership is created by this Agreement.",
      "The engagement is non-exclusive. The Practitioner is free to conduct independent training, consulting, or advisory work outside of this Agreement.",
    ],
  },
  {
    title: "2. SCOPE OF ENGAGEMENT",
    paragraphs: [
      "The Practitioner agrees to conduct in-person training sessions within their selected module(s) of expertise, subject to availability confirmation prior to each session. Module preferences are recorded separately from this Agreement and may be updated by the Practitioner from time to time.",
    ],
    subClauses: [
      "(a) Sessions are typically 3 hours in duration, in-person, with a maximum of 25 participants — or up to 6 hours for a bundled two-module session.",
      "(b) The Platform will notify the Practitioner of session requests and confirm availability before any commitment is made. The Practitioner is never obligated to accept a session.",
      "(c) Sessions are typically confirmed 1–2 weeks in advance.",
    ],
  },
  {
    title: "3. REVENUE SHARING & PER-SESSION CONFIRMATION",
    paragraphs: [
      "The Practitioner will receive a payout for each session they confirm and deliver, as detailed in a Per-Session Confirmation issued by the Platform before every session.",
    ],
    subClauses: [
      "(a) Before each session is confirmed, the Platform will issue a Per-Session Confirmation setting out: session date and timing, module, number of participants, audience type, confirmed gross payout amount (pre-tax), and expected payment date. TDS, GST, and net calculations are handled separately with the finance team and are not part of this confirmation. The session is not confirmed until the Practitioner provides digital consent.",
      "(b) The Practitioner's payout per session is determined by the Platform based on the topic, number of participants, and type of audience. The Platform does not disclose total session fees or its own margin. Where a session proceeds with attendance at or above the minimum group size committed by the client, the Practitioner's confirmed payout is unaffected by any shortfall between committed and actual attendance.",
      "(c) Payment will be made within 7 working days of the session date, subject to successful completion.",
      "(d) There are no upfront fees, listing fees, or registration charges payable by the Practitioner to the Platform.",
    ],
  },
  {
    title: "4. IDENTITY, PRIVACY & DISCLOSURE",
    paragraphs: [
    ],
    subClauses: [
      "(f) The Practitioner is solely responsible for determining whether their employer's policies permit this engagement. The Platform does not require employer disclosure.",
    ],
    highlights: [
      "Disclosure operates at two tiers. Public anonymity (absolute): The Practitioner's full name, employer, and personal contact details are never published publicly. Operational disclosure (upon session confirmation, with consent): Once a session is confirmed, the session organiser receives the Practitioner's first name, current employer, domain, and years of experience. All coordination goes through iqcommune — not the Practitioner's personal contact.",
    ],
  },
  {
    title: "4A. PAYMENT & BILLING PREFERENCES",
    paragraphs: [
      "Payment, invoicing, and tax details are collected and administered separately by the Platform's finance team after empanelment — not as part of this agreement or the onboarding process. The Practitioner remains solely responsible for raising invoices and for all tax obligations arising from this income.",
    ],
  },
  {
    title: "5. CONDUCT DURING SESSIONS",
    paragraphs: [
      "The session environment must remain strictly educational and product-neutral. During sessions the Practitioner will not actively promote or cross-sell any financial product, fund, scheme, or instrument. The Practitioner will not collect attendee contact details in bulk. The Practitioner may share their own contact details or business card with attendees at their own discretion.",
      "These restrictions apply only within the session. Breach of the in-session restrictions is grounds for immediate termination.",
    ],
  },
  {
    title: "6. POST-SESSION CONDUCT",
    paragraphs: [
      "iqcommune cannot and does not seek to control interactions between the Practitioner and session participants after a session concludes. Any professional or commercial arrangement that arises after a session is entirely between those two parties. iqcommune has no role, no liability, and places no restriction on such interactions. The Practitioner may not represent themselves as acting on behalf of iqcommune in any post-session commercial engagement.",
    ],
  },
  {
    title: "7. CONFIDENTIALITY",
    paragraphs: [
      "Each Party agrees to keep confidential any non-public information disclosed by the other Party, including participant details, session pricing, and internal platform operations. This obligation survives termination for two (2) years.",
    ],
  },
  {
    title: "8. CONFLICT OF INTEREST",
    paragraphs: [
      "The Practitioner agrees to disclose to the Platform any circumstance that may constitute a conflict of interest prior to accepting a session. The Platform reserves the right to reassign the session in such cases.",
    ],
  },
  {
    title: "9. INTELLECTUAL PROPERTY",
    paragraphs: [
      "Teaching material and frameworks the Practitioner uses remain their own intellectual property. The Platform makes no claim over it. The iqcommune brand and name may not be used by the Practitioner in any public communication without prior written approval.",
    ],
  },
  {
    title: "10. TERM & TERMINATION",
    paragraphs: [
      "This Agreement begins on the date signed below and continues until terminated by either Party with 14 days' written notice. The Platform may terminate immediately for breach of Clause 5 (Conduct During Sessions) or Clause 7 (Confidentiality). Revenue share for sessions already conducted remains payable upon termination.",
    ],
  },
  {
    title: "11. LIMITATION OF LIABILITY",
    paragraphs: [
      "The Platform is not liable for loss of income from session cancellation or low demand. Session frequency is demand-driven and not guaranteed. The Practitioner is solely responsible for the accuracy of content shared during sessions.",
    ],
  },
  {
    title: "12. GOVERNING LAW & DISPUTES",
    paragraphs: [
      "This Agreement is governed by the laws of India. Disputes will first be resolved through mutual discussion. If unresolved within 30 days, the matter will be referred to arbitration under the Arbitration and Conciliation Act, 1996.",
    ],
  },
  {
    title: "13. ENTIRE AGREEMENT",
    paragraphs: [
      "This Agreement, together with any written Per-Session Confirmation, constitutes the entire agreement between the Parties. Amendments require written consent from both Parties.",
    ],
  },
];
