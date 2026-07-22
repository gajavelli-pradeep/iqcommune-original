"use client";

import { useEffect, useRef } from "react";

/**
 * Moves keyboard focus to an element the moment `active` becomes true (audit
 * A11Y-1). The tokenised forms replace themselves with a success panel on
 * submit; without this the focused button unmounts, focus falls to <body>, and
 * a screen-reader user gets no confirmation that a legally-binding consent or
 * signature was recorded. Point the returned ref at the success heading
 * (`tabIndex={-1}`) and pair it with `role="status"` on the panel.
 *
 * The effect runs after commit, so by the time `active` is true the target
 * element is already in the DOM and the ref is set.
 */
export function useFocusWhen<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}
