/**
 * The empanelment agreement, clause for clause.
 *
 * GENERATED — do not edit. Run `node scripts/build-agreement-content.mjs`
 * after changing spec/v7/iqcommune-empanelment-agreement-content.json, which is the
 * client's delivery and the only place this text may be edited.
 *
 * Paragraphs are a single flat list per clause because the source is flat. The
 * previous shape split them into `paragraphs`, `subClauses` and `highlights`
 * to mirror how the V7 page styles them, and the PDF then printed the three
 * groups in its own order — which is how clause 4 came to open with "(f)" and no
 * (a)–(e) above it. Order is content in a contract, so there is now only one
 * list and it is the client's.
 */

export interface AgreementClause {
  title: string;
  paragraphs: readonly string[];
}

/**
 * One row of the header or signature block: the client's label, and the key
 * naming the value that fills it. Every one is substituted at render time — see
 * `dynamicFields` in the source JSON for what each key means.
 */
export interface AgreementField {
  key: string;
  label: string;
}

/** The document's own heading. */
export const AGREEMENT_DOCUMENT_TITLE = "PRACTITIONER EMPANELMENT AGREEMENT";

/**
 * The four rows above the preamble: who, where, and which empanelment.
 *
 * The platform is no longer one of them — v2 names it inside `AGREEMENT_INTRO`
 * instead, so a header row repeating it would say the same thing twice.
 */
export const AGREEMENT_HEADER_FIELDS: readonly AgreementField[] = [
  { key: "practitionerName", label: "Name of the Practitioner" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "empanelmentRef", label: "Empanelment Reference Number" },
];

/** Names the parties and the moment the agreement takes effect. */
export const AGREEMENT_INTRO = "This Empanelment Agreement (“Agreement”) is entered into between InvestQ Commune, operating as iqcommune (“the Platform”), and the Practitioner named above, effective as of the date of digital signature captured through the Platform’s onboarding process.";

/**
 * The sentence that makes a signature mean something. It was absent from the
 * PDF entirely, which recorded *how* the practitioner signed but never *what
 * they agreed to* by signing.
 */
export const AGREEMENT_CONSENT_TEXT = "By providing digital consent through the Platform’s onboarding page, the Practitioner confirms they have read, understood, and agree to be bound by all clauses of this Agreement.";

export const AGREEMENT_SIGNATURE_HEADING = "SIGNATURE";

/** What the execution block records: who signed, when, and by which method. */
export const AGREEMENT_SIGNATURE_FIELDS: readonly AgreementField[] = [
  { key: "practitionerName", label: "Signed by" },
  { key: "signatureTimestamp", label: "Execution Date" },
  { key: "signatureMethod", label: "Signature Method" },
];

export const AGREEMENT_CLAUSES: readonly AgreementClause[] = [
  {
    title: "1. NATURE OF ENGAGEMENT",
    paragraphs: [
      "The Practitioner is empanelled as an independent contributor — not an employee, agent, or partner of the Platform. No employment relationship, joint venture, or partnership is created by this Agreement.",
      "The engagement is non-exclusive. The Practitioner is free to conduct independent training, consulting, or advisory work outside of this Agreement, provided it does not conflict with Clause 6 (No Solicitation) or Clause 8 (Conflict of Interest).",
    ],
  },
  {
    title: "2. SCOPE OF ENGAGEMENT",
    paragraphs: [
      "The Practitioner agrees to conduct in-person training sessions within their selected module(s) of expertise, subject to availability confirmation prior to each session. Module preferences are recorded separately from this Agreement and may be updated by the Practitioner from time to time.",
      "(a) Sessions are typically 3 hours in duration, in-person, with a maximum of 25 participants — or up to 6 hours for a bundled two-module session.",
      "(b) The Platform will notify the Practitioner of session requests and confirm availability before any commitment is made. The Practitioner is never obligated to accept a session.",
      "(c) Sessions are typically confirmed 1–2 weeks in advance. The Platform will make reasonable efforts to provide adequate notice.",
      "The Practitioner will teach from their own professional knowledge and current experience. No specific curriculum, slides, or prepared material is required unless mutually agreed.",
    ],
  },
  {
    title: "3. REVENUE SHARING & PER-SESSION CONFIRMATION",
    paragraphs: [
      "The Practitioner will receive a revenue share for each session they confirm and deliver, as detailed in a Per-Session Confirmation issued by the Platform before every session. The empanelment agreement governs the overall relationship; the Per-Session Confirmation governs the specific commercial terms of each individual session.",
      "(a) Before each session is confirmed, the Platform will issue a Per-Session Confirmation to the Practitioner. This is a separate one-page document (sent via email or digital link) that sets out: the session date and timing, module, number of participants, audience type, and confirmed gross payout amount (pre-tax) to the Practitioner, along with expected payment date. TDS, GST, and net payout calculations are handled separately by the Platform’s finance/accounting team and are not part of this confirmation. The session is not confirmed until the Practitioner provides digital consent on the Per-Session Confirmation.",
      "(b) The Practitioner’s payout per session is determined by the Platform based on the topic, number of participants, and type of audience. The Platform does not disclose total session fees or its own margin. The confirmed payout amount for each session is stated in the Per-Session Confirmation and is binding once the Practitioner provides consent. Where a session proceeds with attendance at or above the minimum group size committed by the client, the Practitioner’s confirmed payout is unaffected by any shortfall between committed and actual attendance.",
      "(c) Payment will be made within 7 working days of the session date, subject to successful completion of the session and the Practitioner’s duly submitted Per-Session Confirmation consent.",
      "(d) The Practitioner is responsible for their own tax obligations arising from earnings under this Agreement. Payment, invoicing, and tax details are collected and administered separately by the Platform’s finance team after empanelment. There are no upfront fees, listing fees, or registration charges of any kind payable by the Practitioner to the Platform.",
    ],
  },
  {
    title: "4. IDENTITY, PRIVACY & DISCLOSURE",
    paragraphs: [
      "The Parties agree that disclosure operates at two distinct tiers, both of which the Practitioner explicitly consents to by signing this Agreement:",
      "Tier 1 — Public Anonymity (absolute):",
      "(a) The Practitioner’s full name, current employer, job designation, personal email, and personal phone number will never be published, displayed, or referenced on the Platform’s website, social media, marketing materials, or any public-facing communication.",
      "(b) The Platform describes its practitioner pool in aggregate terms (role type, years of experience, domain) — without identifying individuals.",
      "Tier 2 — Operational Disclosure (upon session confirmation, with consent):",
      "(c) Once the Practitioner confirms availability for a specific session, the Platform will share a brief professional profile with the confirmed session organiser. This profile will contain: the Practitioner’s first name; their current employer’s name (shared with the Practitioner’s explicit consent to establish credibility); their domain and years of experience; and a coordination contact routed through the Platform (not the Practitioner’s personal number).",
      "(d) The Practitioner acknowledges that in-person sessions result in the Practitioner’s identity becoming known to session participants. The Platform cannot control recognition or identification once a session commences. The Practitioner accepts this as an inherent characteristic of in-person delivery.",
      "(e) The session organiser is bound by confidentiality obligations not to share the Practitioner’s profile with third parties outside the confirmed session context.",
      "Employer Disclosure:",
      "(f) The Practitioner is solely responsible for determining whether their employer’s policies permit participation in this engagement. The Platform does not require employer disclosure and makes no representation that such disclosure has been obtained.",
    ],
  },
  {
    title: "4A. PAYMENT & BILLING PREFERENCES",
    paragraphs: [
      "Payment, invoicing, and tax details are collected and administered separately by the Platform’s finance team after empanelment — not as part of this Agreement or the onboarding process.",
      "(a) The Practitioner remains solely responsible for raising invoices and for all tax obligations arising from this income. The Platform does not provide tax advice and makes no representation regarding the tax treatment of the Practitioner’s earnings.",
    ],
  },
  {
    title: "5. CONDUCT DURING SESSIONS",
    paragraphs: [
      "The session environment must remain strictly educational and product-neutral. The following restrictions apply strictly within the session itself — they do not govern any interaction or engagement that takes place outside the session.",
      "(a) The Practitioner will not actively promote, recommend, endorse, or solicit interest in any specific financial product, fund, scheme, insurance policy, or investment instrument — whether affiliated with their employer or otherwise — during any session conducted under this Agreement.",
      "(b) The Practitioner will not collect attendee contact details, distribute product literature, or use the session as a lead generation exercise.",
      "(c) The Practitioner may share their own contact details, business card, or professional profile with attendees at their own discretion. This is expressly permitted.",
      "The above restrictions apply only within the session. Breach of the in-session restrictions at (a) and (b) is grounds for immediate termination of this Agreement.",
    ],
  },
  {
    title: "6. POST-SESSION CONDUCT",
    paragraphs: [
      "The Platform acknowledges that it cannot and does not seek to control interactions between the Practitioner and session participants that occur after a session has concluded. The Parties agree as follows:",
      "(a) Any professional relationship, advisory engagement, commercial arrangement, or personal interaction that arises between the Practitioner and a participant after a session is entirely between those two parties. iqcommune has no role, no liability, and places no restriction on such interactions.",
      "(b) The Practitioner is not required to disclose, report, or seek approval for any post-session interaction with a participant.",
      "(c) Notwithstanding the above, the Practitioner agrees not to represent themselves as acting on behalf of or in association with iqcommune in any post-session commercial engagement with a participant.",
    ],
  },
  {
    title: "7. CONFIDENTIALITY",
    paragraphs: [
      "Each Party agrees to keep confidential any non-public information disclosed by the other Party in connection with this Agreement, including but not limited to participant details, session pricing, revenue share terms, and internal platform operations.",
      "This obligation survives the termination of this Agreement for a period of two (2) years.",
    ],
  },
  {
    title: "8. CONFLICT OF INTEREST",
    paragraphs: [
      "The Practitioner agrees to disclose to the Platform any circumstance that may reasonably constitute a conflict of interest prior to accepting a session — for example, if a session participant is a current or prospective client of the Practitioner’s employer.",
      "The Platform reserves the right to reassign the session to another practitioner in such cases, without prejudice to the Practitioner’s standing in the network.",
    ],
  },
  {
    title: "9. INTELLECTUAL PROPERTY",
    paragraphs: [
      "Any teaching material, frameworks, or proprietary content the Practitioner uses during a session remains the Practitioner’s own intellectual property. The Platform makes no claim over it.",
      "The Platform’s brand, name, website, and marketing materials are the exclusive property of the Platform. The Practitioner may not use the iqcommune name or branding in any public communication without prior written approval.",
    ],
  },
  {
    title: "10. TERM & TERMINATION",
    paragraphs: [
      "This Agreement begins on the date of digital signature and remains in effect until terminated by either Party with 14 days’ written notice (email is sufficient).",
      "The Platform may terminate this Agreement immediately and without notice if the Practitioner breaches Clause 5 (Conduct During Sessions), Clause 7 (Confidentiality), or engages in conduct that brings the Platform into disrepute.",
      "Upon termination, the Practitioner’s revenue share for sessions already conducted remains payable as per the agreed terms.",
    ],
  },
  {
    title: "11. LIMITATION OF LIABILITY",
    paragraphs: [
      "The Platform is not liable for any loss of income or opportunity arising from the cancellation of a session, scheduling conflicts, or low session demand. The Practitioner acknowledges that session frequency is demand-driven and not guaranteed.",
      "The Practitioner is solely responsible for the accuracy of content shared during sessions. The Platform does not warrant or endorse any specific financial view expressed by the Practitioner.",
    ],
  },
  {
    title: "12. GOVERNING LAW & DISPUTES",
    paragraphs: [
      "This Agreement is governed by the laws of India. Any disputes arising from this Agreement will first be attempted to be resolved through mutual discussion. If unresolved within 30 days, the matter will be referred to arbitration under the Arbitration and Conciliation Act, 1996, with Hyderabad as the seat of arbitration.",
    ],
  },
  {
    title: "13. ENTIRE AGREEMENT",
    paragraphs: [
      "This Agreement, together with any written confirmation of revenue share terms exchanged by email, constitutes the entire agreement between the Parties. It supersedes all prior discussions, understandings, or representations. Amendments require written consent from both Parties.",
    ],
  },
];
