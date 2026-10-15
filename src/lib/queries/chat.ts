import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  created_at: string;
  last_message_at: string | null;
  other_id: string | null;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  other_last_read_at: string | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
  blocked_by_me: boolean;
  can_message: boolean;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_conversations", { p_limit: 200 });
  return (data ?? []) as ConversationSummary[];
}

/** Диалог текущего пользователя; null — если его нет или пользователь не участник. */
export async function getConversation(id: string): Promise<ConversationSummary | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_conversations", { p_conversation: id, p_limit: 1 });
  return ((data ?? [])[0] as ConversationSummary | undefined) ?? null;
}

export const MESSAGES_PAGE = 50;

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE);
  return (data ?? []).reverse();
}
