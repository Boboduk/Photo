"use client";

import { MessageCircleIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatChatTime } from "@/i18n/format";
import { useLocale, useT } from "@/i18n/client";
import type { ConversationSummary } from "@/lib/queries/chat";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Список диалогов с поиском и обновлением в реальном времени. */
export function ConversationList({ userId, initial }: { userId: string; initial: ConversationSummary[] }) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeId = pathname.split("/")[3];

  const reload = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data } = await createClient().rpc("list_conversations", { p_limit: 200 });
      if (data) setItems(data as ConversationSummary[]);
    }, 200);
  }, []);

  // Данные с сервера обновились (router.refresh) — берём их.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  // Новый диалог (например, открытый кнопкой «Написать») — подгружаем список.
  useEffect(() => {
    if (activeId && !items.some((item) => item.id === activeId)) reload();
  }, [activeId, items, reload]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => reload())
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.other_display_name?.toLowerCase().includes(q) || item.other_username?.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-line lg:w-80 lg:shrink-0 lg:border-r",
        activeId ? "hidden lg:flex" : "flex w-full",
      )}
      aria-label={t.messages.title}
    >
      <div className="p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.messages.searchPlaceholder}
            aria-label={t.messages.searchPlaceholder}
            className="h-10 rounded-full bg-surface pl-10 hover:border-line-strong"
          />
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <li className="flex flex-col items-center px-4 py-12 text-center text-sm text-muted">
            <MessageCircleIcon className="mb-3 size-6" />
            {items.length === 0 ? (
              <>
                <span className="font-medium text-foreground">{t.messages.emptyTitle}</span>
                <span className="mt-1">{t.messages.emptyText}</span>
              </>
            ) : (
              t.messages.noResults
            )}
          </li>
        ) : null}
        {filtered.map((item) => {
          const name = item.other_display_name ?? t.messages.deletedUser;
          const mine = item.last_message_sender_id === userId;
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <Link
                href={`/dashboard/messages/${item.id}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                  active ? "bg-surface" : "hover:bg-surface/70",
                )}
              >
                <Avatar src={item.other_avatar_url} name={name} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-[15px]", item.unread_count > 0 ? "font-semibold" : "font-medium")}>{name}</span>
                    {item.last_message_at ? (
                      <span className="shrink-0 text-xs text-subtle">{formatChatTime(locale, item.last_message_at)}</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={cn("truncate text-sm", item.unread_count > 0 ? "text-foreground" : "text-muted")}>
                      {item.last_message_body ? `${mine ? `${t.messages.you}: ` : ""}${item.last_message_body}` : "—"}
                    </span>
                    {item.unread_count > 0 ? (
                      <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                        {item.unread_count}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
