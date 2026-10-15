import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getProfileByUsername(username: string) {
  const clean = username.toLowerCase();
  if (!/^[a-z0-9_.]{3,30}$/.test(clean)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("username", clean).maybeSingle();
  return data;
}

export type PublicDetails = {
  age: number | null;
  params: Partial<Record<"height_cm" | "clothing_size" | "shoe_size" | "hair_color" | "eye_color", string | number>> | null;
  contacts: Partial<Record<"email" | "phone" | "telegram", string>> | null;
};

export async function getProfileDetails(profileId: string): Promise<PublicDetails> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("profile_public_details", { p_profile: profileId });
  const value = (data ?? {}) as Partial<PublicDetails>;
  return { age: value.age ?? null, params: value.params ?? null, contacts: value.contacts ?? null };
}

export async function getViewerProfileState(profileId: string, viewerId: string | undefined) {
  if (!viewerId || viewerId === profileId) return { favorite: false, blocked: false };
  const supabase = await createClient();
  const [favorite, block] = await Promise.all([
    supabase.from("favorites").select("id").eq("user_id", viewerId).eq("profile_id", profileId).maybeSingle(),
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", viewerId).eq("blocked_id", profileId).maybeSingle(),
  ]);
  return { favorite: Boolean(favorite.data), blocked: Boolean(block.data) };
}

/** Опубликованные работы других авторов, где пользователь отмечен участником. */
export async function getCreditedWorks(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_credits")
    .select(
      `role,
      item:portfolio_items!inner(id, title, cover_image_url, cover_width, cover_height, is_published, hidden_at, owner_id,
        owner:profiles!portfolio_items_owner_id_fkey(username, display_name, avatar_url))`,
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(48);
  return (data ?? []).filter(
    (row) => row.item && row.item.is_published && !row.item.hidden_at && row.item.cover_image_url && row.item.owner_id !== profileId,
  );
}
