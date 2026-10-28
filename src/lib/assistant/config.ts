import "server-only";

/**
 * Модель ассистента на сайте — OpenAI Chat Completions (ключ OPENAI_API_KEY, модель
 * ASSISTANT_MODEL). OPENAI_BASE_URL — адрес совместимого шлюза вместо api.openai.com.
 */

export type AssistantProvider = { apiKey: string; baseURL?: string; model: string };

export function assistantProvider(): AssistantProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return { apiKey, baseURL: process.env.OPENAI_BASE_URL || undefined, model: process.env.ASSISTANT_MODEL || "gpt-5-mini" };
}

export function isAssistantConfigured() {
  return assistantProvider() !== null;
}
