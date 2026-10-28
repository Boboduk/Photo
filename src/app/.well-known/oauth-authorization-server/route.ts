import { advertisedIssuer, authorizationServerIssuer, devAuthorizeUrl } from "@/lib/mcp/auth";
import { corsPreflight, withCors } from "@/lib/mcp/cors";

/**
 * RFC 8414 метаданные сервера авторизации на адресе сайта — для MCP-клиентов по спецификации
 * 2025-03-26, которые ищут их рядом с MCP-сервером. Документ берётся у Supabase Auth как есть;
 * при MCP_OAUTH_AUTHORIZE_URL (локальная разработка) — с https-адресом страницы входа.
 */
export async function GET(request: Request) {
  const issuer = new URL(authorizationServerIssuer);
  // Адрес по RFC 8414 и адрес внутри Auth API (так его отдаёт локальный Supabase).
  const candidates = [
    new URL(`/.well-known/oauth-authorization-server${issuer.pathname}`, issuer.origin),
    new URL(`${issuer.pathname}/.well-known/oauth-authorization-server`, issuer.origin),
  ];
  for (const url of candidates) {
    try {
      const response = await fetch(url, { next: { revalidate: 3600 } });
      if (response.ok) {
        const metadata = await response.json();
        if (devAuthorizeUrl) {
          metadata.issuer = advertisedIssuer(request);
          metadata.authorization_endpoint = devAuthorizeUrl;
        }
        return withCors(Response.json(metadata, { headers: { "Cache-Control": "public, max-age=3600" } }));
      }
    } catch {
      // Пробуем следующий адрес.
    }
  }
  return withCors(Response.json({ error: "not_found" }, { status: 404 }));
}

export const OPTIONS = corsPreflight;
