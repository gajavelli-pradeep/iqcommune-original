"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { checkboxClass, checkboxLabelClass, comboClass, controlClass, selectClass } from "./control";

/**
 * Form field primitives, shared by both P1 modals and by P2's application form.
 *
 * Every field here is label-associated by construction — the id is generated
 * and wired for you, so "input without a label" cannot happen by forgetting.
 * Errors are announced and tied to the control with `aria-describedby`, which a
 * red border alone never does.
 *
 * The control's APPEARANCE is not decided here. It comes from `control.ts`,
 * which the console's in-table editors read too — so a change to the field
 * style reaches both, and neither can drift from the other. This file owns the
 * label, the hint, the error and the wiring between them.
 */

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
      {/* 13px: every V7 file sets `.form-group label` to 13px/500. The hint below
          stays 12px because the specs disagree there (11px in onboarding, 12px
          elsewhere) and one shared field cannot be both. */}
      <label htmlFor={id} className="mb-1.5 block text-base font-medium text-ink">
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
          className={controlClass({ invalid: Boolean(props.error), className: isPassword ? "pr-11" : "" })}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((shown) => !shown)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="tap-44 absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
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
        className={controlClass({ invalid: Boolean(props.error), className: "resize-y" })}
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
        className={selectClass({ invalid: Boolean(props.error) })}
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

/**
 * A field that suggests, without restricting — an input backed by a `datalist`.
 *
 * For the answers that have a usual set and a long tail: city, state. A
 * `<select>` cannot serve either half of that. It cannot filter as you type,
 * and it cannot hold a value that is not one of its options, so offering a list
 * of cities through one would mean either an enormous scroll or turning away
 * anyone from a town the list forgot. The datalist filters on every keystroke
 * and accepts whatever is typed, which is why there is no "Other" option here:
 * free entry is what the control already does, not a branch bolted onto it.
 *
 * What that costs, recorded so it is not mistaken for an oversight: the
 * suggestion panel is drawn by the browser and cannot be styled the way the
 * `<select>` list can (see the `.form-select` block in globals.css). The field
 * itself is a normal input on `controlClass`, so it keeps the form's border,
 * hover, focus and error treatment — only the panel is the browser's. Search
 * was the requirement; this is its price.
 *
 * `autoComplete="off"` because the browser's own saved-value dropdown and the
 * datalist are two panels competing for one anchor, and the saved values win
 * and hide the list this field exists to show.
 */
export function ComboField({
  options,
  ...props
}: BaseProps & { options: readonly string[] }) {
  const id = useId();
  const listId = `${id}-options`;
  return (
    <Shell id={id} label={props.label} hint={props.hint} error={props.error} optional={props.optional}>
      <input
        id={id}
        list={listId}
        value={props.value}
        placeholder={props.placeholder}
        autoComplete="off"
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        // What CSS cannot see for itself: an input has no selector for "holds a
        // value". `:not(:placeholder-shown)` comes close and lies when a caller
        // omits the placeholder, so the answer comes from the value instead.
        data-filled={props.value ? "" : undefined}
        onChange={(event) => props.onChange(event.target.value)}
        className={comboClass({ invalid: Boolean(props.error) })}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </Shell>
  );
}

/**
 * A pick-only field with the search a long list needs — City's answer to a
 * real conflict (client, 2026-08-19): the client wanted both "only the 80
 * listed cities" and "easy to search among 80", and no native control gives
 * both at once. A `<select>` cannot live-filter as you type; a
 * `ComboField`'s datalist can, but the panel it opens is drawn by the browser
 * and cannot be styled at all — confirmed against the running app, not assumed.
 *
 * So this is the hand-built combobox `ComboField`'s own comment warns costs
 * more than a datalist: keyboard navigation, the open/closed state, and the
 * ARIA a datalist gives for free are all owed here instead. Built once City
 * needed the two guarantees together, not as a first reach.
 *
 * The restriction lives in `onBlur`, not in what can be typed: leaving the
 * field on text that matches no option clears it, exactly like a `<select>`
 * that was never offered that option in the first place. A row is committed
 * on click (`onMouseDown`, ahead of the blur it would otherwise race) or on
 * Enter against the highlighted row.
 *
 * The list is portalled to `document.body`, positioned from the input's own
 * measured rect, rather than sitting `absolute` inside this field (client,
 * 2026-08-19): every form this renders in lives inside `Modal`, whose panel
 * is `overflow-hidden` around a scrollable body — the exact shape that clips
 * an absolutely positioned child the moment it would extend past either
 * boundary. `Modal` itself escapes that the same way, with its own portal.
 */
export function SearchSelectField({
  options,
  ...props
}: BaseProps & { options: readonly string[] }) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  // Only the live search draft — the field's own value is the source of
  // truth otherwise, so the input displays `query` while open and `value`
  // once closed (below) rather than syncing the two through an effect.
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const displayed = open ? query : props.value;

  // Tracks the input's on-screen position while the list is open — the
  // modal body it lives in scrolls independently of the page, so this is not
  // a one-time measurement. `true` on the listener registers it for every
  // scrolling ancestor, not only `window`.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const box = inputRef.current?.getBoundingClientRect();
      if (box) setRect({ top: box.bottom + 4, left: box.left, width: box.width });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  function commit(value: string) {
    props.onChange(value);
    // Kept in step with the committed value (client, 2026-08-19): `onBlur`
    // firing after a click-commit — a real cross-browser inconsistency even
    // with the `preventDefault()` guard below — re-checked a `query` this
    // never updated, saw it match nothing, and wiped the selection that had
    // just been made. Now that blur re-check lands on the same value that was
    // just committed and is a harmless no-op instead.
    setQuery(value);
    setOpen(false);
  }

  return (
    <Shell id={id} label={props.label} hint={props.hint} error={props.error} optional={props.optional}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          value={displayed}
          placeholder={props.placeholder}
          autoComplete="off"
          aria-invalid={props.error ? true : undefined}
          aria-describedby={props.error ? `${id}-error` : undefined}
          data-filled={props.value ? "" : undefined}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            setActiveIndex(0);
            // Committed the instant it exactly matches, not only on blur or a
            // click — typing the whole name is itself an answer, and this is
            // what lets a value set programmatically (a form reset, a test)
            // reach the field without also simulating a blur.
            if (options.includes(next)) props.onChange(next);
          }}
          onFocus={() => {
            setQuery(props.value);
            setOpen(true);
          }}
          onBlur={() => {
            // A row's own `onMouseDown` commits before this fires (see below),
            // so reaching here means the typed text was never clicked. An
            // exact match still counts as an answer — someone who typed the
            // whole name correctly should not have to click it too — anything
            // else is not a real one, exactly as a `<select>` could never
            // have offered it.
            commit(options.includes(query) ? query : "");
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open && filtered[activeIndex]) {
              event.preventDefault();
              commit(filtered[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className={comboClass({ invalid: Boolean(props.error) })}
        />
        {open && filtered.length > 0 && rect
          ? createPortal(
              <ul
                id={listboxId}
                role="listbox"
                style={{ top: rect.top, left: rect.left, width: rect.width }}
                // Fixed, not absolute — positioned against the viewport from
                // the measured rect above, since the portal has escaped any
                // ancestor that `left`/`top` could otherwise resolve against.
                // `--z-toast` (400), not `--z-overlay` (300): this field lives
                // inside the modal, which already claims `--z-overlay` for
                // itself, and the list has to paint above that, not tie with
                // it. Capped the same way the native picker is (globals.css):
                // a long city name must wrap inside the panel, never widen it
                // past the viewport.
                className="fixed z-[var(--z-toast)] max-h-60 max-w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-border-strong bg-surface p-1 shadow-card-soft"
              >
                {filtered.map((option, index) => (
                  <li
                    key={option}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={option === props.value}
                    // `onMouseDown`, not `onClick`: it fires before the input's
                    // own `onBlur`, so the click commits the row instead of
                    // racing the blur handler that would otherwise clear the
                    // field first.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      commit(option);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`cursor-pointer rounded-md px-2.5 py-2 text-md ${
                      index === activeIndex ? "bg-gold-light text-gold-dark" : "text-ink"
                    }`}
                  >
                    {option}
                  </li>
                ))}
              </ul>,
              document.body,
            )
          : null}
      </div>
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
        className={`rounded-lg border-[1.5px] bg-surface-soft px-4 py-[0.9rem] ${
          error ? "border-red" : "border-border-strong"
        }`}
      >
        {/* The label IS the tap target — the 15px box alone never could be, and
            that is why checkbox is exempt from the global 44px floor. A single
            short line of consent text draws only 38px, so the floor is set here
            where the target actually lives. */}
        <label htmlFor={id} className={checkboxLabelClass}>
          <input
            id={id}
            type="checkbox"
            checked={checked}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onChange(event.target.checked)}
            className={`mt-[3px] ${checkboxClass}`}
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
