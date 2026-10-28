/**
 * CORS для MCP-эндпоинта и документов обнаружения. Доступ даёт только токен
 * в заголовке Authorization (cookie не используются), поэтому любой Origin безопасен —
 * это нужно браузерным MCP-клиентам.
 */
export const MCP_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  // Authorization не покрывается «*» и указывается явно.
  "Access-Control-Allow-Headers": "Authorization, *",
  "Access-Control-Expose-Headers": "*",
  "Access-Control-Max-Age": "86400",
} as const;

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(MCP_CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: MCP_CORS_HEADERS });
}
