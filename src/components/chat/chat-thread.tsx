"use client";

import {
  ArrowLeftIcon,
  BanIcon,
  CheckCheckIcon,
  CheckIcon,
  EllipsisIcon,
  FlagIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SendHorizontalIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { setBlockAction } from "@/actions/social";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ReportDialog } from "@/components/common/report-dialog";
import { useUnreadCounts } from "@/components/layout/unread-counts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatTime } from "@/i18n/format";
import { useLocale, useT } from "@/i18n/client";
import type { ChatMessage, ConversationSummary } from "@/lib/queries/chat";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type UiMessage = ChatMessage & { status?: "sending" | "failed"; clientId?: string };

const PAGE = 50;

export function ChatThread({
  userId,
  conversation,
  initialMessages,
}: {
  userId: string;
  conversation: ConversationSummary;
  initialMessages: ChatMessage[];
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { refresh: refreshCounts } = useUnreadCounts();
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [otherReadAt, setOtherReadAt] = useState(conversation.other_last_read_at);
  const [hasMore, setHasMore] = useState(initialMessages.length >= PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportUserOpen, setReportUserOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationId = conversation.id;
  const otherName = conversation.other_display_name ?? t.messages.deletedUser;
  const canMessage = conversation.can_message;

  const markRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(async () => {
      if (document.visibilityState !== "visible") return;
      await createClient().rpc("mark_conversation_read", { p_conversation: conversationId });
      refreshCounts();
    }, 300);
  }, [conversationId, refreshCounts]);

  // Отмечаем диалог прочитанным при открытии и при возвращении на вкладку.
  useEffect(() => {
    markRead();
    const onVisible = () => document.visibilityState === "visible" && markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  // Новые сообщения и отметки о прочтении в реальном времени.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const message = payload.new as ChatMessage;
          setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
          if (message.sender_id !== userId) markRead();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const member = payload.new as { user_id: string; last_read_at: string };
          if (member.user_id !== userId) setOtherReadAt(member.last_read_at);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, markRead]);

  // Прокрутка вниз при новых сообщениях, если пользователь и так был внизу.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadEarlier = async () => {
    const oldest = messages.find((m) => !m.status);
    if (!oldest) return;
    setLoadingMore(true);
    const el = scroller.current;
    const previousHeight = el?.scrollHeight ?? 0;
    const { data } = await createClient()
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    setLoadingMore(false);
    const older = (data ?? []).reverse();
    setHasMore(older.length >= PAGE);
    stickToBottom.current = false;
    setMessages((current) => [...older.filter((m) => !current.some((c) => c.id === m.id)), ...current]);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - previousHeight;
    });
  };

  const send = async (body: string, clientId = crypto.randomUUID()) => {
    const text = body.trim();
    if (!text) return;
    stickToBottom.current = true;
    const optimistic: UiMessage = {
      id: clientId,
      clientId,
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
      created_at: new Date().toISOString(),
      status: "sending",
    };
    setMessages((current) => [...current.filter((m) => m.clientId !== clientId), optimistic]);

    const { data, error } = await createClient()
      .from("messages")
      .insert({ conversation_id: conversationId, body: text })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (error || !data) {
      setMessages((current) => current.map((m) => (m.clientId === clientId ? { ...m, status: "failed" } : m)));
      toast.error(error?.message === "rate_limited" ? t.errors.rate_limited : t.messages.sendError);
      return;
    }
    setMessages((current) => {
      const withoutTemp = current.filter((m) => m.clientId !== clientId);
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = draft;
    if (!text.trim()) return;
    setDraft("");
    if (textarea.current) textarea.current.style.height = "";
    void send(text);
  };

  const toggleBlock = async () => {
    const result = await setBlockAction(conversation.other_id!, !conversation.blocked_by_me);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else toast.error(result.error);
  };

  // Последнее моё сообщение, прочитанное собеседником, — для отметки «Прочитано».
  const lastMine = [...messages].reverse().find((m) => m.sender_id === userId && !m.status);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label={otherName}>
      {/* Шапка с собеседником */}
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link href="/dashboard/messages" aria-label={t.messages.back}>
            <ArrowLeftIcon />
          </Link>
        </Button>
        {conversation.other_username ? (
          <Link href={`/users/${conversation.other_username}`} className="flex min-w-0 items-center gap-3">
            <Avatar src={conversation.other_avatar_url} name={otherName} size="md" />
            <span className="min-w-0">
              <span className="block truncate font-semibold hover:underline">{otherName}</span>
              <span className="block truncate text-xs text-muted">@{conversation.other_username}</span>
            </span>
          </Link>
        ) : (
          <span className="flex items-center gap-3">
            <Avatar name={otherName} size="md" />
            <span className="font-semibold text-muted">{otherName}</span>
          </span>
        )}
        {conversation.other_id ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto" aria-label={t.common.moreActions}>
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {conversation.other_username ? (
                <DropdownMenuItem asChild>
                  <Link href={`/users/${conversation.other_username}`}>
                    <UserIcon />
                    {t.messages.viewProfile}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => setReportUserOpen(true)}>
                <FlagIcon />
                {t.profile.report}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {conversation.blocked_by_me ? (
                <DropdownMenuItem onSelect={() => startTransition(toggleBlock)}>
                  <BanIcon />
                  {t.profile.unblock}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem destructive onSelect={() => setBlockOpen(true)}>
                  <BanIcon />
                  {t.profile.block}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      {/* Лента сообщений */}
      <div
        ref={scroller}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasMore ? (
          <div className="mb-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadEarlier} disabled={loadingMore}>
              {loadingMore ? <LoaderCircleIcon className="animate-spin" /> : null}
              {t.messages.loadEarlier}
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <p className="mx-auto mt-10 max-w-sm text-center text-sm text-muted">{t.messages.startConversation}</p>
        ) : null}

        <ol className="flex flex-col gap-1">
          {messages.map((message, index) => {
            const mine = message.sender_id === userId;
            const previous = messages[index - 1];
            const newDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
            const grouped = previous && !newDay && previous.sender_id === message.sender_id;
            const read = mine && otherReadAt !== null && Date.parse(message.created_at) <= Date.parse(otherReadAt);
            return (
              <Fragment key={message.clientId ?? message.id}>
                {newDay ? (
                  <li className="my-4 text-center text-xs font-medium text-subtle" aria-hidden={false}>
                    {dayLabel(message.created_at, locale, t.messages.today, t.messages.yesterday)}
                  </li>
                ) : null}
                <li className={cn("group flex", mine ? "justify-end" : "justify-start", !grouped && "mt-2")}>
                  <div className={cn("flex max-w-[85%] items-end gap-1.5 sm:max-w-[70%]", mine && "flex-row-reverse")}>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap",
                        mine ? "rounded-br-md bg-foreground text-background" : "rounded-bl-md bg-surface",
                        message.status === "failed" && "bg-danger-soft text-danger",
                        message.status === "sending" && "opacity-70",
                      )}
                    >
                      {message.body}
                      <span className={cn("ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[11px]", mine ? "text-background/60" : "text-subtle")}>
                        {formatTime(locale, message.created_at)}
                        {mine && !message.status ? (
                          read ? (
                            <CheckCheckIcon className="size-3.5" aria-label={t.messages.read} />
                          ) : (
                            <CheckIcon className="size-3.5" aria-label={t.messages.sent} />
                          )
                        ) : null}
                      </span>
                    </div>
                    {message.status === "failed" ? (
                      <Button variant="ghost" size="icon-sm" onClick={() => send(message.body, message.clientId)} aria-label={t.messages.retry}>
                        <RotateCcwIcon />
                      </Button>
                    ) : null}
                    {!mine && message.sender_id ? (
                      <button
                        type="button"
                        onClick={() => setReportMessageId(message.id)}
                        className="mb-1 inline-flex size-7 items-center justify-center rounded-full text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-foreground focus-visible:opacity-100"
                        aria-label={t.messages.reportMessage}
                        title={t.messages.reportMessage}
                      >
                        <FlagIcon className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </li>
                {lastMine && message.id === lastMine.id && read ? (
                  <li className="pr-1 text-right text-[11px] text-subtle">{t.messages.read}</li>
                ) : null}
              </Fragment>
            );
          })}
        </ol>
      </div>

      {/* Поле ввода */}
      {canMessage ? (
        <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
          <label htmlFor="chat-input" className="sr-only">
            {t.messages.typeMessage}
          </label>
          <textarea
            id="chat-input"
            ref={textarea}
            rows={1}
            value={draft}
            maxLength={4000}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t.messages.typeMessage}
            title={t.messages.enterHint}
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-background px-4 py-2.5 text-[15px] outline-none focus-visible:border-foreground"
          />
          <Button type="submit" size="icon" className="size-11" disabled={!draft.trim()} aria-label={t.messages.send}>
            <SendHorizontalIcon />
          </Button>
        </form>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm text-muted">
          {conversation.blocked_by_me ? t.messages.youBlocked : t.messages.cannotMessage}
        </p>
      )}

      {conversation.other_id ? (
        <>
          <ReportDialog
            targetType="profile"
            targetId={conversation.other_id}
            isAuthenticated
            trigger={null}
            open={reportUserOpen}
            onOpenChange={setReportUserOpen}
          />
          <ConfirmDialog
            open={blockOpen}
            onOpenChange={setBlockOpen}
            title={t.profile.blockTitle}
            description={t.profile.blockText}
            confirmLabel={t.profile.block}
            onConfirm={toggleBlock}
          />
        </>
      ) : null}
      {reportMessageId ? (
        <ReportDialog
          targetType="message"
          targetId={reportMessageId}
          isAuthenticated
          trigger={null}
          open
          onOpenChange={(open) => !open && setReportMessageId(null)}
        />
      ) : null}
    </section>
  );
}

function dayLabel(value: string, locale: Parameters<typeof formatDate>[0], today: string, yesterday: string) {
  const date = new Date(value);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return today;
  if (date.toDateString() === y.toDateString()) return yesterday;
  return formatDate(locale, date, { day: "numeric", month: "long", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}
