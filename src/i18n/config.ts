export const locales = ["ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
export const LOCALE_COOKIE = "locale";

/** Код для Intl API (даты, числа). */
export const intlLocale: Record<Locale, string> = {
  ru: "ru-RU",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
