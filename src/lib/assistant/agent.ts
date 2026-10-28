import "server-only";

import { Client, InMemoryTransport, type CallToolResult } from "@modelcontextprotocol/client";
import OpenAI from "openai";
import { brand } from "@/config/brand";
import { siteUrl } from "@/config/site";
import type { Dictionary } from "@/i18n/dictionaries";
import { errorMessage } from "@/lib/errors";
import type { McpAuthInfo } from "@/lib/mcp/auth";
import { createFrameMcpServer, FRAME_MCP_INSTRUCTIONS } from "@/lib/mcp/server";
import { looksLikeRegionBlock } from "@/lib/tryon/provider";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { assistantProvider } from "./config";
import type { AssistantChatView, AssistantEvent, AssistantItem } from "./types";

/**
 * Ассистент FRAME на сайте: OpenAI Chat Completions с инструментами MCP-сервера FRAME.
 * MCP-сервер подключается в том же процессе (InMemoryTransport) и работает от имени
 * вошедшего пользователя по его access-токену — права, как и везде, проверяет RLS.
 * Инструменты, которые что-то меняют (readOnlyHint ≠ true), выполняются только после
 * подтверждения пользователем на сайте: до этого диалог «ждёт» в assistant_chats.pending.
 */

type MessageParam = OpenAI.Chat.ChatCompletionMessageParam;
type ToolMessage = OpenAI.Chat.ChatCompletionToolMessageParam;
type PendingTool = { id: string; name: string; input: Record<string, unknown> };
type Pending = { tool: PendingTool; results: ToolMessage[] };

const REASONING = (["minimal", "low", "medium", "high"] as const).find((value) => value === process.env.ASSISTANT_REASONING);
/** Шагов «модель → инструмент» на одно сообщение пользователя. */
const MAX_STEPS = 10;
/** Дальше история становится дорогой: предлагаем начать новый чат. */
const MAX_HISTORY = 120;

const SYSTEM_PROMPT = (serverInstructions: string) =>
  [
    `You are the ${brand.name} assistant built into the website ${siteUrl}. You talk to a signed-in member; every tool acts on their behalf and with their permissions only.`,
    "Reply in the member's language (usually Russian). Be concise and warm: short paragraphs or short lists. No tables or headings; **bold** sparingly. Give links exactly as tools return them and never invent people, works, projects or links.",
    "Work out what the member means even if the request is vague or misspelled; search, and if nothing is found use did_you_mean and retry before saying nothing was found.",
    "Actions that change something (saving the profile, asking a model to open a photo, generating a look) are confirmed by the member with a button on the website. When the member wants such an action and you have the details, call the tool right away instead of asking for permission in text — the website asks them. If they decline, accept it and offer alternatives.",
    "Photos (avatar, portfolio works, fitting-room models and garments) can only be uploaded on the website — give the relevant link.",
    "",
    "About the platform and tools:",
    serverInstructions,
  ].join("\n");

/** Инструменты MCP-сервера FRAME от имени пользователя. */
async function connectTools(auth: McpAuthInfo) {
  const server = createFrameMcpServer(auth);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "frame-site-assistant", version: "1.0.0" });
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  return {
    client,
    instructions: client.getInstructions() || FRAME_MCP_INSTRUCTIONS,
    tools: tools.map((tool): OpenAI.Chat.ChatCompletionFunctionTool => {
      const { $schema: _schema, ...parameters } = tool.inputSchema as Record<string, unknown>;
      return { type: "function", function: { name: tool.name, description: tool.description ?? tool.title ?? tool.name, parameters } };
    }),
    mutating: new Set(tools.filter((tool) => tool.annotations?.readOnlyHint !== true).map((tool) => tool.name)),
    close: () => client.close(),
  };
}

type Tools = Awaited<ReturnType<typeof connectTools>>;

/** Результат MCP-инструмента → сообщение role: "tool" (только текст; картинки видит пользователь). */
function toToolMessage(id: string, result: CallToolResult): ToolMessage {
  const parts = result.content.map((block) =>
    block.type === "text" ? block.text : block.type === "image" ? "[Image shown to the member in the chat.]" : JSON.stringify(block),
  );
  const text = parts.join("\n");
  return { role: "tool", tool_call_id: id, content: result.isError ? `Error: ${text}` : text };
}

const errorMessageFor = (id: string, text: string): ToolMessage => ({ role: "tool", tool_call_id: id, content: `Error: ${text}` });

/** Ссылка на готовый образ из ответа tryon_generate. */
function lookUrl(message: ToolMessage): string | null {
  if (typeof message.content !== "string" || message.content.startsWith("Error:")) return null;
  try {
    const data = JSON.parse(message.content.split("\n")[0] ?? "") as { url?: unknown };
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}

async function runTool(tools: Tools, tool: PendingTool, send: (event: AssistantEvent) => void): Promise<ToolMessage> {
  send({ type: "tool", name: tool.name });
  try {
    const result = toToolMessage(tool.id, await tools.client.callTool({ name: tool.name, arguments: tool.input }));
    if (tool.name === "tryon_generate") {
      const url = lookUrl(result);
      if (url) send({ type: "image", url });
    }
    return result;
  } catch (error) {
    console.error(`[assistant] tool ${tool.name} failed`, error);
    return errorMessageFor(tool.id, error instanceof Error ? error.message : "Tool failed");
  }
}

// --- Хранение диалога --------------------------------------------------------

type ChatRow = { id: string; title: string | null; messages: MessageParam[]; pending: Pending | null };

async function loadChat(db: ServerSupabase, chatId: string | null): Promise<ChatRow | null> {
  if (!chatId) return null;
  const { data } = await db.from("assistant_chats").select("id, title, messages, pending").eq("id", chatId).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    messages: data.messages as unknown as MessageParam[],
    pending: data.pending as unknown as Pending | null,
  };
}

async function saveChat(db: ServerSupabase, chat: ChatRow) {
  const { error } = await db
    .from("assistant_chats")
    .update({
      title: chat.title,
      messages: chat.messages as unknown as Json[],
      pending: chat.pending as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chat.id);
  if (error) console.error("[assistant] save failed", error.message);
}

/** Последний диалог пользователя в виде, удобном для отображения. */
export async function latestChatView(db: ServerSupabase): Promise<AssistantChatView> {
  const { data } = await db.from("assistant_chats").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const chat = await loadChat(db, data?.id ?? null);
  return chat ? chatView(chat) : { id: null, items: [], confirm: null };
}

const textOf = (content: unknown) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part: { type?: string; text?: string }) => (part.type === "text" ? (part.text ?? "") : "")).join("")
      : "";

function chatView(chat: ChatRow): AssistantChatView {
  const items: AssistantItem[] = [];
  const toolNames = new Map<string, string>();
  for (const message of chat.messages) {
    if (message.role === "user" || message.role === "assistant") {
      const text = textOf(message.content);
      if (text.trim()) items.push({ kind: message.role, text });
    }
    if (message.role === "assistant") {
      for (const call of message.tool_calls ?? []) {
        if (call.type !== "function") continue;
        toolNames.set(call.id, call.function.name);
        items.push({ kind: "tool", name: call.function.name });
      }
    } else if (message.role === "tool" && toolNames.get(message.tool_call_id) === "tryon_generate") {
      const url = lookUrl(message);
      if (url) items.push({ kind: "image", url });
    }
  }
  return { id: chat.id, items, confirm: chat.pending ? { name: chat.pending.tool.name, input: chat.pending.tool.input } : null };
}

// --- Диалог ------------------------------------------------------------------

export type AssistantTurn = { chatId: string | null } & ({ message: string } | { approve: boolean });

/**
 * Один ход: новое сообщение пользователя или решение по ожидающему действию.
 * События отдаются через send по мере работы; история сохраняется в базе.
 */
export async function runAssistantTurn(
  { db, auth, t, signal }: { db: ServerSupabase; auth: McpAuthInfo; t: Dictionary; signal: AbortSignal },
  turn: AssistantTurn,
  send: (event: AssistantEvent) => void,
) {
  const provider = assistantProvider();
  if (!provider) {
    send({ type: "error", message: t.siteAssistant.notConfigured });
    return;
  }
  let chat = await loadChat(db, turn.chatId);
  let remaining: number | null = null;
  // Сообщение засчитывается в дневной лимит только после первого успешного ответа модели.
  let counted = !("message" in turn);

  if ("message" in turn) {
    if (chat && chat.messages.length >= MAX_HISTORY) {
      send({ type: "notice", message: t.siteAssistant.tooLong });
      send({ type: "done", remaining });
      return;
    }
    const { data: left, error } = await db.rpc("assistant_turns_left");
    if (error) {
      send({ type: "error", message: errorMessage(t, error) });
      return;
    }
    if (!left) {
      send({ type: "error", message: t.siteAssistant.limitReached });
      return;
    }
  } else if (!chat?.pending) {
    send({ type: "error", message: t.siteAssistant.nothingToConfirm });
    return;
  }

  if (!chat) {
    const { data, error } = await db.from("assistant_chats").insert({ title: null }).select("id").single();
    if (error || !data) {
      send({ type: "error", message: errorMessage(t, error) });
      return;
    }
    chat = { id: data.id, title: null, messages: [], pending: null };
    send({ type: "chat", id: chat.id });
  }

  const openai = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });
  const tools = await connectTools(auth);
  try {
    // Ход пользователя: решение по ожидающему действию и/или новое сообщение.
    const pending = chat.pending;
    chat.pending = null;
    if ("approve" in turn && pending) {
      const result = turn.approve
        ? await runTool(tools, pending.tool, send)
        : ({ role: "tool", tool_call_id: pending.tool.id, content: "The member declined this action." } satisfies ToolMessage);
      chat.messages.push(...pending.results, result);
    } else if ("message" in turn) {
      if (pending) {
        chat.messages.push(...pending.results, {
          role: "tool",
          tool_call_id: pending.tool.id,
          content: "Not confirmed: the member wrote a new message instead.",
        });
      }
      chat.messages.push({ role: "user", content: turn.message });
      chat.title ??= turn.message.slice(0, 120);
    }

    for (let step = 0; step < MAX_STEPS; step++) {
      const stream = openai.chat.completions.stream(
        {
          model: provider.model,
          messages: [{ role: "system", content: SYSTEM_PROMPT(tools.instructions) }, ...chat.messages],
          tools: tools.tools,
          stream_options: { include_usage: true },
          // По одному инструменту за шаг: так действие с подтверждением всегда одно.
          parallel_tool_calls: false,
          ...(REASONING ? { reasoning_effort: REASONING } : {}),
        },
        { signal },
      );
      stream.on("content", (delta) => send({ type: "text", delta }));
      const completion = await stream.finalChatCompletion();
      if (!counted) {
        counted = true;
        const { data } = await db.rpc("assistant_take_turn");
        remaining = data ?? null;
      }
      const choice = completion.choices[0];
      if (completion.usage) {
        await db.rpc("assistant_add_usage", { p_input: completion.usage.prompt_tokens, p_output: completion.usage.completion_tokens });
      }
      if (!choice) break;

      const calls = (choice.message.tool_calls ?? []).filter(
        (call): call is OpenAI.Chat.ChatCompletionMessageFunctionToolCall => call.type === "function",
      );
      chat.messages.push({
        role: "assistant",
        content: choice.message.content ?? null,
        ...(calls.length ? { tool_calls: calls.map(({ id, type, function: fn }) => ({ id, type, function: fn })) } : {}),
      });

      if (choice.message.refusal || choice.finish_reason === "content_filter") {
        send({ type: "notice", message: t.siteAssistant.refused });
        break;
      }
      if (calls.length === 0) break;

      const results: ToolMessage[] = [];
      let awaiting: PendingTool | null = null;
      for (const call of calls) {
        let input: Record<string, unknown> | null = null;
        try {
          const parsed: unknown = JSON.parse(call.function.arguments || "{}");
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) input = parsed as Record<string, unknown>;
        } catch {
          // неполный или битый JSON
        }
        const tool: PendingTool = { id: call.id, name: call.function.name, input: input ?? {} };
        if (choice.finish_reason === "length" || !input) {
          results.push(errorMessageFor(tool.id, "Tool arguments were not valid JSON; call the tool again."));
        } else if (awaiting) {
          results.push(errorMessageFor(tool.id, "Not run: one action at a time."));
        } else if (tools.mutating.has(tool.name)) {
          awaiting = tool;
        } else {
          results.push(await runTool(tools, tool, send));
        }
      }
      if (awaiting) {
        // Результаты остальных инструментов шага уйдут модели вместе с решением пользователя.
        chat.pending = { tool: awaiting, results };
        send({ type: "confirm", confirm: { name: awaiting.name, input: awaiting.input } });
        break;
      }
      chat.messages.push(...results);
      if (step === MAX_STEPS - 1) send({ type: "notice", message: t.siteAssistant.tooManySteps });
    }
    send({ type: "done", remaining });
  } catch (error) {
    if (signal.aborted) return;
    console.error("[assistant] turn failed", error);
    send({ type: "error", message: apiErrorMessage(t, error) });
  } finally {
    await tools.close().catch(() => undefined);
    await saveChat(db, chat);
  }
}

function apiErrorMessage(t: Dictionary, error: unknown) {
  if (error instanceof OpenAI.APIError && (error.code === "unsupported_country_region_territory" || looksLikeRegionBlock(error.message))) {
    return t.siteAssistant.regionBlocked;
  }
  // Нехватка средств приходит как 429 — с кодом insufficient_quota или только текстом.
  if (
    error instanceof OpenAI.APIError &&
    (error.code === "insufficient_quota" || error.code === "billing_hard_limit_reached" || /no credits|billing|quota/i.test(error.message))
  ) {
    return t.siteAssistant.noCredits;
  }
  if (error instanceof OpenAI.RateLimitError) return t.siteAssistant.busy;
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) return t.siteAssistant.notConfigured;
  if (error instanceof OpenAI.APIError && (error.status ?? 0) >= 500) return t.siteAssistant.busy;
  return t.siteAssistant.failed;
}
