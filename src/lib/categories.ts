import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import type { Tables } from "@/types/database";

export type Category = Tables<"categories">;

/** Активные категории (кэш на время одного запроса). */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  return data ?? [];
});

export function categoryName(category: Pick<Category, "name" | "translations">, locale: Locale) {
  const translations = category.translations as Record<string, string> | null;
  return (locale !== "ru" && translations?.[locale]) || category.name;
}

/** Словарь slug → название для отображения. */
export async function getCategoryLabels(locale: Locale) {
  const categories = await getCategories();
  return Object.fromEntries(categories.map((c) => [c.slug, categoryName(c, locale)])) as Record<string, string>;
}
