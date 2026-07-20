"use client";

import { cloneElement, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodV4Resolver } from "@/lib/zodV4Resolver";
import { SelectField } from "@/components/public/SelectField";
import {
  ApplicationSchema,
  type Application,
  MODULES,
  EXPERIENCE_OPTIONS,
  TEACH_FREQ_OPTIONS,
  TSHIRT_SIZES,
} from "@/lib/schemas/application";

export function ApplicationForm() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Application>({
    resolver: zodV4Resolver(ApplicationSchema),
    defaultValues: { modules: [], payToFamily: false },
  });

  const selectedModules = watch("modules") ?? [];
  const payToFamily = watch("payToFamily");
  const consentOperational = watch("consentOperational");
  const consentNosell = watch("consentNosell");
  const consentEmployer = watch("consentEmployer");
  const allConsentsChecked = consentOperational && consentNosell && consentEmployer;

  function toggleModule(mod: string) {
    const current = selectedModules as string[];
    setValue(
      "modules",
      (current.includes(mod)
        ? current.filter((m) => m !== mod)
        : [...current, mod]) as Application["modules"],
      { shouldValidate: false }
    );
  }

  async function onSubmit(data: Application) {
    setServerError("");
    let res: Response;
    try {
      res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      setServerError("Network error. Please check your connection and try again.");
      return;
    }
    if (res.ok) {
      setSuccess(true);
    } else {
      const body = await res.json().catch(() => ({}));
      setServerError((body as { error?: string }).error ?? "Submission failed. Please try again.");
    }
  }

  // Gap 43: full success state copy from source
  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <div style={checkCircle}>
          <svg
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 8, color: "#14161d" }}>
          Application received!
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "#383b47",
            lineHeight: 1.65,
          }}
        >
          Thanks for applying — we&apos;ll reach out within 2–3 working days for a quick, informal chat.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── About you ── */}
      {/* Gap 17: form-section-label as span with gold uppercase style; first child has marginTop 0 */}
      <span style={{ ...sectionLabelStyle, marginTop: 0 }}>About you</span>

      <div style={sectionStyle}>
        {/* Gap 53 & 54: placeholders Vikram / Kulkarni */}
        <div style={rowTwo}>
          <Field label="First name" error={errors.firstName?.message}>
            <input {...register("firstName")} style={inputStyle} placeholder="Vikram" />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <input {...register("lastName")} style={inputStyle} placeholder="Kulkarni" />
          </Field>
        </div>

        {/* Gap 18: email full-width, phone full-width (not side-by-side) */}
        {/* Gap 55: email placeholder vikram@gmail.com */}
        <Field
          label="Personal email address"
          hint="Use your personal email — not your work email. We keep this strictly confidential."
          error={errors.email?.message}
        >
          <input {...register("email")} type="email" style={inputStyle} placeholder="vikram@gmail.com" />
        </Field>

        {/* Gap 56: label 'Phone number' */}
        <Field label="Phone number" error={errors.phone?.message}>
          <input {...register("phone")} type="tel" inputMode="tel" style={inputStyle} placeholder="+91 98765 43210" />
        </Field>

        {/* Gap 20: label 'Current job title', placeholder 'Equity Analyst' */}
        {/* Gap 21: role + experience in one row, city full-width below */}
        <div style={rowTwo}>
          <Field label="Current job title" error={errors.role?.message}>
            <input {...register("role")} style={inputStyle} placeholder="Equity Analyst" />
          </Field>
          <Field label="Years of experience" error={errors.experience?.message}>
            <SelectField
              options={EXPERIENCE_OPTIONS}
              value={watch("experience") ?? ""}
              onChange={(v) => setValue("experience", v as Application["experience"], { shouldValidate: true })}
            />
          </Field>
        </div>

        {/* Organisation / practice name — the value the disclosure + consent copy
            promises to share with the session organiser. Optional: blank = independent. */}
        <Field
          label="Organisation / practice name"
          hint="Leave blank if you're independent — we'll describe you as an independent practitioner."
          error={errors.organisation?.message}
        >
          <input {...register("organisation")} style={inputStyle} placeholder="e.g. HDFC Securities" />
        </Field>

        {/* Gap 22: city + state side-by-side with hint */}
        <div style={rowTwo}>
          <Field
            label="City you're based in"
            hint="Sessions are in-person — city and state help us match you to local requests."
            error={errors.city?.message}
          >
            <input {...register("city")} style={inputStyle} placeholder="Mumbai" />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <input {...register("state")} style={inputStyle} placeholder="Maharashtra" />
          </Field>
        </div>

        {/* V5 order: communication address + T-shirt close out "About you" (logistics / merch) */}
        <Field
          label={<>Communication address <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(include PIN code)</span></>}
          hint="This is where we'll send your welcome kit and any session merchandise — PIN code is essential since we ship across India."
          error={errors.communicationAddress?.message}
        >
          <textarea
            {...register("communicationAddress")}
            rows={2}
            style={{ ...inputStyle, resize: "none" }}
            placeholder="Flat / building, street, area, city, state — PIN code"
          />
        </Field>
        <Field label="T-shirt size" error={errors.tshirtSize?.message}>
          <SelectField
            options={TSHIRT_SIZES}
            value={watch("tshirtSize") ?? ""}
            onChange={(v) => setValue("tshirtSize", v as Application["tshirtSize"], { shouldValidate: true })}
          />
        </Field>
      </div>

      {/* ── Your teaching preference ── */}
      {/* Gap 17: span label style */}
      <span style={sectionLabelStyle}>Your teaching preference</span>

      <div style={sectionStyle}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#14161d", display: "block", marginBottom: 5 }}>
            Which module would you like to teach?{" "}
            <span style={{ fontWeight: 400, color: "#71717f" }}>(select all that apply)</span>
          </label>
          <div
            role="group"
            aria-label="Select modules you can teach"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 4,
            }}
          >
            {MODULES.map((m) => {
              const active = (selectedModules as string[]).includes(m);
              return (
                <label
                  key={m}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 12px",
                    // Gap 46: active border gold #c9982a
                    border: active ? "1.5px solid #c9982a" : "1.5px solid rgba(15,17,23,0.18)",
                    borderRadius: 8,
                    background: active ? "#f5e9c8" : "#ffffff",
                    cursor: "pointer",
                    fontSize: 13,
                    // Gap 47: active color gold-dark #8a6510
                    color: active ? "#8a6510" : "#383b47",
                    fontWeight: active ? 500 : 400,
                    transition: "border-color 0.15s, background 0.15s",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleModule(m)}
                    style={{ accentColor: "#c9982a", width: 15, height: 15, flexShrink: 0 }}
                    aria-label={m}
                  />
                  <span>{m}</span>
                </label>
              );
            })}
          </div>
          {errors.modules && (
            <p style={errStyle} role="alert">{errors.modules.message}</p>
          )}
        </div>

        {/* Gap 24 & 25: frequency select in teaching preference section, label 'How often could you teach?', placeholder 'Select…' */}
        <Field label="How often could you teach?" error={errors.teachFreq?.message}>
          <SelectField
            options={TEACH_FREQ_OPTIONS}
            value={watch("teachFreq") ?? ""}
            onChange={(v) => setValue("teachFreq", v as Application["teachFreq"], { shouldValidate: true })}
          />
        </Field>
      </div>

      {/* ── One last thing ── */}
      {/* Gap 17: span label style */}
      <span style={sectionLabelStyle}>One last thing</span>

      <div style={sectionStyle}>
        {/* Gap 26: label, placeholder, rows=3, hint */}
        <Field
          label="In your own words — why do you want to do this?"
          hint="100–150 words is plenty. This is the most important field in this form."
          error={errors.why?.message}
        >
          <textarea
            {...register("why")}
            rows={3}
            style={{ ...inputStyle, resize: "none" }}
            placeholder="A few honest lines is all we need. No need to sell yourself — just tell us what draws you to this."
          />
        </Field>
      </div>

      {/* ── Disclosure consent ── (Gap 27: before Payment preferences) */}
      <span style={sectionLabelStyle}>Disclosure consent</span>

      <div style={sectionStyle}>
        {/* Gap 31: consent-box wrapper; Gap 28: exact text for consentOperational with highlighted style */}
        <div
          style={{
            background: "#f5e9c8",
            border: "1.5px solid #c9982a",
            borderRadius: 12,
            padding: "1.1rem 1.25rem",
            marginBottom: "0.85rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              fontSize: 13,
              color: "#383b47",
              lineHeight: 1.6,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              {...register("consentOperational")}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: "#c9982a", cursor: "pointer", flexShrink: 0 }}
            />
            <span>
              I understand that upon confirming availability for a session, a brief professional profile (first name, organisation or practice name, domain, and years of experience) will be shared with the confirmed session organiser. If I am independent, I will be described as an independent practitioner. My personal contact details will not be shared — all coordination goes through iqcommune.
            </span>
          </label>
          {errors.consentOperational && (
            <p style={errStyle} role="alert">{errors.consentOperational.message}</p>
          )}
        </div>

        {/* Gap 29: consent-box wrapper for nosell; exact text */}
        <div
          style={{
            background: "#f8f7f4",
            border: "1.5px solid rgba(15,17,23,0.18)",
            borderRadius: 12,
            padding: "1.1rem 1.25rem",
            marginBottom: "0.85rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              fontSize: 13,
              color: "#383b47",
              lineHeight: 1.6,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              {...register("consentNosell")}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: "#c9982a", cursor: "pointer", flexShrink: 0 }}
            />
            <span>
              I confirm that I will not promote, recommend, or cross-sell any financial product, fund, or service <strong>during sessions</strong>. I understand I may share my own contact details or business card with attendees — any interaction outside the session is purely between me and the individual concerned, and iqcommune has no role or liability in it.
            </span>
          </label>
          {errors.consentNosell && (
            <p style={errStyle} role="alert">{errors.consentNosell.message}</p>
          )}
        </div>

        {/* Gap 30: consent-box wrapper for employer; exact text */}
        <div
          style={{
            background: "#f8f7f4",
            border: "1.5px solid rgba(15,17,23,0.18)",
            borderRadius: 12,
            padding: "1.1rem 1.25rem",
            marginBottom: "0.85rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              fontSize: 13,
              color: "#383b47",
              lineHeight: 1.6,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              {...register("consentEmployer")}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: "#c9982a", cursor: "pointer", flexShrink: 0 }}
            />
            <span>
              I acknowledge that if I am employed, informing my employer about this engagement is my own responsibility. iqcommune does not require it and will not represent that it has been done. If I am self-employed or independent, this clause does not apply.
            </span>
          </label>
          {errors.consentEmployer && (
            <p style={errStyle} role="alert">{errors.consentEmployer.message}</p>
          )}
        </div>
      </div>

      {/* ── Payment preferences ── */}
      <span style={sectionLabelStyle}>Payment preferences</span>

      <div style={sectionStyle}>
        {/* PAN / GST — tax identity for payouts & invoicing (encrypted at rest) */}
        <Field
          label="PAN / GST (if applicable)"
          hint="Your PAN, or GST number if you're GST-registered. Kept strictly confidential."
          error={errors.panGst?.message}
        >
          <input {...register("panGst")} style={inputStyle} placeholder="ABCDE1234F" />
        </Field>

        {/* Gap 40: no introductory paragraph */}
        {/* Gap 32: 'Your UPI ID' with faint qualifier, placeholder 'yourname@upi', hint */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#14161d", display: "block", marginBottom: 5 }}>
            Your UPI ID{" "}
            <span style={{ fontWeight: 400, color: "#71717f" }}>(if receiving payment via UPI)</span>
          </label>
          <input
            {...register("upiId")}
            style={inputStyle}
            placeholder="yourname@upi"
          />
          <div style={{ fontSize: 11, color: "#71717f", marginTop: 4 }}>
            Used only for revenue share payouts. Kept strictly confidential.
          </div>
          {errors.upiId && (
            <p style={errStyle} role="alert">{errors.upiId.message}</p>
          )}
        </div>

        {/* Gap 51: OR divider, fontSize 11, letterSpacing 0.06em */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.5rem 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(15,17,23,0.10)" }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: "#71717f", letterSpacing: "0.06em" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(15,17,23,0.10)" }} />
        </div>

        {/* Gap 50: 'Bank account details' label above bank fields */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#71717f", marginBottom: "0.6rem" }}>
          Bank account details
        </div>

        {/* Gap 33 & 34: 'Name as per bank account' full-width, then Row([Account number, IFSC]) */}
        <Field label="Name as per bank account" error={errors.bankAccountName?.message}>
          <input {...register("bankAccountName")} style={inputStyle} placeholder="Vikram Kulkarni" />
        </Field>
        {/* Gap 34 & 35: account + IFSC side-by-side; placeholder XXXXXXXXXXXXXX */}
        <div style={rowTwo}>
          <Field label="Account number">
            <input {...register("bankAccount")} style={inputStyle} placeholder="XXXXXXXXXXXXXX" />
          </Field>
          <Field label="IFSC code" error={errors.ifsc?.message}>
            <input {...register("ifsc")} style={inputStyle} placeholder="HDFC0001234" />
          </Field>
        </div>

        {/* Gap 36: payToFamily toggle wrapped in consent-box, correct label text */}
        <div
          style={{
            background: "#f8f7f4",
            border: "1.5px solid rgba(15,17,23,0.18)",
            borderRadius: 12,
            padding: "1.1rem 1.25rem",
            marginTop: "0.25rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#383b47",
              marginBottom: payToFamily ? "0.5rem" : 0,
            }}
          >
            <input
              type="checkbox"
              {...register("payToFamily")}
              style={{ accentColor: "#c9982a", width: 15, height: 15, cursor: "pointer" }}
            />
            I would like payment credited to a different account instead
          </label>

          {payToFamily && (
            <div style={{ marginTop: "0.85rem" }}>
              {/* V6: 'UPI ID (if paying via UPI)' — payee name/relationship removed */}
              <div style={{ marginTop: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#14161d", display: "block", marginBottom: 5 }}>
                  UPI ID{" "}
                  <span style={{ fontWeight: 400, color: "#71717f" }}>(if paying via UPI)</span>
                </label>
                <input
                  {...register("familyUpi")}
                  style={inputStyle}
                  placeholder="name@upi"
                />
                {errors.familyUpi && (
                  <p style={errStyle} role="alert">{errors.familyUpi.message}</p>
                )}
              </div>

              {/* Gap 51: family OR divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.5rem 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(15,17,23,0.10)" }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: "#71717f", letterSpacing: "0.06em" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "rgba(15,17,23,0.10)" }} />
              </div>

              {/* Gap 50: Bank account details label inside family section */}
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#71717f", marginBottom: "0.6rem" }}>
                Bank account details
              </div>

              {/* Gap 38: 'Name as per bank account', placeholder 'Anita Kulkarni' */}
              <Field label="Name as per bank account">
                <input {...register("familyAccountName")} style={inputStyle} placeholder="Anita Kulkarni" />
              </Field>
              {/* Gap 38: account + IFSC row, placeholder XXXXXXXXXXXXXX */}
              <div style={rowTwo}>
                <Field label="Account number">
                  <input {...register("familyBankAccount")} style={inputStyle} placeholder="XXXXXXXXXXXXXX" />
                </Field>
                <Field label="IFSC code">
                  <input {...register("familyIfsc")} style={inputStyle} placeholder="HDFC0001234" />
                </Field>
              </div>

              {/* Gap 39: gold declaration box with heading, paragraph, checkbox */}
              <div
                style={{
                  marginTop: "0.5rem",
                  background: "#f5e9c8",
                  border: "1px solid var(--gold-border)",
                  borderRadius: 12,
                  padding: "1.1rem 1.25rem",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#8a6510",
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  Important — please read before proceeding
                </div>
                <p style={{ fontSize: 12.5, color: "#8a6510", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                  Payment shall be made against the details provided in the invoice only.
                </p>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 13,
                    color: "#383b47",
                    lineHeight: 1.6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    id="consentBilling"
                    {...register("consentBilling")}
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: "#c9982a", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span>
                    I declare that I authorise iqcommune to credit my revenue share to the account specified above. I understand that I am responsible for raising the invoice and for any tax obligations arising from this income.
                  </span>
                </label>
                {errors.consentBilling && (
                  <p style={errStyle} role="alert">{errors.consentBilling.message}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          style={{
            background: "#fdf0f0",
            border: "1px solid var(--red-border)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#a32d2d",
            marginBottom: 16,
          }}
        >
          {serverError}
        </div>
      )}

      {/* Gap 41: SVG arrow instead of text arrow */}
      <button
        type="submit"
        className="btn-cta"
        disabled={isSubmitting || !allConsentsChecked}
        style={submitStyle(isSubmitting, !allConsentsChecked)}
      >
        {isSubmitting ? (
          "Submitting…"
        ) : (
          <>
            Submit Application
            <svg className="btn-arrow" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      {/* Gap 42: fine print below submit */}
      <p style={{ fontSize: 12, color: "#71717f", textAlign: "center", marginTop: "0.75rem" }}>
        All three consent boxes above must be checked before submitting. Your details are never shared with third parties.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  error?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          fontSize: 13,
          fontWeight: 500,
          display: "block",
          marginBottom: hint ? 3 : 5,
          color: "#14161d",
        }}
      >
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": error ? errorId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <div style={{ fontSize: 11, color: "#71717f", marginTop: 4 }}>
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} style={errStyle} role="alert">{error}</p>
      )}
    </div>
  );
}

// Gap 17: form-section-label style — uppercase gold with border-bottom
const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8a6510",
  display: "block",
  marginTop: "1.5rem",
  marginBottom: "1rem",
  paddingBottom: "0.5rem",
  borderBottom: "1px solid rgba(15,17,23,0.12)",
};

const sectionStyle: React.CSSProperties = { display: "grid", gap: 14 };
// auto-fit collapses to single column on narrow mobile viewports
const rowTwo: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 };
// Gap 48: input padding 11px 14px
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid",
  borderColor: "rgba(15,17,23,0.13) rgba(15,17,23,0.13) rgba(15,17,23,0.22)",
  borderRadius: 9,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fcfbf8",
  color: "#14161d",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color .16s ease, box-shadow .16s ease, background .16s ease",
};
const errStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "#a32d2d", marginTop: 5 };
const checkCircle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "#eef7ee",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 1.25rem",
  color: "#2a6b2a",
};

function submitStyle(loading: boolean, disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: "1.5rem",
    padding: "15px",
    background: loading || disabled ? "#2a2d38" : "var(--ink)",
    color: "#fff",
    border: "none",
    borderRadius: 100,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.01em",
    boxShadow: "none",
    cursor: loading || disabled ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : disabled ? 0.45 : 1,
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
}
