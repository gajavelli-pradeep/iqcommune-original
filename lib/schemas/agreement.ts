import { z } from "zod";

// linkParams must match the OnboardingParams fields signed by lib/hmac.ts
const LinkParamsSchema = z.object({
  name:   z.string().max(256),
  role:   z.string().max(256),
  org:    z.string().max(256),
  module: z.string().max(256),
  city:   z.string().max(128),
  state:  z.string().max(128),
  ref:    z.string().regex(/^[A-Za-z0-9]{1,32}$/, "Invalid ref format"),
  email:  z.string().email(),
});

export const AgreementSignSchema = z.object({
  ref: z.string().min(1),
  fullName: z.string().min(2, "Enter your full legal name"),
  designation: z.string().min(1, "Enter your designation"),
  sigMode: z.enum(["drawn", "typed"]),
  sigData: z.string().min(1, "Signature is required").max(600_000, "Signature data too large"),
  // HMAC verification — the original signed URL params are sent back
  // so the server can re-verify the signature before recording consent.
  linkSig: z.string().min(1),
  linkParams: LinkParamsSchema,
});

export type AgreementSign = z.infer<typeof AgreementSignSchema>;
