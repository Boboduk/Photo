import { MessageCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.messages.title };
}

export default async function MessagesIndexPage() {
  const t = await getT();
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-3 bg-surface/40 text-muted lg:flex">
      <MessageCircleIcon className="size-8" />
      <p>{t.messages.selectConversation}</p>
    </div>
  );
}
