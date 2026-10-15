import type { Metadata, Viewport } from "next";
import { Onest, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { brand } from "@/config/brand";
import { siteUrl } from "@/config/site";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
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
          {children}
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
