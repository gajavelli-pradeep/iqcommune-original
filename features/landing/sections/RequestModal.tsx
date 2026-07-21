"use client";

import { useState } from "react";

import { CheckboxField, SelectField, TextField, TextareaField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  sessionRequestSubmission,
  type Audience,
  type SessionRequestInput,
} from "@/lib/schemas/session-request";

/**
 * "Request a Session" — the landing page's one write, and the reason F2 and F3
 * exist.
 *
 * The form is audience-driven: choosing who this is for changes the guidance,
 * whether an organisation name is asked for, whether venue details are
 * required, and the wording of the declaration. That branching is spec
 * behaviour, so it lives in data here rather than in the six `style.display`
 * mutations the spec used.
 */

const TOPICS = [
  "Foundations of Personal Finance",
  "Retirement & Goal-Based Financial Planning",
  "Equity Investing Simplified",
  "Debt & Fixed Income Investing",
  "Asset Allocation & Portfolio Construction",
  "Investment Solutions & Portfolio Strategies",
] as const;

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

const TOPIC_OPTIONS = [
  ...TOPICS.map((topic) => ({ value: topic, label: topic })),
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

export function RequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [audience, setAudience] = useState<Audience | undefined>();
  const [form, setForm] = useState<SessionRequestInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string>();

  const rules = audience ? AUDIENCE_RULES[audience] : undefined;
  const selectedSize = GROUP_SIZES.find((size) => size.value === form.groupSize);
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
        setSubmitError(body?.error?.message ?? "Something went wrong. Please try again.");
        setStatus("editing");
        return;
      }

      setStatus("sent");
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
      setStatus("editing");
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={status === "sent" ? "Request received!" : "Request a Session"}
      description={
        status === "sent"
          ? undefined
          : "Tell us a bit about what you need — we'll be in touch within 2–3 working days to take it forward."
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
          <p className="text-lg text-ink-muted">
            Thanks — your session request is in. We&apos;ll be in touch within 2–3 working days.
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
            <p
              role="alert"
              className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red"
            >
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="min-h-11 w-full rounded-md bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Sending…" : "Send Request"}
          </button>
          <p className="mt-2 text-center text-sm text-ink-faint">
            No spam. We&apos;ll only reach out about your session request.
          </p>
        </form>
      )}
    </Modal>
  );
}
