"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const t = await getT();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const t = await getT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: t.notifications.markedAllRead };
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  const t = await getT();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
