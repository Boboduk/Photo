/** Ассистент FRAME на сайте: то, что видит пользователь, и события потока ответа. */

export type AssistantItem =
  { kind: "user"; text: string } | { kind: "assistant"; text: string } | { kind: "tool"; name: string } | { kind: "image"; url: string };

/** Действие, которое ассистент хочет выполнить и которое пользователь должен подтвердить. */
export type AssistantConfirm = { name: string; input: Record<string, unknown> };

export type AssistantChatView = {
  id: string | null;
  items: AssistantItem[];
  confirm: AssistantConfirm | null;
};

/** События ответа: сервер отдаёт их построчно (NDJSON). */
export type AssistantEvent =
  | { type: "chat"; id: string }
  | { type: "text"; delta: string }
  | { type: "tool"; name: string }
  | { type: "image"; url: string }
  | { type: "confirm"; confirm: AssistantConfirm }
  | { type: "notice"; message: string }
  | { type: "error"; message: string }
  | { type: "done"; remaining: number | null };

export const ASSISTANT_MESSAGE_MAX = 2000;
