"use client";

import { useMemo, useRef, useState } from "react";

import { EmailTypoHint } from "@/components/ui/EmailTypoHint";
import { CheckboxField, SearchSelectField, SelectField, TextField, TextareaField } from "@/components/ui/Field";
import { CITIES, CITY_STATE, INDIAN_STATES, STATE_CITIES } from "@/constants/india";
import { focusFirstError } from "@/components/ui/focus-first-error";
import { FormError } from "@/components/ui/FormError";
import { Modal } from "@/components/ui/Modal";
import { suggestEmailDomain } from "@/lib/email/suggest-domain";
import { SUBMIT_FAILURE } from "@/content/submit-failure";
import {
  EXPERIENCE_BANDS,
  MODULES,
  TEACHING_FREQUENCIES,
  TSHIRT_SIZES,
  applicationSchema,
  type ApplicationInput,
} from "@/lib/schemas/application";

/**
 * The empanelment application body — the heavy half of the apply dialog, split
 * out (audit H8) so `ApplyProvider` can defer it with `next/dynamic`: it pulls
 * the zod barrel, which a provider shipping on first paint would otherwise put
 * in the /practitioners bundle.
 */

type Status = "editing" | "submitting" | "sent";

const EMPTY: ApplicationInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  // Deliberately not a real band/size/frequency: pre-selecting one reads as an
  // answer the applicant never gave. Same cast trick as the consent booleans
  // below — the schema's `z.enum` correctly rejects "" as unanswered.
  experience: "" as ApplicationInput["experience"],
  city: "",
  // Same cast trick as `experience` above: "" is not a real state, and the
  // schema's `z.enum` correctly rejects it as unanswered.
  state: "" as ApplicationInput["state"],
  address: "",
  tshirtSize: "" as ApplicationInput["tshirtSize"],
  modules: [],
  frequency: "" as ApplicationInput["frequency"],
  // Deliberately false: a pre-ticked consent box is not consent. The schema
  // types these as `true`, so the cast is where that intent is recorded.
  consentDisclosure: false as true,
  consentNoCrossSell: false as true,
  consentEmployer: false as true,
  motivation: "",
};

const asOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

/**
 * Windows' shell handler truncates a `mailto:` past roughly 2,048 characters,
 * and does it *silently* — the tail of the message simply never arrives, which
 * is the worst possible failure for a draft whose whole job is to lose nothing.
 *
 * Measured: with every field at its schema maximum the encoded href reaches
 * 2,819 characters, so clamping each field to one fixed length does not settle
 * it. The draft measures itself instead. `HREF_BUDGET` leaves room under the
 * ceiling for a longer recipient address than the one shipped today.
 */
const HREF_BUDGET = 1900;

/**
 * Tried in order; the first that fits wins, so a short application keeps
 * everything. The tight steps at the end exist for the pathological case —
 * every field at its schema maximum — where the client's prose leaves little
 * room. Real applications never reach them.
 */
const FIELD_LIMITS = [400, 200, 120, 60, 30, 20];

const clampTo = (limit: number) => (value: string) =>
  value.length > limit ? `${value.slice(0, limit)}…` : value;

/**
 * The fallback email, drafted from what the applicant already typed so the only
 * thing left to do in their mail client is press send.
 *
 * Re-asking for thirteen fields is how a recovery path ends up worse than the
 * failure it recovers from, so the whole form is carried over. This form is the
 * longer of the site's two, which is exactly why losing it hurts more.
 */
function composeBody(form: ApplicationInput, name: string, clamp: (value: string) => string) {
  const details: Array<[string, string | undefined]> = [
    // Clamped only because the schema allows 80 + 80 characters and the name is
    // printed three times — field, sign-off and subject. At any real length the
    // limits never bite; at the absurd one, a shortened name beats a truncated
    // message.
    ["Name", clamp(name)],
    ["Email", form.email],
    ["Phone", form.phone],
    // Every free-text field is clamped, not just the long ones: the client's
    // wording is prose-heavy, so at the schema maxima the unclamped fields alone
    // pushed the href back over the ceiling. The name is left whole — it is the
    // identity on the message, and it already appears in the subject.
    ["Current job title", form.jobTitle && clamp(form.jobTitle)],
    ["Years of experience", form.experience],
    ["City / State", clamp([form.city, form.state].filter(Boolean).join(", "))],
    ["Communication address", form.address && clamp(form.address)],
    ["T-shirt size", form.tshirtSize],
    // NOT clamped, deliberately. This is the answer the application exists to
    // collect, and it is a chosen list rather than prose: all six modules come
    // to 223 characters, so it is bounded and small. Clamping it at 60 left two
    // of six and silently dropped the rest — losing what someone can teach to
    // save room for what they wrote about themselves.
    ["Modules", form.modules.length ? form.modules.join(", ") : undefined],
    // First person: the applicant is writing this about themselves. The earlier
    // labels ("Could teach", "Why they want to teach") read as a case file.
    ["How often I could teach", form.frequency],
    ["Why I want to teach", form.motivation && clamp(form.motivation)],
  ];

  // CRLF: the line break mailto bodies are specified in, and the one every mail
  // client agrees on once percent-encoded.
  return [
    "Dear iqcommune,",
    "",
    "I tried submitting my application on your website but was redirected to this alternative mode (via email) due to a technical glitch at your end. Please find all the details as requested in the empanelment form.",
    "",
    ...details.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    "",
    // The form puts all three tick-boxes inside one fieldset legended
    // "Disclosure consent", so naming that section binds all three. Each is
    // `z.literal(true)`, so a draft only exists once every one is ticked — the
    // guard states that rather than assuming it.
    ...(form.consentDisclosure && form.consentNoCrossSell && form.consentEmployer
      ? [
          'I am fully aware that this email shall be deemed as my agreement with all the disclosures appearing under "Disclosure Consent" section of the empanelment form. I hereby confirm my consent towards the same.',
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
export function draftApplicationMailto(form: ApplicationInput, address: string): string {
  const name = `${form.firstName} ${form.lastName}`.trim();
  // Client format, MOM 2026-08-10. `filter(Boolean)` so a missing field cannot
  // leave a dangling separator in an admin's inbox.
  const subject = `${["New Practitioner Request", form.firstName, form.city]
    .filter(Boolean)
    .join(" - ")} (offline request)`;
  const build = (limit: number) =>
    `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      composeBody(form, name, clampTo(limit)),
    )}`;

  return (
    FIELD_LIMITS.map(build).find((href) => href.length <= HREF_BUDGET) ??
    build(FIELD_LIMITS[FIELD_LIMITS.length - 1])
  );
}

export function ApplyModal({
  open,
  onClose,
  /**
   * Where the mailto fallback points. Optional because the address behind it
   * (`BREVO_SENDER_PRACTITIONER`, falling back to `BREVO_SENDER_EMAIL`) is
   * FEATURE-tier — unset, the offer is simply not made, rather than rendering a
   * `mailto:undefined`.
   */
  practitionerEmail,
}: {
  open: boolean;
  onClose: () => void;
  practitionerEmail?: string;
}) {
  const [form, setForm] = useState<ApplicationInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<{ message: string; offerEmail: boolean }>();
  const formRef = useRef<HTMLFormElement>(null);

  const mailtoHref =
    submitError?.offerEmail && practitionerEmail
      ? draftApplicationMailto(form, practitionerEmail)
      : undefined;

  const set = <K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  /**
   * Narrows the State suggestion to the one a recognised City implies, rather
   * than setting the field for them (client, 2026-08-18) — the answer still has
   * to be theirs, this only saves the scroll through 36 options when the city
   * already said which one. A city outside the tier list (free-typed) has no
   * entry here, so State keeps offering all of them, same as before.
   */
  const stateOptions = useMemo(() => {
    const matched = CITY_STATE[form.city.trim()];
    return matched ? [matched] : INDIAN_STATES;
  }, [form.city]);

  /** The same narrowing, the other direction — State picked first narrows City. */
  const cityOptions = useMemo(() => {
    const matched = STATE_CITIES[form.state.trim()];
    return matched ?? CITIES;
  }, [form.state]);

  function close() {
    onClose();
    setTimeout(() => {
      setForm(EMPTY);
      setErrors({});
      setStatus("editing");
      setSubmitError(undefined);
    }, 200);
  }

  async function submit() {
    const parsed = applicationSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      focusFirstError(formRef.current);
      return;
    }

    setErrors({});
    setStatus("submitting");
    setSubmitError(undefined);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The Zod output, not the raw form: trimmed, with the email lowercased.
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();

      if (!response.ok) {
        if (body?.error?.fields) {
          setErrors(body.error.fields);
          focusFirstError(formRef.current);
        }
        // Only a server fault earns the escape hatch. A validation error is the
        // applicant's own to fix and emailing it would bypass the schema; a rate
        // limit exists precisely to not be routed around.
        const offerEmail = body?.error?.code === "INTERNAL";
        setSubmitError({
          // The client's copy replaces the API's message only where the offer
          // appears. Everywhere else the API's wording is the useful one — it
          // names the fields to fix, or says how long to wait.
          message: offerEmail
            ? SUBMIT_FAILURE.message
            : (body?.error?.message ?? "Something went wrong. Please try again."),
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
      title={status === "sent" ? "Application received!" : "About you"}
      description={
        status === "sent"
          ? undefined
          : "No formal interview, no audition. Just tell us who you are and what you'd teach."
      }
    >
      {status === "sent" ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-light text-green">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden
              focusable="false"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          {/* Client's 2026-08-14 confirmations delivery, which put this popup into
              the same register as the acknowledgment email it is followed by. */}
          <p className="text-lg text-ink-muted">
            Thank you for applying. We will reach out within 2–3 working days for a brief,
            informal discussion.
          </p>
        </div>
      ) : (
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              label="First name"
              placeholder="Vikram"
              value={form.firstName}
              onChange={(value) => set("firstName", value)}
              error={errors.firstName}
            />
            <TextField
              label="Last name"
              placeholder="Kulkarni"
              value={form.lastName}
              onChange={(value) => set("lastName", value)}
              error={errors.lastName}
            />
          </div>

          <TextField
            type="email"
            label="Personal email address"
            placeholder="vikram@gmail.com"
            hint={
              <>
                Use your personal email — not your work email. We keep this strictly confidential.
                <EmailTypoHint
                  suggestion={suggestEmailDomain(form.email)}
                  onAccept={(email) => set("email", email)}
                />
              </>
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
          <TextField
            label="Current job title"
            placeholder="Equity Analyst"
            value={form.jobTitle}
            onChange={(value) => set("jobTitle", value)}
            error={errors.jobTitle}
          />
          <SelectField
            label="Years of experience"
            placeholder="Select…"
            options={asOptions(EXPERIENCE_BANDS)}
            value={form.experience}
            onChange={(value) => set("experience", value as ApplicationInput["experience"])}
            error={errors.experience}
          />

          {/* City is pick-only AND searchable (client, 2026-08-19): 80 cities
              is too many for tap/scroll alone, but no native control gives
              both search and a styled list — a `<select>` cannot live-filter,
              and a `ComboField`'s datalist panel cannot be styled at all.
              `SearchSelectField` is the hand-built combobox that closes that
              gap; the restriction is still enforced by the schema, exactly
              as a rejected `<select>` value would be.
              State stays a plain `<select>` — 36 options is short enough that
              a dropdown alone is easy to scan. */}
          <div className="grid gap-x-4 sm:grid-cols-2">
            <SearchSelectField
              label="City you're based in"
              placeholder="Mumbai"
              hint="Sessions are in-person — city and state help us match you to local requests. Can't find your city? Select a nearest city within your state & we will take it from there."
              options={cityOptions}
              value={form.city}
              onChange={(value) => set("city", value)}
              error={errors.city}
            />
            <SelectField
              label="State"
              placeholder="Select your state"
              options={stateOptions.map((state) => ({ value: state, label: state }))}
              value={form.state}
              onChange={(value) => set("state", value as ApplicationInput["state"])}
              error={errors.state}
            />
          </div>

          <TextareaField
            label="Communication address (include PIN code)"
            hint="This is where we'll send your welcome kit and any session merchandise — PIN code is essential since we ship across India."
            placeholder="Flat / building, street, area, city, state — PIN code"
            value={form.address}
            onChange={(value) => set("address", value)}
            error={errors.address}
          />
          <SelectField
            label="T-shirt size"
            placeholder="Select…"
            options={asOptions(TSHIRT_SIZES)}
            value={form.tshirtSize}
            onChange={(value) => set("tshirtSize", value as ApplicationInput["tshirtSize"])}
            error={errors.tshirtSize}
          />

          <fieldset className="mb-4">
            <legend className="mb-1.5 text-sm font-medium text-ink">
              Your teaching preference
            </legend>
            <p className="mb-2 text-sm text-ink-muted">
              Which module would you like to teach?{" "}
              <span className="text-ink-faint">(select all that apply)</span>
            </p>
            <div className="grid gap-2">
              {MODULES.map((module) => {
                const checked = form.modules.includes(module);
                return (
                  <label
                    key={module}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-ink-muted"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        set(
                          "modules",
                          checked
                            ? form.modules.filter((value) => value !== module)
                            : [...form.modules, module],
                        )
                      }
                      className="h-[15px] w-[15px] shrink-0 accent-gold"
                    />
                    {module}
                  </label>
                );
              })}
            </div>
            {errors.modules ? (
              <p role="alert" className="mt-1 text-sm text-red">
                {errors.modules}
              </p>
            ) : null}
          </fieldset>

          <SelectField
            label="How often could you teach?"
            placeholder="Select…"
            options={asOptions(TEACHING_FREQUENCIES)}
            value={form.frequency}
            onChange={(value) => set("frequency", value as ApplicationInput["frequency"])}
            error={errors.frequency}
          />
          <TextareaField
            label="One last thing — In your own words - why do you want to do this?"
            rows={4}
            hint="100-150 words is plenty. This is the most important field in this form."
            placeholder="A few honest lines is all we need. No need to sell yourself — just tell us what draws you to this."
            value={form.motivation}
            onChange={(value) => set("motivation", value)}
            error={errors.motivation}
          />

          <fieldset className="mb-4">
            <legend className="mb-1.5 text-sm font-medium text-ink">Disclosure consent</legend>
            <CheckboxField
              checked={form.consentDisclosure}
              onChange={(checked) => set("consentDisclosure", checked as true)}
              error={errors.consentDisclosure}
            >
              I understand that upon confirming availability for a session, a brief professional
              profile (first name, organisation or practice name, domain, and years of experience)
              will be shared with the confirmed session organiser. If I am independent, I will be
              described as an independent practitioner. My personal contact details will not be
              shared — all coordination goes through iqcommune.
            </CheckboxField>
            <CheckboxField
              checked={form.consentNoCrossSell}
              onChange={(checked) => set("consentNoCrossSell", checked as true)}
              error={errors.consentNoCrossSell}
            >
              <strong className="font-medium text-ink">
                I confirm that I will not promote, recommend, or cross-sell any financial product,
                fund, or service
              </strong>
              . I understand I may share my own contact details or business card with attendees —
              any interaction outside the session is purely between me and the individual
              concerned, and iqcommune has no role or liability in it.
            </CheckboxField>
            <CheckboxField
              checked={form.consentEmployer}
              onChange={(checked) => set("consentEmployer", checked as true)}
              error={errors.consentEmployer}
            >
              I acknowledge that if I am employed, informing my employer about this engagement is
              my own responsibility. iqcommune does not require it and will not represent that it
              has been done. If I am self-employed or independent, this clause does not apply.
            </CheckboxField>
          </fieldset>

          {submitError ? (
            <FormError>
              <p>{submitError.message}</p>
              {mailtoHref && practitionerEmail ? (
                <>
                  <p className="mt-1.5">{SUBMIT_FAILURE.offer(practitionerEmail)}</p>
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
            className="min-h-11 w-full rounded-full bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Sending…" : "Submit Application"}
          </button>
          <p className="mt-2 text-center text-sm text-ink-faint">
            All three consent boxes above must be checked before submitting. Your details are never
            shared with third parties.
          </p>
        </form>
      )}
    </Modal>
  );
}
