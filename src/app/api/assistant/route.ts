import { z } from "zod";
import { getT } from "@/i18n/server";
import { latestChatView, runAssistantTurn } from "@/lib/assistant/agent";
import { isAssistantConfigured } from "@/lib/assistant/config";
import { ASSISTANT_MESSAGE_MAX, type AssistantEvent } from "@/lib/assistant/types";
import type { McpAuthInfo } from "@/lib/mcp/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Ассистент FRAME на сайте (только для вошедших пользователей).
 * GET — последний диалог; POST — сообщение или решение по действию, ответ потоком NDJSON.
 */

// Несколько шагов модели и генерация образа (до минуты) за один запрос.
export const maxDuration = 300;

const turnSchema = z.union([
  z.object({ chatId: z.uuid().nullable(), message: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX) }),
  z.object({ chatId: z.uuid(), approve: z.boolean() }),
]);

async function authorized() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // Пользователь проверен getUser(); токен сессии нужен инструментам MCP-сервера.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return { supabase, userId: user.id, token: session.access_token };
}

export async function GET() {
  const t = await getT();
  const auth = await authorized();
  if (!auth) return Response.json({ error: t.errors.not_authenticated }, { status: 401 });
  return Response.json(await latestChatView(auth.supabase), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const t = await getT();
  const auth = await authorized();
  if (!auth) return Response.json({ error: t.errors.not_authenticated }, { status: 401 });
  if (!isAssistantConfigured()) return Response.json({ error: t.siteAssistant.notConfigured }, { status: 503 });
  const parsed = turnSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: t.errors.generic }, { status: 400 });

  const mcpAuth: McpAuthInfo = { token: auth.token, clientId: "frame-site", scopes: [], extra: { userId: auth.userId } };
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Браузер закрыл соединение — ответ всё равно сохранится в истории.
        }
      };
      await runAssistantTurn({ db: auth.supabase, auth: mcpAuth, t, signal: request.signal }, parsed.data, send);
      try {
        controller.close();
      } catch {
        // уже закрыт
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
