"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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
 * The empanelment application.
 *
 * Same shape as P1's `RequestModal` — shared `Modal` and `Field` primitives, one
 * Zod schema used here and by the route that will receive it. The route is not
 * built yet: submission is validated and the receipt shown, and the POST lands
 * with F2/F3 wiring. The button is not inert, and nothing here fakes a success
 * the server never confirmed — see the note on `submit`.
 */

interface ApplyDialog {
  openApply: () => void;
}

const Context = createContext<ApplyDialog | undefined>(undefined);

function useApplyDialog(): ApplyDialog {
  const context = useContext(Context);
  if (!context) throw new Error("ApplyButton must be rendered inside <ApplyProvider>");
  return context;
}

const EMPTY: ApplicationInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  experience: EXPERIENCE_BANDS[0],
  city: "",
  state: "",
  address: "",
  tshirtSize: TSHIRT_SIZES[2],
  modules: [],
  frequency: TEACHING_FREQUENCIES[0],
  motivation: "",
  // Deliberately false: a pre-ticked consent box is not consent. The schema
  // types these as `true`, so the cast is where that intent is recorded.
  consentDisclosure: false as true,
  consentNoCrossSell: false as true,
  consentEmployer: false as true,
};

const asOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

export function ApplyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openApply: () => setOpen(true) }), []);

  return (
    <Context.Provider value={value}>
      {children}
      <ApplyModal open={open} onClose={() => setOpen(false)} />
    </Context.Provider>
  );
}

export function ApplyButton({ label = "Apply to Join the Network" }: { label?: string }) {
  const { openApply } = useApplyDialog();
  return (
    <button
      type="button"
      onClick={openApply}
      className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full bg-gold px-9 py-4 text-xl font-semibold text-ink shadow-gold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:hover:translate-y-0"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
        focusable="false"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      {label}
    </button>
  );
}

export function ApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<ApplicationInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const set = <K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function close() {
    onClose();
    setTimeout(() => {
      setForm(EMPTY);
      setErrors({});
      setSent(false);
    }, 200);
  }

  function submit() {
    const parsed = applicationSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSent(true);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={sent ? "Application received!" : "About you"}
      description={
        sent
          ? undefined
          : "No formal interview, no audition. Just tell us who you are and what you'd teach."
      }
    >
      {sent ? (
        <p className="py-6 text-center text-lg text-ink-muted">
          Thanks for applying — we&apos;ll reach out within 2–3 working days for a quick,
          informal chat.
        </p>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
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

          <button
            type="submit"
            className="min-h-11 w-full rounded-full bg-gold px-5 py-3 text-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Submit Application
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
