"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { createClient } from "@/lib/supabase/client";

export type UnreadCounts = { messages: number; notifications: number };

const UnreadContext = createContext<{ counts: UnreadCounts; refresh: () => void }>({
  counts: { messages: 0, notifications: 0 },
  refresh: () => {},
});

export function useUnreadCounts() {
  return useContext(UnreadContext);
}

/**
 * Счётчики непрочитанных сообщений и уведомлений с обновлением в реальном времени.
 * Supabase Realtime применяет RLS, поэтому подписка получает только события пользователя.
 */
export function UnreadCountsProvider({
  userId,
  initial,
  children,
}: {
  userId: string | null;
  initial: UnreadCounts | null;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState<UnreadCounts>(initial ?? { messages: 0, notifications: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const refresh = useCallback(() => {
    if (!userId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data } = await createClient().rpc("unread_counts");
      if (data && typeof data === "object") {
        const value = data as Record<string, number>;
        setCounts({ messages: Number(value.messages ?? 0), notifications: Number(value.notifications ?? 0) });
      }
    }, 250);
  }, [userId]);

  // Обновляем при переходах между страницами (например, после прочтения диалога).
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`unread:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        refresh();
        const message = payload.new as { sender_id: string | null; conversation_id: string };
        if (!message.sender_id || message.sender_id === userId) return;
        // Не показываем всплывающее уведомление, если диалог уже открыт.
        if (pathnameRef.current?.startsWith(`/dashboard/messages/${message.conversation_id}`)) return;
        const { data: sender } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", message.sender_id)
          .maybeSingle();
        toast(format(t.messages.newMessage, { name: sender?.display_name ?? t.notifications.someone }), {
          action: {
            label: t.common.open,
            onClick: () => router.push(`/dashboard/messages/${message.conversation_id}`),
          },
        });
      })
      .subscribe();

    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh, t, router]);

  return <UnreadContext.Provider value={{ counts, refresh }}>{children}</UnreadContext.Provider>;
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] leading-none font-semibold text-white tabular-nums " +
        (className ?? "")
      }
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
