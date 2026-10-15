import type { Metadata } from "next";
import { LegalPage } from "@/components/common/legal-page";
import { privacy } from "@/content/legal";

export const metadata: Metadata = { title: privacy.title };

export default function Page() {
  return <LegalPage doc={privacy} />;
}
