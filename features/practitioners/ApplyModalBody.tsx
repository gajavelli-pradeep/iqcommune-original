"use client";

import { useState } from "react";

import { CheckboxField, SelectField, TextField, TextareaField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
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
  state: "",
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

export function ApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<ApplicationInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("editing");
  const [submitError, setSubmitError] = useState<string>();

  const set = <K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

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
          <p className="text-lg text-ink-muted">
            Thanks for applying — we&apos;ll reach out within 2–3 working days for a quick,
            informal chat.
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
            hint="Use your personal email — not your work email. We keep this strictly confidential."
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

          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              label="City you're based in"
              placeholder="Mumbai"
              hint="Sessions are in-person — city and state help us match you to local requests."
              value={form.city}
              onChange={(value) => set("city", value)}
              error={errors.city}
            />
            <TextField
              label="State"
              placeholder="Maharashtra"
              value={form.state}
              onChange={(value) => set("state", value)}
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
