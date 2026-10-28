import type { Metadata, Viewport } from "next";
import { Onest, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { brand } from "@/config/brand";
import { siteUrl } from "@/config/site";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
  style: ["italic"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${onest.variable} ${playfair.variable}`}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
          {isSupabaseConfigured() ? children : <SetupRequired />}
          <Toaster
            position="bottom-center"
            toastOptions={{
              classNames: {
                toast: "!rounded-xl !border-line !shadow-pop !font-sans",
              },
            }}
          />
        </I18nProvider>
      </body>
    </html>
  );
}

/** Первый запуск без .env.local: вместо ошибки — короткая инструкция. */
function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-5 px-6 py-16">
      <p className="text-sm font-semibold tracking-[0.2em]">{brand.name}</p>
      <h1 className="text-3xl font-semibold tracking-tight">Подключите Supabase</h1>
      <p className="leading-relaxed text-muted">
        Не заданы переменные <code>NEXT_PUBLIC_SUPABASE_URL</code> и <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
      </p>
      <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
        <li>
          Запустите Docker (Docker Desktop, OrbStack или Colima) и выполните <code>npx supabase start</code>.
        </li>
        <li>
          Скопируйте значения API URL и anon key из вывода команды (или <code>npx supabase status</code>) в файл{" "}
          <code>.env.local</code>.
        </li>
        <li>Перезапустите <code>npm run dev</code>.</li>
      </ol>
      <p className="text-sm text-muted">Подробности — в README.md, раздел «Быстрый старт».</p>
    </main>
  );
}
