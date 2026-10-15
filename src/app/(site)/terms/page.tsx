import type { Metadata } from "next";
import { LegalPage } from "@/components/common/legal-page";
import { terms } from "@/content/legal";

export const metadata: Metadata = { title: terms.title };

export default function Page() {
  return <LegalPage doc={terms} />;
}
