"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Form field primitives, shared by both P1 modals and by P2's application form.
 *
 * Every field here is label-associated by construction — the id is generated
 * and wired for you, so "input without a label" cannot happen by forgetting.
 * Errors are announced and tied to the control with `aria-describedby`, which a
 * red border alone never does.
 */

const CONTROL =
  "w-full rounded-md border bg-surface px-3 py-2.5 text-base text-ink transition-colors placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60";

function borderFor(error?: string) {
  return error ? "border-red" : "border-border-strong";
}

function Shell({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-faint"> (optional)</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface BaseProps {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  placeholder?: string;
  /** Maps to the input's autocomplete token (audit M12, WCAG 1.3.5). */
  autoComplete?: string;
}

export function TextField({
  type = "text",
  ...props
}: BaseProps & { type?: "text" | "email" | "tel" | "date" | "password" }) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  // A password field toggles to a plain text input so its value can be read
  // back and checked before submitting.
  const inputType = isPassword && reveal ? "text" : type;
  return (
    <Shell id={id} label={props.label} hint={props.hint} error={props.error} optional={props.optional}>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={props.value}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          aria-invalid={props.error ? true : undefined}
          aria-describedby={props.error ? `${id}-error` : undefined}
          onChange={(event) => props.onChange(event.target.value)}
          className={`${CONTROL} ${isPassword ? "pr-11" : ""} ${borderFor(props.error)}`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((shown) => !shown)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden
              focusable="false"
            >
              {reveal ? (
                <>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.12 9.12 0 0 0 5.39-1.61M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        ) : null}
      </div>
    </Shell>
  );
}

export function TextareaField(props: BaseProps & { rows?: number }) {
  const id = useId();
  return (
    <Shell id={id} label={props.label} hint={props.hint} error={props.error} optional={props.optional}>
      <textarea
        id={id}
        rows={props.rows ?? 2}
        value={props.value}
        placeholder={props.placeholder}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        onChange={(event) => props.onChange(event.target.value)}
        className={`${CONTROL} resize-y ${borderFor(props.error)}`}
      />
    </Shell>
  );
}

export function SelectField({
  options,
  placeholder,
  ...props
}: Omit<BaseProps, "placeholder"> & {
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
}) {
  const id = useId();
  return (
    <Shell id={id} label={props.label} hint={props.hint} error={props.error} optional={props.optional}>
      <select
        id={id}
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        onChange={(event) => props.onChange(event.target.value)}
        className={`${CONTROL} ${borderFor(props.error)}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

/** The label wraps the control, so the whole block is the hit target. */
export function CheckboxField({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="mb-4">
      <div
        className={`rounded-lg border-[1.5px] bg-surface-soft px-4 py-[0.9rem] ${borderFor(error)}`}
      >
        <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm leading-[1.6] text-ink-muted">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onChange(event.target.checked)}
            className="mt-[3px] h-[15px] w-[15px] shrink-0 accent-gold"
          />
          <span>{children}</span>
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
