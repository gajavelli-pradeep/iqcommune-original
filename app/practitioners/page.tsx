import type { Metadata } from "next";

import { PractitionerSections } from "@/features/practitioners/PractitionerSections";

export const metadata: Metadata = {
  title: "Practitioner Network — iqcommune",
  description:
    "Teach what you practise. iqcommune connects working finance professionals with small, in-person groups who want to learn from someone still in the field.",
};

export default function PractitionersPage() {
  return <PractitionerSections />;
}
