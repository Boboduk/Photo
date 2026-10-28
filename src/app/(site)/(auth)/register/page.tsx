import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { getT } from "@/i18n/server";
import { getProfileTypes } from "@/lib/queries/profile-types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.register };
}

export default async function RegisterPage() {
  const t = await getT();
  const profileTypes = await getProfileTypes();
  return (
    <div className="animate-rise">
      <h1 className="text-3xl font-semibold tracking-tight">{t.auth.registerTitle}</h1>
      <p className="mt-2 text-muted">{t.auth.registerSubtitle}</p>
      <div className="mt-8">
        <RegisterForm profileTypes={profileTypes.map((pt) => ({ slug: pt.slug, name: pt.name }))} />
      </div>
      <p className="mt-8 text-sm text-muted">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t.nav.login}
        </Link>
      </p>
    </div>
  );
}
