"use client";

import { useState } from "react";

import { SESSION_SHOTS as SHOTS } from "@/constants/photo-shots";

/**
 * The eight angles, each tickable.
 *
 * Ticking is a memory aid for the practitioner, not data we collect — the
 * server has the photos, and it can see what was actually shot. So the state
 * lives here and is never submitted, which is also why nothing about it is
 * required to send the form.
 *
 * The list lives in `constants/photo-shots` because the photo-guide email needs
 * the same shot ideas ahead of the session (audit G4b).
 */

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
              <label
                className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border-[1.5px] px-3 py-2.5 transition-colors ${
                  ticked
                    ? "border-green-light bg-green-light"
                    : "border-border bg-surface-soft"
                }`}
              >
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
                  className="mt-[3px] h-4 w-4 shrink-0 accent-green"
                />
                <span>
                  <span
                    className={`block text-base leading-[1.35] ${ticked ? "font-medium text-green" : "text-ink"}`}
                  >
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
