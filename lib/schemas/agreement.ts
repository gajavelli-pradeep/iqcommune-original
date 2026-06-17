import { z } from "zod";

export const AgreementSignSchema = z.object({
  ref: z.string().min(1),
  fullName: z.string().min(2, "Enter your full legal name"),
  designation: z.string().min(1, "Enter your designation"),
  sigMode: z.enum(["drawn", "typed"]),
  sigData: z.string().min(1, "Signature is required"),
});

export type AgreementSign = z.infer<typeof AgreementSignSchema>;
