import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/chat/chat-thread";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getConversation, getMessages } from "@/lib/queries/chat";

export async function generateMetadata(props: PageProps<"/dashboard/messages/[id]">): Promise<Metadata> {
  const t = await getT();
  const { id } = await props.params;
  const conversation = await getConversation(id);
  return { title: conversation?.other_display_name ?? t.messages.title };
}

export default async function ConversationPage(props: PageProps<"/dashboard/messages/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/dashboard/messages/${id}`);
  // Функция возвращает диалог только его участнику — чужую переписку открыть нельзя.
  const conversation = await getConversation(id);
  if (!conversation) notFound();
  const messages = await getMessages(conversation.id);

  return <ChatThread key={conversation.id} userId={user.id} conversation={conversation} initialMessages={messages} />;
}
