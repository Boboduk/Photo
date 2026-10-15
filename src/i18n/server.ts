import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { dictionaries } from "./dictionaries";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
});

/** Словарь текущего языка для серверных компонентов и server actions. */
export async function getT() {
  return dictionaries[await getLocale()];
}

/** Словарь и язык (для форматирования дат и склонений). */
export async function getI18n() {
  const locale = await getLocale();
  return { t: dictionaries[locale], locale };
}
