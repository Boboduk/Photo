import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type ProfileTypeRow = Tables<"profile_types">;

export const getProfileTypes = cache(async (): Promise<ProfileTypeRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_types")
    .select("*")
    .order("sort_order")
    .order("name");
  return data ?? [];
});

export const getProfileTypeLabels = cache(async (): Promise<Record<string, string>> => {
  const types = await getProfileTypes();
  return Object.fromEntries(types.map((t) => [t.slug, t.name]));
});

/** Тип профиля относится к моделям (показывается в каталоге моделей). */
export async function isModelProfileType(slug: string) {
  const types = await getProfileTypes();
  return types.some((t) => t.slug === slug && t.shows_in_model_catalog);
}
