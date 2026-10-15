import { intlLocale, type Locale } from "./config";

/** Подстановка значений: format("Найдено {count}", { count: 3 }) */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Склонение по числу. forms — [одна, несколько, много] для русского языка,
 * [one, other, other] для языков с двумя формами.
 */
export function plural(locale: Locale, count: number, forms: readonly string[]): string {
  const rule = new Intl.PluralRules(intlLocale[locale]).select(count);
  if (rule === "one") return forms[0] ?? "";
  if (rule === "few" || rule === "two") return forms[1] ?? forms[0] ?? "";
  return forms[2] ?? forms[1] ?? forms[0] ?? "";
}

export function formatDate(locale: Locale, value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale[locale], options ?? { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Дата для полей типа date (YYYY-MM-DD) без сдвига часового пояса. */
export function formatDay(locale: Locale, value: string, options?: Intl.DateTimeFormatOptions) {
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale[locale], options ?? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)),
  );
}

export function formatTime(locale: Locale, value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale[locale], { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** «5 минут назад», «вчера» и т.п. */
export function formatRelative(locale: Locale, value: string | Date, now: Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale[locale], { numeric: "auto" });
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSeconds / 86400), "day");
  return formatDate(locale, date, { day: "numeric", month: "short", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/** Время для списка диалогов: сегодня — часы, иначе дата. */
export function formatChatTime(locale: Locale, value: string | Date, now: Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatTime(locale, date);
  return formatDate(locale, date, { day: "numeric", month: "short" });
}
