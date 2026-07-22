"use client";

import { useId, useRef, useState } from "react";

import { MAX_HITS, matchHits, type SearchHit } from "./search";

/**
 * The console header's global search (V7 `.nav-search`).
 *
 * Rendered twice — once in the header above 900px, once inside the mobile menu
 * where the header sheds it — from ONE component, because two copies of a
 * combobox is two keyboard implementations to keep in step.
 *
 * It is a real combobox, not a text field with a panel under it: the input owns
 * `role="combobox"`, the list owns `role="listbox"`, and the active option is
 * pointed at with `aria-activedescendant` rather than being focused. Focus
 * never leaves the input, which is what lets you keep typing to narrow a list
 * you are already arrowing through.
 */

export function ConsoleSearch({
  index,
  onSelect,
  inputId,
  className,
}: {
  index: readonly SearchHit[];
  /** Opens the hit: the shell switches tab and asks the panel to expand it. */
  onSelect: (entry: SearchHit) => void;
  /** Distinct per instance — the header and the menu both render one. */
  inputId: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  /** Lets a mousedown on a result run before the blur that would hide it. */
  const closing = useRef<number | null>(null);

  const { hits, overflow } = matchHits(index, query);
  const expanded = open && query.trim().length > 0;

  const choose = (entry: SearchHit) => {
    onSelect(entry);
    // Cleared rather than left showing the query: the result is now on screen
    // behind the dropdown, and a stale query in the box invites a second Enter
    // that would re-open what you are already looking at.
    setQuery("");
    setOpen(false);
    setActive(0);
    input.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      // First Escape dismisses the list, a second clears the query. Clearing
      // both at once loses a long query to a keypress meant to hide a list.
      if (expanded) setOpen(false);
      else setQuery("");
      return;
    }

    if (!hits.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); // Or the caret jumps to either end of the query.
      setOpen(true);
      setActive((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return (next + hits.length) % hits.length; // Wraps, both directions.
      });
      return;
    }

    if (event.key === "Enter" && expanded) {
      event.preventDefault();
      const entry = hits[active];
      if (entry) choose(entry);
    }
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="flex items-center gap-2 rounded-full border border-border-strong bg-surface-soft px-4 py-[7px]">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
          className="shrink-0 text-ink-faint"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={input}
          id={inputId}
          type="search"
          role="combobox"
          aria-label="Search across practitioners, sessions, requests"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && hits[active] ? `${listId}-${active}` : undefined}
          placeholder="Search across practitioners, sessions, requests…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Deferred: a click on a result fires blur first, and closing here
            // would unmount the option before its own handler ever ran.
            closing.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
        />
      </div>

      {expanded ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-border-strong bg-surface shadow-card">
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[320px] overflow-y-auto overscroll-y-contain">
            {hits.map((entry, position) => (
              <li key={`${entry.tab}-${entry.rowKey}`} role="none">
                <button
                  type="button"
                  id={`${listId}-${position}`}
                  role="option"
                  aria-selected={position === active}
                  onMouseEnter={() => setActive(position)}
                  onMouseDown={() => {
                    // mousedown, not click: click lands after blur.
                    if (closing.current) window.clearTimeout(closing.current);
                  }}
                  onClick={() => choose(entry)}
                  className={`block w-full border-b border-border px-4 py-2.5 text-left last:border-b-0 ${
                    position === active ? "bg-surface-soft" : ""
                  }`}
                >
                  <span className="block truncate text-base font-medium text-ink">{entry.title}</span>
                  <span className="block truncate text-2xs text-ink-faint">{entry.subtitle}</span>
                </button>
              </li>
            ))}

            {hits.length === 0 ? (
              <li role="none" className="px-4 py-3 text-xs text-ink-faint">
                Nothing matches “{query.trim()}”.
              </li>
            ) : null}
          </ul>

          {/* Never let a capped list look complete. */}
          {overflow > 0 ? (
            <p className="border-t border-border bg-surface-soft px-4 py-2 text-3xs text-ink-faint">
              Showing the first {MAX_HITS} of {MAX_HITS + overflow} matches — keep typing to narrow.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Announced without stealing focus, so a keyboard user knows the list
          changed under them rather than discovering it by arrowing into it. */}
      <p aria-live="polite" className="sr-only">
        {expanded ? `${hits.length + overflow} matches` : ""}
      </p>
    </div>
  );
}
