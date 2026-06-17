"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  ApplicationSchema,
  type Application,
  MODULES,
  EXPERIENCE_OPTIONS,
  TEACH_FREQ_OPTIONS,
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
    resolver: zodResolver(ApplicationSchema),
    defaultValues: { modules: [], payToFamily: false },
  });

  const selectedModules = watch("modules") ?? [];
  const payToFamily = watch("payToFamily");

  function toggleModule(mod: string) {
    const current = selectedModules;
    setValue(
      "modules",
      current.includes(mod as never)
        ? current.filter((m) => m !== mod)
        : [...current, mod as never],
      { shouldValidate: true }
    );
  }

  async function onSubmit(data: Application) {
    setServerError("");
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSuccess(true);
    } else {
      const body = await res.json();
      setServerError(body.error ?? "Submission failed. Please try again.");
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <div style={checkCircle}>
          <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Application received.</h3>
        <p style={{ fontSize: 14, color: "#4a4d5c", lineHeight: 1.65, maxWidth: 400, margin: "0 auto" }}>
          We&apos;ll go through your application and reach out within 2–3 working days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={sectionStyle}>
        <h3 style={sectionHead}>Personal details</h3>
        <div style={rowTwo}>
          <Field label="First name" error={errors.firstName?.message}>
            <input {...register("firstName")} style={inputStyle} placeholder="Priya" />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <input {...register("lastName")} style={inputStyle} placeholder="Sharma" />
          </Field>
        </div>
        <div style={rowTwo}>
          <Field label="Email" error={errors.email?.message}>
            <input {...register("email")} type="email" style={inputStyle} placeholder="priya@gmail.com" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <input {...register("phone")} style={inputStyle} placeholder="+91 98765 43210" />
          </Field>
        </div>
        <div style={rowTwo}>
          <Field label="Current role / title" error={errors.role?.message}>
            <input {...register("role")} style={inputStyle} placeholder="Certified Financial Planner" />
          </Field>
          <Field label="Organisation (optional)" error={undefined}>
            <input {...register("org")} style={inputStyle} placeholder="HDFC AMC (or leave blank)" />
          </Field>
        </div>
        <div style={rowTwo}>
          <Field label="City" error={errors.city?.message}>
            <input {...register("city")} style={inputStyle} placeholder="Mumbai" />
          </Field>
          <Field label="Years of experience" error={errors.experience?.message}>
            <select {...register("experience")} style={inputStyle}>
              <option value="">Select range</option>
              {EXPERIENCE_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionHead}>Modules you can teach</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {MODULES.map((m) => {
            const active = selectedModules.includes(m as never);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleModule(m)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 100,
                  border: active ? "1.5px solid #0f1117" : "1.5px solid rgba(15,17,23,.15)",
                  background: active ? "#0f1117" : "#fff",
                  color: active ? "#fff" : "#0f1117",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: active ? 500 : 400,
                  transition: "all .15s",
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
        {errors.modules && <p style={errStyle}>{errors.modules.message}</p>}
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionHead}>Availability</h3>
        <Field label="How often can you teach?" error={errors.teachFreq?.message}>
          <select {...register("teachFreq")} style={inputStyle}>
            <option value="">Select frequency</option>
            {TEACH_FREQ_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Why do you want to teach through iqcommune?" error={errors.why?.message}>
          <textarea
            {...register("why")}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Share what motivates you to give back and teach..."
          />
        </Field>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionHead}>Payment preferences (optional now)</h3>
        <p style={{ fontSize: 13, color: "#9496a1", marginBottom: 12 }}>
          You can fill these later. All payment info is stored securely and never shared publicly.
        </p>
        <div style={rowTwo}>
          <Field label="UPI ID" error={undefined}>
            <input {...register("upiId")} style={inputStyle} placeholder="priya@oksbi" />
          </Field>
          <Field label="IFSC code" error={errors.ifsc?.message}>
            <input {...register("ifsc")} style={inputStyle} placeholder="SBIN0001234" />
          </Field>
        </div>
        <div style={rowTwo}>
          <Field label="Bank name" error={undefined}>
            <input {...register("bankName")} style={inputStyle} placeholder="State Bank of India" />
          </Field>
          <Field label="Account number" error={undefined}>
            <input {...register("bankAccount")} style={inputStyle} placeholder="••••••••" />
          </Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
          <input type="checkbox" {...register("payToFamily")} />
          Pay session fees to a family member instead
        </label>
        {payToFamily && (
          <div style={{ marginTop: 12, padding: "1rem", background: "#f8f7f4", borderRadius: 8, display: "grid", gap: 12 }}>
            <div style={rowTwo}>
              <Field label="Family member name" error={undefined}>
                <input {...register("familyName")} style={inputStyle} placeholder="Full name" />
              </Field>
              <Field label="Relation" error={undefined}>
                <input {...register("familyRelation")} style={inputStyle} placeholder="Spouse / Parent" />
              </Field>
            </div>
            <Field label="Their UPI ID" error={undefined}>
              <input {...register("familyUpi")} style={inputStyle} placeholder="family@upi" />
            </Field>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionHead}>Consents</h3>
        {(
          [
            ["consentOperational", errors.consentOperational?.message, "I understand that iqcommune may disclose my professional identity (name, role, organisation) to the session client upon confirmation, with my consent."],
            ["consentNosell", errors.consentNosell?.message, "I confirm I will not cross-sell, solicit, or recommend any financial products during sessions facilitated through iqcommune."],
            ["consentEmployer", errors.consentEmployer?.message, "I confirm I have reviewed my employer’s conflict-of-interest policy and confirm this engagement does not violate it."],
          ] as const
        ).map(([field, errMsg, label]) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.6, cursor: "pointer", alignItems: "flex-start" }}>
              <input type="checkbox" {...register(field)} style={{ marginTop: 3, flexShrink: 0 }} />
              <span>{label}</span>
            </label>
            {errMsg && <p style={errStyle}>{errMsg}</p>}
          </div>
        ))}
      </div>

      {serverError && (
        <div role="alert" style={{ background: "#fdf0f0", border: "1px solid #f0b0b0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#a32d2d", marginBottom: 16 }}>
          {serverError}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} style={submitStyle(isSubmitting)}>
        {isSubmitting ? "Submitting…" : "Submit Application →"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5, color: "#0f1117" }}>{label}</label>
      {children}
      {error && <p style={errStyle}>{error}</p>}
    </div>
  );
}


const sectionStyle: React.CSSProperties = { marginBottom: 28, display: "grid", gap: 14 };
const sectionHead: React.CSSProperties = { fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#0f1117" };
const rowTwo: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid rgba(15,17,23,.18)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fff", boxSizing: "border-box" };
const errStyle: React.CSSProperties = { fontSize: 12, color: "#a32d2d", marginTop: 4 };
const checkCircle: React.CSSProperties = { width: 64, height: 64, borderRadius: "50%", background: "#eef7ee", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", color: "#2a6b2a" };

function submitStyle(loading: boolean): React.CSSProperties {
  return { width: "100%", padding: "13px", background: "#0f1117", color: "#fff", border: "none", borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, fontFamily: "inherit" };
}
