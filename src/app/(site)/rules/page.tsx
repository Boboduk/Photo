import type { Metadata } from "next";
import { LegalPage } from "@/components/common/legal-page";
import { rules } from "@/content/legal";

export const metadata: Metadata = { title: rules.title };

export default function Page() {
  return <LegalPage doc={rules} />;
}
