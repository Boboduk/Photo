import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/reset-form";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.auth.resetTitle };
}

/** Сюда ведёт ссылка из письма восстановления (после /auth/confirm сессия уже создана). */
export default async function ResetPasswordPage() {
  const t = await getT();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="animate-rise">
        <h1 className="text-3xl font-semibold tracking-tight">{t.auth.confirmFailedTitle}</h1>
        <p className="mt-3 text-muted">{t.auth.errors.sessionExpired}</p>
        <Button asChild className="mt-8">
          <Link href="/forgot-password">{t.auth.sendLink}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <h1 className="text-3xl font-semibold tracking-tight">{t.auth.resetTitle}</h1>
      <p className="mt-2 text-muted">{t.auth.resetText}</p>
      <div className="mt-8">
        <ResetForm />
      </div>
    </div>
  );
}
