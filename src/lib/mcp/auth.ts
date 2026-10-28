import "server-only";

import {
  OAuthError,
  OAuthErrorCode,
  getOAuthProtectedResourceMetadataUrl,
  requireBearerAuth,
  type AuthInfo,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import { brand } from "@/config/brand";
import { env } from "@/lib/env";
import { createTokenClient } from "@/lib/supabase/token";

/**
 * Авторизация MCP-сервера. Сервером авторизации выступает OAuth 2.1 сервер
 * Supabase Auth: MCP-клиент регистрируется, пользователь входит и даёт согласие
 * на странице /oauth/consent, а клиент получает обычный access-токен Supabase.
 * Здесь токен только проверяется — сервисный ключ не нужен.
 */

export const MCP_PATH = "/api/mcp";

/** Издатель токенов — Supabase Auth проекта. */
export const authorizationServerIssuer = `${env.supabaseUrl.replace(/\/$/, "")}/auth/v1`;

/**
 * Только для локальной разработки: https-адрес страницы входа (scripts/oauth-https-redirect.mjs).
 * Приложение Claude открывает вход только по https, а локальный Supabase отдаёт его по http.
 * Если адрес задан, сервером авторизации для клиентов объявляется сам сайт: его метаданные —
 * документ Supabase с подменёнными issuer и authorization_endpoint. Токены по-прежнему выдаёт Supabase.
 */
export const devAuthorizeUrl = process.env.MCP_OAUTH_AUTHORIZE_URL || null;

/** Сервер авторизации, который видят MCP-клиенты. */
export function advertisedIssuer(request: Request) {
  return devAuthorizeUrl ? new URL(request.url).origin : authorizationServerIssuer;
}

export type McpAuthInfo = AuthInfo & { extra: { userId: string } };

const invalidToken = () => new OAuthError(OAuthErrorCode.InvalidToken, "Invalid or expired access token");

const supabaseTokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const auth = createTokenClient(token).auth;
    // getClaims проверяет подпись и срок действия; getUser — что сеанс ещё жив на Auth-сервере:
    // после «Отключить» в настройках доступ пропадает сразу, а не когда истечёт токен.
    const [{ data, error }, { data: session, error: sessionError }] = await Promise.all([auth.getClaims(token), auth.getUser(token)]);
    const claims = data?.claims;
    if (error || sessionError || session.user?.id !== claims?.sub) throw invalidToken();
    if (!claims?.sub || claims.role !== "authenticated" || typeof claims.exp !== "number") throw invalidToken();
    const scope = typeof claims.scope === "string" ? claims.scope : "";
    const clientId = typeof claims.client_id === "string" ? claims.client_id : "frame";
    return {
      token,
      clientId,
      scopes: scope.split(" ").filter(Boolean),
      expiresAt: claims.exp,
      extra: { userId: claims.sub },
    } satisfies McpAuthInfo;
  },
};

/** Публичный адрес MCP-сервера — тот, по которому к нему обратился клиент. */
export function mcpResourceUrl(request: Request) {
  return new URL(MCP_PATH, new URL(request.url).origin);
}

export function authenticateMcpRequest(request: Request) {
  return requireBearerAuth({
    verifier: supabaseTokenVerifier,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpResourceUrl(request)),
  })(request);
}

/** RFC 9728: где MCP-клиенту получить токен для этого сервера. */
export function protectedResourceMetadata(request: Request) {
  const origin = new URL(request.url).origin;
  return {
    resource: mcpResourceUrl(request).href,
    authorization_servers: [advertisedIssuer(request)],
    bearer_methods_supported: ["header"],
    resource_name: brand.name,
    resource_documentation: `${origin}/dashboard/settings#assistants`,
  };
}

export function isMcpAuthInfo(auth: AuthInfo | undefined): auth is McpAuthInfo {
  return typeof auth?.extra?.userId === "string";
}
