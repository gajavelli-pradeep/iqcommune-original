"use client";

import { useState } from "react";

import { EmailTypoHint } from "@/components/ui/EmailTypoHint";
import { CheckboxField, SelectField, TextField, TextareaField } from "@/components/ui/Field";
import { FormError } from "@/components/ui/FormError";
import { Modal } from "@/components/ui/Modal";
import { suggestEmailDomain } from "@/lib/email/suggest-domain";
import { MODULES } from "@/constants/modules";
import { SUBMIT_FAILURE } from "@/content/submit-failure";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  sessionRequestSubmission,
  type Audience,
  type SessionRequestInput,
} from "@/lib/schemas/session-request";

/**
 * "Join the Waitlist" — the landing page's one write, and the reason F2 and F3
 * exist.
 *
 * The form is audience-driven: choosing who this is for changes the guidance,
 * whether an organisation name is asked for, whether venue details are
 * required, and the wording of the declaration. That branching is spec
 * behaviour, so it lives in data here rather than in the six `style.display`
 * mutations the spec used.
 */

const BUNDLES = [
  {
    value:
      "Bundle — Foundations of Personal Finance + Retirement & Goal-Based Financial Planning (6 hrs)",
    label: "Bundle — Foundations + Retirement & Goal-Based Planning (6 hrs)",
  },
  {
    value: "Bundle — Equity Investing Simplified + Debt & Fixed Income Investing (6 hrs)",
    label: "Bundle — Equity Investing + Debt & Fixed Income (6 hrs)",
  },
  {
    value:
      "Bundle — Asset Allocation & Portfolio Construction + Investment Solutions & Portfolio Strategies (6 hrs)",
    label: "Bundle — Asset Allocation + Investment Solutions (6 hrs)",
  },
] as const;

/**
 * Single-topic options come from the module taxonomy, not a second copy of it.
 * This file used to re-type all six names — byte-identical, and exactly the
 * drift `constants/modules.ts` was created to stop (audit M4). A session's topic
 * is a module, so adding one there now reaches this form for free.
 */
const TOPIC_OPTIONS = [
  ...MODULES.map((topic) => ({ value: topic, label: topic })),
  ...BUNDLES,
  { value: "Not sure — help me choose", label: "Not sure — help me choose" },
];

const GROUP_SIZES = [
  { value: "5-8", label: "5 – 8 people", minimum: 5 },
  { value: "9-15", label: "9 – 15 people", minimum: 9 },
  { value: "16-25", label: "16 – 25 people", minimum: 16 },
] as const;

/** Everything that varies by audience, in one table instead of six branches. */
const AUDIENCE_RULES: Record<
  Audience,
  {
    context: React.ReactNode;
    organisation?: { label: string; placeholder: string };
    venueRequired: boolean;
    declaration: React.ReactNode;
  }
> = {
  individual: {
    context: (
      <>
        You are registering as the SPOC (primary contact) for your group. Minimum 5 participants
        required. Sessions are priced per head — the minimum charge applies to the lower bound of
        your selected group size, regardless of actual attendance on the day.{" "}
        <strong className="text-ink">
          Venue booking and cost are your group&apos;s responsibility — happy to share a few
          suggestions for your city if you need them.
        </strong>{" "}
        You can also request a 6-hour bundled session covering two related modules — this requires a
        minimum of 9 participants.
      </>
    ),
    venueRequired: true,
    declaration: (
      <>
        I confirm I am registering as the <strong className="text-ink">SPOC (primary contact)</strong>{" "}
        for this group and that the minimum attendance commitment applies regardless of actual
        turnout on the day. I confirm I will coordinate venue and logistics for the session.
      </>
    ),
  },
  corporate: {
    context: (
      <>
        You are registering as the SPOC for your organisation. We&apos;ll tailor the session to your
        team&apos;s goals and align the right practitioner.{" "}
        <strong className="text-ink">
          Venue and basic infrastructure (seating, projector/screen) are to be arranged by your
          organisation. We handle everything else.
        </strong>{" "}
        You can also request a 6-hour bundled session — select a bundle option in the topic field
        below.
      </>
    ),
    organisation: {
      label: "Organisation name",
      placeholder: "e.g. TechCorp India, St. Xavier's College, Apollo Hospitals",
    },
    venueRequired: false,
    declaration: (
      <>
        I confirm I am registering as the <strong className="text-ink">SPOC (primary contact)</strong>{" "}
        for this organisation and will coordinate internally on session logistics, venue, and
        participant attendance.
      </>
    ),
  },
  finance: {
    context: (
      <>
        You are registering as the SPOC for your firm. We&apos;ll match the right practitioner and
        structure the session around your goals.{" "}
        <strong className="text-ink">
          Venue and setup are on your end — we take care of the content and delivery.
        </strong>{" "}
        You can also request a 6-hour bundled session — select a bundle option in the topic field
        below.
      </>
    ),
    organisation: {
      label: "Firm name",
      placeholder: "e.g. HDFC AMC, Mirae Asset, Axis Securities, Anand Rathi Wealth",
    },
    venueRequired: false,
    declaration: (
      <>
        I confirm I am registering as the <strong className="text-ink">SPOC (primary contact)</strong>{" "}
        for this firm and will coordinate internally on session logistics, venue, and participant
        attendance.
      </>
    ),
  },
};

/**
 * Windows' shell handler truncates a `mailto:` past roughly 2,048 characters,
 * and does it *silently* — the tail of the message simply never arrives, which
 * is the worst possible failure for a draft whose whole job is to lose nothing.
 *
 * Measured: with every field at its schema maximum the encoded href reached
 * 2,689 characters, so clamping each field to one fixed length does not settle
 * it. The draft measures itself instead.
 */
const HREF_BUDGET = 1900;

/**
 * Tried in order; the first that fits wins, so a short request keeps everything.
 * The tight steps at the end exist for the pathological case — every field at
 * its schema maximum — where the client's prose leaves little room. Real
 * requests never reach them.
 */
const FIELD_LIMITS = [400, 200, 120, 60, 30, 20];

const clampTo = (limit: number) => (value: string) =>
  value.length > limit ? `${value.slice(0, limit)}…` : value;

/**
 * The fallback email, drafted from what the visitor already typed so the only
 * thing left to do in their mail client is press send.
 *
 * Re-asking for eleven fields is how a recovery path ends up worse than the
 * failure it recovers from, so everything on the form is carried over.
 */
function composeBody(
  form: SessionRequestInput,
  audience: Audience | undefined,
  name: string,
  clamp: (value: string) => string,
) {
  const details: Array<[string, string | undefined]> = [
    ["Who this is for", audience ? AUDIENCE_LABELS[audience] : undefined],
    // See the same note in ApplyModalBody: clamped only for the absurd case
    // where the schema's 80 + 80 characters are actually used.
    ["Name", clamp(name)],
    ["Email", form.email],
    ["Phone", form.phone],
    // Every free-text field is clamped, not just the long ones — see the same
    // note in ApplyModalBody: the client's prose leaves less room for fields.
    ["City / State", clamp([form.city, form.state].filter(Boolean).join(", "))],
    ["Organisation", form.organisationName && clamp(form.organisationName)],
    // NOT clamped, deliberately: the topic is chosen from a fixed list, so it is
    // bounded (a bundle is the longest at ~110 characters) and it is the whole
    // subject of the request. Truncating it would lose what the session is for.
    ["Topic", form.topic],
    ["Group size", GROUP_SIZES.find((size) => size.value === form.groupSize)?.label],
    ["Preferred window", form.preferredWindow && clamp(form.preferredWindow)],
    ["Venue", form.venueDetails && clamp(form.venueDetails)],
    ["Notes", form.notes && clamp(form.notes)],
  ];

  // CRLF: the line break mailto bodies are specified in, and the one every mail
  // client agrees on once percent-encoded.
  return [
    "Dear iqcommune,",
    "",
    "I tried submitting my request on your website but was redirected to this alternative mode (via email) due to a technical glitch at your end. Please find all the details as required in the request form.",
    "",
    ...details.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    "",
    // Only when the box was actually ticked. It renders for the audiences that
    // have one, so printing this for someone who never saw it would assert an
    // agreement they never gave — the opposite of what a consent record is for.
    ...(form.spocConfirmed
      ? [
          "I am fully aware that this email shall be deemed as my agreement with all the terms & conditions with respect to responsibility of a SPOC, minimum attendance commitment etc., as cited in the consent section of the request form.",
          "",
        ]
      : []),
    "Awaiting to hear from you on the next steps.",
    "",
    "Thanks,",
    clamp(name),
  ].join("\r\n");
}

/** The complete `mailto:` href, composed at the most generous length that fits. */
export function draftSessionMailto(
  form: SessionRequestInput,
  audience: Audience | undefined,
  address: string,
): string {
  const name = `${form.firstName} ${form.lastName}`.trim();
  // Client format, MOM 2026-08-10. "Module Name" is the topic: its options are
  // the six module names, the bundles, and "Not sure — help me choose".
  const subject = `${["New Session Request", form.firstName, form.topic]
    .filter(Boolean)
    .join(" - ")} (offline request)`;
  const build = (limit: number) =>
    `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      composeBody(form, audience, name, clampTo(limit)),
    )}`;

  return (
    FIELD_LIMITS.map(build).find((href) => href.length <= HREF_BUDGET) ??
    build(FIELD_LIMITS[FIELD_LIMITS.length - 1])
  );
}

const EMPTY: SessionRequestInput = {
  audience: "individual",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  organisationName: "",
  topic: "",
  groupSize: "",
  preferredWindow: "",
  venueDetails: "",
  notes: "",
  spocConfirmed: false,
};

type Status = "editing" | "submitting" | "sent";

export function RequestModal({
  open,
  onClose,
  /**
   * Where the mailto fallback points. Optional because the address behind it
   * (`BREVO_SENDER_SESSION`, falling back to `BREVO_SENDER_EMAIL`) is
   * FEATURE-tier — unset, the offer is simply not made, rather than rendering a
   * `mailto:undefined`.
   */
  sessionEmail,
}: {
  open: boolean;
  onClose: () => void;
  sessionEmail?: string;
}) {
  const [audience, setAudience] = useState<Audience | undefined>();
  const [form, setForm] = useState<SessionRequestInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<{ message: string; offerEmail: boolean }>();

  const rules = audience ? AUDIENCE_RULES[audience] : undefined;
  const selectedSize = GROUP_SIZES.find((size) => size.value === form.groupSize);

  const mailtoHref =
    submitError?.offerEmail && sessionEmail
      ? draftSessionMailto(form, audience, sessionEmail)
      : undefined;
  const set = <K extends keyof SessionRequestInput>(key: K, value: SessionRequestInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function close() {
    onClose();
    // Reset only after the dialog is gone, so the user never watches their own
    // answers disappear.
    setTimeout(() => {
      setForm(EMPTY);
      setAudience(undefined);
      setErrors({});
      setStatus("editing");
      setSubmitError(undefined);
    }, 200);
  }

  async function submit() {
    const parsed = sessionRequestSubmission.safeParse({ ...form, audience });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }

    setErrors({});
    setStatus("submitting");
    setSubmitError(undefined);

    try {
      const response = await fetch("/api/session-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();

      if (!response.ok) {
        // Field errors from the server win: it is the authority, and it may
        // know things the client cannot.
        if (body?.error?.fields) setErrors(body.error.fields);
        // Only a server fault earns the escape hatch. A validation error is the
        // visitor's own to fix, and a rate limit exists precisely to not be
        // routed around.
        const offerEmail = body?.error?.code === "INTERNAL";
        setSubmitError({
          // The client's copy replaces the API's message only where the offer
          // appears. Everywhere else the API's wording is the useful one — it
          // names the fields to fix, or says how long to wait.
          message: offerEmail
            ? SUBMIT_FAILURE.message
            : (body?.error?.message ?? "Something went wrong. Please try again in a few minutes."),
          offerEmail,
        });
        setStatus("editing");
        return;
      }

      setStatus("sent");
    } catch {
      // Composing a mailto needs no network, so this failure — the one where the
      // server is unreachable — is exactly when the offer is worth the most.
      setSubmitError({ message: SUBMIT_FAILURE.message, offerEmail: true });
      setStatus("editing");
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={status === "sent" ? "You're on the list!" : "Join the Waitlist"}
      description={
        status === "sent"
          ? undefined
          : "Tell us a bit about what you need — we'll notify you the moment sessions open in your city."
      }
    >
      {status === "sent" ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-light text-green">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
              focusable="false"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          {/* V7 greets by first name where it has one and drops the comma where
              it does not — the form requires the field, so in practice the named
              form is what ships; the fallback covers a receipt rendered from
              state that never held one. No reply window is quoted: until a
              practitioner is empanelled in their city there is no date to
              promise, which is the whole point of the waitlist. */}
          <p className="text-lg text-ink-muted">
            Thanks{form.firstName ? `, ${form.firstName}` : ""} — you&apos;re on the waitlist.
            We&apos;ll notify you the moment sessions open in your city.
          </p>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset className="mb-4">
            <legend className="mb-1.5 text-sm font-medium text-ink">Who is this for?</legend>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={audience === option}
                  onClick={() => setAudience(option)}
                  className={`min-h-11 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                    audience === option
                      ? "border-gold-border bg-gold-light font-medium text-gold-dark"
                      : "border-border-strong text-ink-muted hover:border-gold-border hover:text-ink"
                  }`}
                >
                  {AUDIENCE_LABELS[option]}
                </button>
              ))}
            </div>
            {errors.audience ? (
              <p role="alert" className="mt-1 text-sm text-red">
                {errors.audience}
              </p>
            ) : null}
          </fieldset>

          <p className="mb-5 rounded-r-md border border-l-[3px] border-border border-l-gold bg-surface-soft px-4 py-3 text-sm leading-[1.65] text-ink-muted">
            {rules?.context ?? "Select an audience type above and we'll tailor our follow-up accordingly."}
          </p>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              label="First name"
              placeholder="Rohan"
              value={form.firstName}
              onChange={(value) => set("firstName", value)}
              error={errors.firstName}
            />
            <TextField
              label="Last name"
              placeholder="Mehta"
              value={form.lastName}
              onChange={(value) => set("lastName", value)}
              error={errors.lastName}
            />
          </div>

          <TextField
            type="email"
            label="Email address"
            placeholder="rohan@example.com"
            hint={
              <EmailTypoHint
                suggestion={suggestEmailDomain(form.email)}
                onAccept={(email) => set("email", email)}
              />
            }
            value={form.email}
            onChange={(value) => set("email", value)}
            error={errors.email}
          />
          <TextField
            type="tel"
            label="Phone number"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(value) => set("phone", value)}
            error={errors.phone}
          />

          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              label="City"
              placeholder="e.g. Mumbai"
              value={form.city}
              onChange={(value) => set("city", value)}
              error={errors.city}
            />
            <TextField
              label="State"
              placeholder="e.g. Maharashtra"
              value={form.state}
              onChange={(value) => set("state", value)}
              error={errors.state}
            />
          </div>

          {rules?.organisation ? (
            <TextField
              label={rules.organisation.label}
              placeholder={rules.organisation.placeholder}
              value={form.organisationName ?? ""}
              onChange={(value) => set("organisationName", value)}
              error={errors.organisationName}
            />
          ) : null}

          <SelectField
            label="Topic of interest"
            placeholder="Select a training topic…"
            options={TOPIC_OPTIONS}
            value={form.topic}
            onChange={(value) => set("topic", value)}
            error={errors.topic}
            hint="Bundled (6-hour) sessions are open to all audiences. For Groups, this requires a minimum of 9 participants."
          />

          <div className="grid gap-x-4 sm:grid-cols-2">
            <SelectField
              label="Group size"
              placeholder="Select…"
              options={GROUP_SIZES.map((size) => ({ value: size.value, label: size.label }))}
              value={form.groupSize ?? ""}
              onChange={(value) => set("groupSize", value)}
              error={errors.groupSize}
              hint="Sessions are capped at 25 participants."
            />
            <TextField
              label="Preferred date window"
              placeholder="e.g. July last week"
              value={form.preferredWindow ?? ""}
              onChange={(value) => set("preferredWindow", value)}
              error={errors.preferredWindow}
              hint="Rough window is fine — we confirm offline."
            />
          </div>

          {rules?.venueRequired ? (
            <TextField
              label="Your venue details"
              placeholder="e.g. Society clubhouse, office conference room, community hall…"
              value={form.venueDetails ?? ""}
              onChange={(value) => set("venueDetails", value)}
              error={errors.venueDetails}
              hint="Venue booking is your group's responsibility. Share the space you've finalised, or let us know if you'd like a few suggestions for your city."
            />
          ) : null}

          {audience === "individual" && selectedSize ? (
            <div className="mb-4 rounded-r-md border border-l-[3px] border-gold-border border-l-gold bg-gold-light px-4 py-[0.85rem] text-sm leading-[1.65] text-gold-dark">
              <strong className="mb-[3px] block font-semibold text-ink">
                Minimum attendance commitment
              </strong>
              Your selected range is {selectedSize.label.replace(" people", " people")}. The minimum
              charge applies to {selectedSize.minimum} participants — even if fewer attend on the day.
            </div>
          ) : null}

          <TextareaField
            label="Anything else?"
            optional
            placeholder="e.g. specific focus areas, preferred language, city…"
            value={form.notes ?? ""}
            onChange={(value) => set("notes", value)}
            error={errors.notes}
          />

          {rules ? (
            <CheckboxField
              checked={form.spocConfirmed}
              onChange={(checked) => set("spocConfirmed", checked)}
              error={errors.spocConfirmed}
            >
              {rules.declaration}
            </CheckboxField>
          ) : null}

          {submitError ? (
            <FormError>
              <p>{submitError.message}</p>
              {mailtoHref && sessionEmail ? (
                <>
                  <p className="mt-1.5">{SUBMIT_FAILURE.offer(sessionEmail)}</p>
                  <p className="mt-1.5">{SUBMIT_FAILURE.reassurance}</p>
                  {/*
                    An anchor rather than <Button>: `mailto:` must stay a real link so the
                    browser hands it to the mail client, and so right-click → copy address
                    still rescues anyone with no mail client registered. The address is in
                    the sentence above for the same reason — a button label carrying it
                    wraps to two lines on a 320px screen.

                    Mirrors `.btn-nav-ghost`'s outlined treatment at this modal's radius:
                    the secondary way out, never a second filled button competing with the
                    gold submit.
                  */}
                  <a
                    href={mailtoHref}
                    // `w-full sm:w-auto` + `whitespace-nowrap`: at 320px the alert is
                    // only ~191px of content width, and shrink-to-fit wrapped the label
                    // across two lines inside its own border. Full-width on phones is
                    // both the larger tap target and the layout that cannot wrap.
                    className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-md border-[1.5px] border-border-strong bg-surface px-[18px] py-2.5 text-md font-medium text-ink transition-colors hover:border-gold hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-auto"
                  >
                    {SUBMIT_FAILURE.action}
                  </a>
                </>
              ) : null}
            </FormError>
          ) : null}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="min-h-11 w-full rounded-md bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Sending…" : "Send Request"}
          </button>
          <p className="mt-2 text-center text-sm text-ink-faint">
            No spam. We&apos;ll only reach out when sessions open in your city.
          </p>
        </form>
      )}
    </Modal>
  );
}
