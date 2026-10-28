#!/usr/bin/env node
/**
 * Только для локальной разработки: https-адрес страницы входа для MCP-клиентов.
 *
 *   npm run dev:oauth-https        # https://localhost:3001/authorize
 *
 * Приложение Claude открывает страницу входа только по https, а локальный Supabase
 * отдаёт её по http. Скрипт принимает https://localhost:3001/authorize?... и
 * переадресует браузер на <Supabase>/auth/v1/oauth/authorize с теми же параметрами.
 * Сайт объявляет этот адрес, когда в .env.local задан MCP_OAUTH_AUTHORIZE_URL (см. README).
 *
 * Сертификат самоподписанный и создаётся в .certs/ при первом запуске: браузер
 * один раз предупредит о нём — «Дополнительно → Перейти на localhost».
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:https";

// Подхватываем переменные из .env.local, если они не заданы.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
if (!supabaseUrl) {
  console.error("Нужна переменная NEXT_PUBLIC_SUPABASE_URL (см. .env.example).");
  process.exit(1);
}
const port = Number(process.env.MCP_OAUTH_HTTPS_PORT ?? 3001);

const certDir = ".certs";
const keyFile = `${certDir}/localhost-key.pem`;
const certFile = `${certDir}/localhost.pem`;
if (!existsSync(keyFile) || !existsSync(certFile)) {
  mkdirSync(certDir, { recursive: true });
  execFileSync(
    "openssl",
    ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "825", "-subj", "/CN=localhost",
      "-addext", "subjectAltName=DNS:localhost", "-keyout", keyFile, "-out", certFile],
    { stdio: "ignore" },
  );
}

const authorizeUrl = `${supabaseUrl}/auth/v1/oauth/authorize`;

createServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, (request, response) => {
  const url = new URL(request.url ?? "/", `https://localhost:${port}`);
  if (request.method !== "GET" || url.pathname !== "/authorize") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(302, { Location: `${authorizeUrl}${url.search}`, "Cache-Control": "no-store" }).end();
}).listen(port, "localhost", () => {
  console.log(`Страница входа для MCP-клиентов: https://localhost:${port}/authorize → ${authorizeUrl}`);
});
