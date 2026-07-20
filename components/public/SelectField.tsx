"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Accessible custom dropdown (combobox + listbox) — replaces native <select> so the
 * option popup can be styled to match the ink/cream/gold design (native <option> lists
 * are not styleable cross-browser). Controlled: pass `value` + `onChange`.
 *
 * `options` accepts three interchangeable shapes, mixable in one array:
 *   - "Foo"                                   → a bare option (value === label)
 *   - { value, label }                        → an option whose label differs from its value
 *   - { label, options: [{value,label}, …] }  → a titled group (renders a non-selectable header)
 *
 * Accepts id / aria-describedby / aria-invalid (injected by the form's <Field> clone).
 */
export interface SelectOption {
  value: string;
  label: string;
}
export interface SelectOptionGroup {
  label: string;
  options: readonly SelectOption[];
}
export type SelectFieldItem = string | SelectOption | SelectOptionGroup;

type Row =
  | { kind: "header"; label: string; key: string }
  | { kind: "option"; option: SelectOption; index: number };

function isGroup(item: SelectFieldItem): item is SelectOptionGroup {
  return typeof item !== "string" && "options" in item;
}

export function SelectField({
  options,
  value,
  onChange,
  placeholder = "Select…",
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  options: readonly SelectFieldItem[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const genId = useId();
  const baseId = id ?? genId;
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // Flatten into (a) a linear option list that keyboard nav + selection index into,
  // and (b) an ordered render model that keeps group headers in place.
  const flat: SelectOption[] = [];
  const rows: Row[] = [];
  options.forEach((item, gi) => {
    if (typeof item === "string") {
      rows.push({ kind: "option", option: { value: item, label: item }, index: flat.length });
      flat.push({ value: item, label: item });
    } else if (isGroup(item)) {
      rows.push({ kind: "header", label: item.label, key: `g${gi}` });
      item.options.forEach((opt) => {
        rows.push({ kind: "option", option: opt, index: flat.length });
        flat.push(opt);
      });
    } else {
      rows.push({ kind: "option", option: item, index: flat.length });
      flat.push(item);
    }
  });

  const selectedIndex = flat.findIndex((o) => o.value === value);
  const current = selectedIndex >= 0 ? flat[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  useEffect(() => {
    if (open && active >= 0) {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-opt-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [active, open]);

  function openList() {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }
  function choose(i: number) {
    onChange(flat[i].value);
    setOpen(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        // Close only the dropdown — don't let a parent (e.g. the modal) also act on Escape.
        e.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(flat.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(flat.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (active >= 0) choose(active);
        break;
    }
  }

  const ring = focused || open;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: "100%",
          minHeight: 44,
          padding: "11px 14px",
          border: `1.5px solid ${invalid ? "var(--red-border)" : ring ? "var(--gold)" : "rgba(15,17,23,0.13)"}`,
          borderRadius: 9,
          fontSize: 14,
          fontFamily: "inherit",
          textAlign: "left",
          background: "var(--input-paper)",
          color: current ? "var(--ink)" : "var(--ink-faint)",
          cursor: "pointer",
          boxShadow: ring ? "0 0 0 3px rgba(201,152,42,0.16)" : "inset 0 1px 2px rgba(15,17,23,0.04)",
          outline: "none",
          transition: "border-color .16s ease, box-shadow .16s ease",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current ? current.label : placeholder}
        </span>
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .18s ease",
          }}
        >
          <path d="M1 1.5L6 6.5L11 1.5" stroke="var(--gold-dark)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            margin: 0,
            padding: 4,
            listStyle: "none",
            maxHeight: 264,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid rgba(15,17,23,0.12)",
            borderRadius: 10,
            boxShadow: "0 14px 36px -14px rgba(20,16,10,0.28), 0 2px 6px rgba(20,16,10,0.06)",
          }}
        >
          {rows.map((row) => {
            if (row.kind === "header") {
              return (
                <li
                  key={row.key}
                  role="presentation"
                  style={{
                    padding: "8px 12px 4px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ink-faint)",
                    userSelect: "none",
                  }}
                >
                  {row.label}
                </li>
              );
            }
            const isSelected = row.option.value === value;
            const isActive = row.index === active;
            return (
              <li
                key={row.option.value}
                id={optionId(row.index)}
                data-opt-index={row.index}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(row.index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(row.index);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  minHeight: 44,
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: 14,
                  lineHeight: 1.35,
                  cursor: "pointer",
                  color: isActive ? "var(--gold-dark)" : "var(--ink)",
                  background: isActive ? "var(--gold-light)" : isSelected ? "var(--input-hover)" : "transparent",
                  fontWeight: isSelected ? 500 : 400,
                }}
              >
                {row.option.label}
                {isSelected && (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, stroke: "var(--gold-dark)" }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
