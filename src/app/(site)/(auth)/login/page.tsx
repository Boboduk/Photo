import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { getT } from "@/i18n/server";
import { firstParam, safeNextPath } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.login };
}

export default async function LoginPage(props: PageProps<"/login">) {
  const t = await getT();
  const searchParams = await props.searchParams;
  const next = safeNextPath(firstParam(searchParams.next));

  return (
    <div className="animate-rise">
      <h1 className="text-3xl font-semibold tracking-tight">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-muted">{t.auth.loginSubtitle}</p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <p className="mt-8 text-sm text-muted">
        {t.auth.noAccount}{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t.nav.register}
        </Link>
      </p>
    </div>
  );
}
