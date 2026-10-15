import { ConversationList } from "@/components/chat/conversation-list";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/queries/chat";

/** Мессенджер: слева список диалогов, справа переписка. На телефоне — отдельные экраны. */
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard/messages");
  const conversations = await listConversations();
  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-[420px] overflow-hidden rounded-xl border border-line lg:h-[calc(100dvh-9rem)]">
      <ConversationList userId={user.id} initial={conversations} />
      {children}
    </div>
  );
}
