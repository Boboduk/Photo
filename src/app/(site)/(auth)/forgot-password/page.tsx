import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forgot-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.auth.forgotTitle };
}

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
