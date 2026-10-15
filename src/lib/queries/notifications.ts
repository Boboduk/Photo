import "server-only";

import type { NotificationRow } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function getNotifications(userId: string, limit = 100): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, data, read_at, created_at, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationRow[];
}
