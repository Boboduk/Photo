import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <AppShell>
      <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="font-serif text-7xl text-brand italic">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.pages.notFoundTitle}</h1>
        <p className="mt-3 max-w-md text-muted">{t.pages.notFoundText}</p>
        <Button asChild className="mt-8">
          <Link href="/">{t.pages.toHome}</Link>
        </Button>
      </div>
    </AppShell>
  );
}
