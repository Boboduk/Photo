"use client";

import { ArrowUpIcon, CheckIcon, LoaderCircleIcon, SparklesIcon, SquarePenIcon, SquareIcon, WrenchIcon, XIcon } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SmartImage } from "@/components/media/smart-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format";
import {
  ASSISTANT_MESSAGE_MAX,
  type AssistantChatView,
  type AssistantConfirm,
  type AssistantEvent,
  type AssistantItem,
} from "@/lib/assistant/types";
import { cn } from "@/lib/utils";

/** Кнопка ассистента FRAME в углу экрана и окно чата. */
export function AssistantWidget({ configured }: { configured: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [items, setItems] = useState<AssistantItem[]>([]);
  const [confirm, setConfirm] = useState<AssistantConfirm | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  /** Открывает окно; при первом открытии подгружает последний диалог. */
  const toggle = () => {
    setOpen(!open);
    if (open || loaded || !configured) return;
    setLoaded(true);
    fetch("/api/assistant")
      .then((response) => (response.ok ? (response.json() as Promise<AssistantChatView>) : null))
      .then((view) => {
        if (!view) return;
        setChatId(view.id);
        setItems(view.items);
        setConfirm(view.confirm);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [items, confirm, busy]);

  const apply = (event: AssistantEvent) => {
    switch (event.type) {
      case "chat":
        setChatId(event.id);
        break;
      case "text":
        setItems((current) => {
          const last = current.at(-1);
          return last?.kind === "assistant"
            ? [...current.slice(0, -1), { kind: "assistant", text: last.text + event.delta }]
            : [...current, { kind: "assistant", text: event.delta }];
        });
        break;
      case "tool":
        setItems((current) => [...current, { kind: "tool", name: event.name }]);
        break;
      case "image":
        setItems((current) => [...current, { kind: "image", url: event.url }]);
        break;
      case "confirm":
        setConfirm(event.confirm);
        break;
      case "notice":
        setItems((current) => [...current, { kind: "assistant", text: event.message }]);
        break;
      case "error":
        toast.error(event.message);
        break;
      case "done":
        if (event.remaining !== null) setRemaining(event.remaining);
        break;
    }
  };

  const post = async (body: { message: string } | { approve: boolean }) => {
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, ...body }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? t.siteAssistant.failed);
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) apply(JSON.parse(line) as AssistantEvent);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(t.siteAssistant.failed);
    } finally {
      abort.current = null;
      setBusy(false);
    }
  };

  const send = (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setConfirm(null);
    setItems((current) => [...current, { kind: "user", text: message }]);
    void post({ message });
  };

  const decide = (approve: boolean) => {
    if (busy) return;
    setConfirm(null);
    void post({ approve });
  };

  const newChat = () => {
    abort.current?.abort();
    setChatId(null);
    setItems([]);
    setConfirm(null);
  };

  return (
    <>
      {open ? (
        <section
          role="dialog"
          aria-label={t.siteAssistant.title}
          className="fixed inset-x-2 bottom-2 z-50 flex h-[min(680px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-2xl border border-line bg-background shadow-pop sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[420px]"
        >
          <header className="flex items-start gap-3 border-b border-line px-4 py-3">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <SparklesIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{t.siteAssistant.title}</h2>
              <p className="truncate text-xs text-muted">{t.siteAssistant.subtitle}</p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={t.siteAssistant.newChat} title={t.siteAssistant.newChat} onClick={newChat}>
              <SquarePenIcon />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={t.siteAssistant.close} onClick={toggle}>
              <XIcon />
            </Button>
          </header>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {!configured ? (
              <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">{t.siteAssistant.notConfigured}</p>
            ) : items.length === 0 && !busy ? (
              <div className="flex flex-1 flex-col justify-end gap-2">
                <p className="text-lg font-semibold">{t.siteAssistant.empty}</p>
                {t.siteAssistant.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-xl border border-line px-3 py-2 text-left text-sm transition-colors hover:border-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : (
              items.map((item, index) => <ChatItem key={index} item={item} />)
            )}
            {busy && items.at(-1)?.kind !== "assistant" ? (
              <p className="flex items-center gap-2 text-sm text-muted" role="status">
                <LoaderCircleIcon className="size-4 animate-spin" />
                {t.siteAssistant.thinking}
              </p>
            ) : null}
            {confirm && !busy ? <ConfirmCard confirm={confirm} onDecide={decide} /> : null}
            <div ref={bottom} />
          </div>

          <form
            className="flex flex-col gap-2 border-t border-line px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={t.siteAssistant.placeholder}
                aria-label={t.siteAssistant.placeholder}
                maxLength={ASSISTANT_MESSAGE_MAX}
                rows={1}
                disabled={!configured}
                className="max-h-36 min-h-10 flex-1 resize-none py-2"
              />
              {busy ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label={t.siteAssistant.stop}
                  onClick={() => abort.current?.abort()}
                >
                  <SquareIcon />
                </Button>
              ) : (
                <Button type="submit" size="icon" aria-label={t.siteAssistant.send} disabled={!configured || !input.trim()}>
                  <ArrowUpIcon />
                </Button>
              )}
            </div>
            <p className="px-1 text-[11px] leading-snug text-subtle">
              {remaining !== null ? `${format(t.siteAssistant.remaining, { count: remaining })} · ` : null}
              {t.siteAssistant.privacy}
            </p>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-label={t.siteAssistant.open}
        aria-expanded={open}
        className={cn(
          "fixed right-5 bottom-5 z-40 inline-flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-pop transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none",
          open && "hidden sm:inline-flex sm:opacity-0 sm:pointer-events-none",
        )}
      >
        <SparklesIcon className="size-6" />
      </button>
    </>
  );
}

function ChatItem({ item }: { item: AssistantItem }) {
  const t = useT();
  switch (item.kind) {
    case "user":
      return (
        <p className="ml-10 self-end rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-[15px] whitespace-pre-wrap text-background">
          {item.text}
        </p>
      );
    case "assistant":
      return (
        <div className="mr-6 text-[15px] leading-relaxed whitespace-pre-wrap">
          <RichText text={item.text} />
        </div>
      );
    case "tool":
      return (
        <p className="flex items-center gap-2 text-xs text-muted">
          <WrenchIcon className="size-3.5 shrink-0" />
          {t.siteAssistant.tools[item.name] ?? t.siteAssistant.toolFallback}
        </p>
      );
    case "image":
      return (
        <a href={item.url} target="_blank" rel="noreferrer" className="block w-2/3 overflow-hidden rounded-xl bg-surface">
          <SmartImage src={item.url} alt="" width={600} height={800} unoptimized className="h-auto w-full" />
        </a>
      );
  }
}

const TOKEN = /(\*\*[^*\n]+\*\*|https?:\/\/[^\s<>()]+[^\s<>().,;:!?»"'])/g;

/** Текст ответа: ссылки и **жирный**, без произвольной разметки. */
function RichText({ text }: { text: string }) {
  return text.split(TOKEN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) {
      const internal = typeof window !== "undefined" && part.startsWith(window.location.origin);
      return (
        <a
          key={index}
          href={part}
          className="font-medium break-all underline underline-offset-2"
          {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}
        >
          {internal ? part.slice(window.location.origin.length) || "/" : part}
        </a>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function ConfirmCard({ confirm, onDecide }: { confirm: AssistantConfirm; onDecide: (approve: boolean) => void }) {
  const t = useT();
  const value = (raw: unknown): string => {
    if (typeof raw === "boolean") return raw ? t.siteAssistant.yes : t.siteAssistant.no;
    if (Array.isArray(raw)) return raw.map(value).join(", ");
    if (raw && typeof raw === "object") {
      return Object.entries(raw)
        .map(([key, entry]) => `${key}: ${value(entry) || "—"}`)
        .join(", ");
    }
    if (raw === null || raw === "") return "—";
    return String(raw);
  };
  const fields = Object.entries(confirm.input).filter(([, raw]) => raw !== undefined);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-foreground/20 bg-surface p-3.5">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{t.siteAssistant.confirmTitle}</p>
        <p className="font-semibold">{t.siteAssistant.actions[confirm.name] ?? t.siteAssistant.actionFallback}</p>
      </div>
      {fields.length > 0 ? (
        <dl className="flex flex-col gap-1.5 text-sm">
          {fields.map(([key, raw]) => (
            <div key={key}>
              <dt className="text-xs text-muted">{t.siteAssistant.fields[key] ?? key}</dt>
              <dd className="whitespace-pre-wrap">{value(raw)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onDecide(true)}>
          <CheckIcon />
          {t.siteAssistant.confirm}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onDecide(false)}>
          {t.siteAssistant.decline}
        </Button>
      </div>
    </div>
  );
}
