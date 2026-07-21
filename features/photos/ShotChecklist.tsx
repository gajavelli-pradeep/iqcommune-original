"use client";

import { useState } from "react";

/**
 * The eight angles, each tickable.
 *
 * Ticking is a memory aid for the practitioner, not data we collect — the
 * server has the photos, and it can see what was actually shot. So the state
 * lives here and is never submitted, which is also why nothing about it is
 * required to send the form.
 *
 * Deliberately NOT shared with P1's `PostSessionModal`: the landing page's list
 * is worded differently and the two are meant to read differently in their own
 * contexts. Merging them would silently rewrite one of the two specs.
 */

const SHOTS: ReadonlyArray<{ label: string; note: string }> = [
  { label: "Back of room — trainer in focus", note: "Full audience visible in background" },
  { label: "From trainer's position", note: "Audience facing the screen" },
  { label: "Front-left corner", note: "Wide view of the full room" },
  { label: "Front-right corner", note: "Trainer and session materials visible" },
  { label: "Candid — working through numbers", note: "Participant engaged with content" },
  { label: "Candid — Q&A or discussion moment", note: "Natural interaction" },
  { label: "Candid — notes or worksheet close-up", note: "In-session working material" },
  { label: "Group photo", note: "Trainer and all participants" },
];

export function ShotChecklist() {
  const [captured, setCaptured] = useState<readonly string[]>([]);

  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-caps text-ink-faint">
        Shot checklist — tick what you captured
      </legend>
      <ul className="grid gap-2 min-[560px]:grid-cols-2">
        {SHOTS.map((shot) => {
          const ticked = captured.includes(shot.label);
          return (
            <li key={shot.label}>
              <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border border-border bg-surface px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={ticked}
                  onChange={() =>
                    setCaptured((current) =>
                      ticked
                        ? current.filter((label) => label !== shot.label)
                        : [...current, shot.label],
                    )
                  }
                  className="mt-[3px] h-4 w-4 shrink-0 accent-gold"
                />
                <span>
                  <span className="block text-base font-medium leading-[1.35] text-ink">
                    {shot.label}
                  </span>
                  <span className="block text-sm leading-[1.4] text-ink-muted">{shot.note}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
