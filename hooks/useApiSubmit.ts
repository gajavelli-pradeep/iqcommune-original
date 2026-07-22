"use client";

import { useSubmit } from "./useSubmit";

/**
 * The tokenised link-form submit path. Now a thin wrapper over `useSubmit`
 * (audit M5): the JSON and multipart paths share one implementation, and this
 * keeps the `{ submit, busy, error }` contract its four call sites already use
 * (`/rate`, `/consent`, `/onboarding`, `/join-admin`).
 */
export function useApiSubmit(token: string) {
  return useSubmit(token);
}
