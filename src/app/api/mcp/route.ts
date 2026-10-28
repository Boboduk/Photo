import { createMcpHandler } from "@modelcontextprotocol/server";
import { authenticateMcpRequest, isMcpAuthInfo } from "@/lib/mcp/auth";
import { corsPreflight, withCors } from "@/lib/mcp/cors";
import { createFrameMcpServer } from "@/lib/mcp/server";

/**
 * MCP-сервер FRAME (Streamable HTTP, спецификация 2026-07-28 и stateless-режим для клиентов 2025 года).
 * Подключение: https://<сайт>/api/mcp — вход через OAuth Supabase Auth, см. README.
 */

// tryon_generate ждёт ответа модели генерации до минуты.
export const maxDuration = 120;

const handler = createMcpHandler(
  ({ authInfo }) => {
    if (!isMcpAuthInfo(authInfo)) throw new Error("MCP request without verified auth");
    return createFrameMcpServer(authInfo);
  },
  { onerror: (error) => console.error("[mcp]", error) },
);

async function serve(request: Request) {
  const auth = await authenticateMcpRequest(request);
  // 401 с WWW-Authenticate: resource_metadata=... — по нему клиент находит сервер авторизации.
  if (auth instanceof Response) return withCors(auth);
  return withCors(await handler.fetch(request, { authInfo: auth }));
}

export { serve as GET, serve as POST, serve as DELETE };
export const OPTIONS = corsPreflight;
