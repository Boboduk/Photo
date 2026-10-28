import { protectedResourceMetadata } from "@/lib/mcp/auth";
import { corsPreflight, withCors } from "@/lib/mcp/cors";

/**
 * RFC 9728 Protected Resource Metadata для MCP-сервера: /.well-known/oauth-protected-resource/api/mcp
 * (и корневой вариант без пути). Сообщает клиенту, какой сервер авторизации выдаёт токены.
 */
export function GET(request: Request) {
  return withCors(Response.json(protectedResourceMetadata(request), { headers: { "Cache-Control": "public, max-age=3600" } }));
}

export const OPTIONS = corsPreflight;
