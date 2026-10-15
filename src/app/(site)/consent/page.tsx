import type { Metadata } from "next";
import { LegalPage } from "@/components/common/legal-page";
import { consent } from "@/content/legal";

export const metadata: Metadata = { title: consent.title };

export default function Page() {
  return <LegalPage doc={consent} />;
}
