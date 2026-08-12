import { BRAND_TAGLINE_CASING, type PendingUnit } from "./pending";

/** P7 declarations. */
export const JOIN_ADMIN_PENDING: PendingUnit[] = [
  BRAND_TAGLINE_CASING,
  {
    unit: "State · activation receipt",
    reason:
      "Renders only after a password is accepted, which this gate cannot do. Proven to render " +
      "by features/join-admin/AccountSetupForm.test.tsx.",
    kind: "state",
    matches: (text) =>
      ["Account activated", "Your account is ready", "Passwords don't match"].some((needle) =>
        text.includes(needle),
      ),
  },
  {
    unit: "State · document title",
    reason: "Set through Next's metadata export, outside the component tree this gate renders.",
    kind: "state",
    lines: [1, 8],
  },
];
