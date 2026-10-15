import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function AuthErrorPage() {
  const t = await getT();
  return (
    <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t.auth.confirmFailedTitle}</h1>
      <p className="mt-3 max-w-md text-muted">{t.auth.confirmFailedText}</p>
      <div className="mt-8 flex gap-2">
        <Button asChild>
          <Link href="/login">{t.nav.login}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/forgot-password">{t.auth.forgotTitle}</Link>
        </Button>
      </div>
    </div>
  );
}
