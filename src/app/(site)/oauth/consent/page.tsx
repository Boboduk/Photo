import { CheckIcon, KeyRoundIcon, ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentActions } from "@/components/oauth/consent-actions";
import { brand } from "@/config/brand";
import { format } from "@/i18n/format";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.oauth.title, robots: { index: false } };
}

/**
 * Страница согласия OAuth 2.1 сервера Supabase Auth (authorization_url_path в config.toml).
 * Сюда MCP-клиент (Claude, ChatGPT, Cursor…) отправляет пользователя за разрешением на доступ.
 */
export default async function OAuthConsentPage({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const t = await getT();
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId || authorizationId.length > 512) return <Invalid text={t.oauth.invalid} />;

  const user = await requireUser(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) return <Invalid text={t.oauth.invalid} />;
  // Согласие уже было дано раньше — сразу возвращаем пользователя в приложение.
  if (!("authorization_id" in data)) redirect(data.redirect_url);

  const host = safeHost(data.redirect_uri);

  return (
    <div className="container-page flex flex-1 items-center justify-center py-12 sm:py-20">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-line p-6 sm:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface">
          <KeyRoundIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {format(t.oauth.heading, { client: data.client.name || host || "MCP", brand: brand.name })}
          </h1>
          <p className="text-sm text-muted">{format(t.oauth.signedInAs, { email: data.user.email || user.email || "" })}</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{format(t.oauth.canTitle, { brand: brand.name })}</p>
          <ul className="flex flex-col gap-2">
            {t.oauth.can.map((item) => (
              <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex gap-2.5 rounded-lg bg-warning-soft px-3.5 py-3 text-[13px] leading-relaxed text-warning">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
          {t.oauth.trustNote}
        </p>
        <ConsentActions authorizationId={data.authorization_id} />
        {host ? <p className="text-center text-xs text-subtle">{format(t.oauth.redirectNote, { host })}</p> : null}
      </div>
    </div>
  );
}

function Invalid({ text }: { text: string }) {
  return (
    <div className="container-page flex max-w-xl flex-1 flex-col items-center justify-center py-24 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface">
        <KeyRoundIcon className="size-6" />
      </span>
      <p className="mt-6 text-lg">{text}</p>
    </div>
  );
}

function safeHost(uri: string) {
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}
