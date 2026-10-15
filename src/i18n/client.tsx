"use client";

import { createContext, useContext } from "react";
import { defaultLocale, type Locale } from "./config";
import { dictionaries } from "./dictionaries";

const LocaleContext = createContext<Locale>(defaultLocale);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Словарь текущего языка для клиентских компонентов. */
export function useT() {
  return dictionaries[useContext(LocaleContext)];
}
