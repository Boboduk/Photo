"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { REPORT_REASONS, REPORT_TARGETS } from "@/lib/constants";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const id = z.uuid();

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function toggleLikeAction(itemId: string): Promise<ActionResult<{ liked: boolean; likesCount: number }>> {
  const t = await getT();
  if (!id.safeParse(itemId).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data, error } = await supabase.rpc("toggle_like", { p_item: itemId });
  if (error) return { ok: false, error: errorMessage(t, error) };
  const value = data as { liked: boolean; likes_count: number };
  return { ok: true, data: { liked: value.liked, likesCount: value.likes_count } };
}

export async function toggleFavoriteAction(
  target: { itemId: string } | { profileId: string },
): Promise<ActionResult<{ saved: boolean }>> {
  const t = await getT();
  const itemId = "itemId" in target ? target.itemId : undefined;
  const profileId = "profileId" in target ? target.profileId : undefined;
  if (!id.safeParse(itemId ?? profileId).success) return { ok: false, error: t.errors.not_found };

  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data, error } = await supabase.rpc("toggle_favorite", { p_item: itemId, p_profile: profileId });
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/dashboard/favorites");
  return { ok: true, data: { saved: Boolean(data) } };
}

/** «Написать»: открывает существующий диалог или создаёт новый. */
export async function startConversationAction(otherUserId: string): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(otherUserId).success) return { ok: false, error: t.errors.user_not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", { p_other: otherUserId });
  if (error || !data) return { ok: false, error: errorMessage(t, error) };
  redirect(`/dashboard/messages/${data}`);
}

export async function setBlockAction(otherUserId: string, blocked: boolean): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(otherUserId).success) return { ok: false, error: t.errors.user_not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  if (otherUserId === user.id) return { ok: false, error: t.errors.forbidden };

  const { error } = blocked
    ? await supabase.from("user_blocks").upsert({ blocked_id: otherUserId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true })
    : await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", otherUserId);
  if (error) return { ok: false, error: errorMessage(t, error) };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/messages", "layout");
  return { ok: true, message: blocked ? t.profile.blocked : t.profile.unblocked };
}

const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(2000).optional(),
});

export async function submitReportAction(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  const t = await getT();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.validation.invalidValue };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { error } = await supabase.rpc("submit_report", {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details ?? undefined,
  });
  if (error) return { ok: false, error: errorMessage(t, error) };
  return { ok: true, message: t.report.sent };
}
