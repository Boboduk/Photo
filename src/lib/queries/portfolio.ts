import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const isUuid = (value: string) => z.uuid().safeParse(value).success;

/** Работа со всеми данными для страницы просмотра. Видимость определяет RLS. */
export async function getPortfolioItem(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select(
      `*,
      owner:profiles!portfolio_items_owner_id_fkey(id, username, display_name, avatar_url, city, profile_type),
      images:portfolio_images(id, url, width, height, alt, position, storage_path),
      tags:portfolio_tags(tag),
      credits:portfolio_credits(id, role, name, profile:profiles!portfolio_credits_profile_id_fkey(id, username, display_name, avatar_url))`,
    )
    .eq("id", id)
    .order("position", { referencedTable: "portfolio_images" })
    .order("created_at", { referencedTable: "portfolio_credits" })
    .maybeSingle();
  return data;
}

export type PortfolioItemFull = NonNullable<Awaited<ReturnType<typeof getPortfolioItem>>>;

export async function getViewerItemState(itemId: string, userId: string | undefined) {
  if (!userId) return { liked: false, saved: false };
  const supabase = await createClient();
  const [like, favorite] = await Promise.all([
    supabase.from("likes").select("item_id").eq("item_id", itemId).eq("user_id", userId).maybeSingle(),
    supabase.from("favorites").select("id").eq("item_id", itemId).eq("user_id", userId).maybeSingle(),
  ]);
  return { liked: Boolean(like.data), saved: Boolean(favorite.data) };
}
