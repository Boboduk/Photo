import { expect, test } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { anonClient, createUser, env, fixture, runId } from "./helpers";

/**
 * Примерочная и MCP-сервер:
 * - права доступа к приватным моделям, нарядам и образам (RLS и Storage);
 * - модели платформы, открывшие фото для примерки (согласие, права, блокировки);
 * - полный вход MCP-клиента через OAuth 2.1 сервер Supabase Auth и вызовы инструментов.
 * Генерация проверяется, если приложение запущено с TRYON_PROVIDER=mock (или с ключом OpenAI).
 */

const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const issuer = `${env.supabaseUrl}/auth/v1`;
const redirectUri = "http://localhost:9999/callback";

async function mcp(token: string | null, method: string, params: Record<string, unknown> = {}) {
  const response = await fetch(`${appUrl}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await response.text();
  const payload = (response.headers.get("content-type") ?? "").includes("text/event-stream")
    ? text
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean)
        .at(-1)
    : text;
  return { status: response.status, headers: response.headers, body: payload ? JSON.parse(payload) : null };
}

type ToolResult = { isError?: boolean; content: { type: string; text?: string; data?: string; mimeType?: string }[] };

async function callTool(token: string, name: string, args: Record<string, unknown> = {}) {
  const { body } = await mcp(token, "tools/call", { name, arguments: args });
  const result = body.result as ToolResult;
  const first = result.content[0];
  return { result, json: !result.isError && first?.type === "text" ? JSON.parse(first.text ?? "null") : null };
}

test.describe.serial("Примерочная и MCP", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let stranger: Awaited<ReturnType<typeof createUser>>;
  let modelId = "";
  let garmentId = "";
  let modelPath = "";
  let accessToken = "";
  let clientId = "";

  test.beforeAll(async () => {
    owner = await createUser(`to_${runId}`, "model");
    stranger = await createUser(`ts_${runId}`, "photographer");
  });

  test("файлы примерочной приватны и пишутся только в свою папку", async () => {
    modelPath = `${owner.id}/models/${randomUUID()}.jpg`;
    const garmentPath = `${owner.id}/garments/${randomUUID()}.jpg`;
    const bytes = readFileSync(fixture("portrait-1.jpg"));
    expect((await owner.client.storage.from("tryon").upload(modelPath, bytes, { contentType: "image/jpeg" })).error).toBeNull();
    const garmentBytes = readFileSync(fixture("street-1.jpg"));
    expect((await owner.client.storage.from("tryon").upload(garmentPath, garmentBytes, { contentType: "image/jpeg" })).error).toBeNull();

    const foreign = await stranger.client.storage.from("tryon").upload(`${owner.id}/models/${randomUUID()}.jpg`, bytes, { contentType: "image/jpeg" });
    expect(foreign.error).not.toBeNull();
    expect((await stranger.client.storage.from("tryon").download(modelPath)).error).not.toBeNull();
    expect((await anonClient().storage.from("tryon").download(modelPath)).error).not.toBeNull();
    const publicUrl = await fetch(`${env.supabaseUrl}/storage/v1/object/public/tryon/${modelPath}`);
    expect(publicUrl.status).toBeGreaterThanOrEqual(400);

    const { data: model, error } = await owner.client
      .from("tryon_models")
      .insert({ name: "Модель", storage_path: modelPath, width: 800, height: 1200 })
      .select("id")
      .single();
    expect(error).toBeNull();
    modelId = model!.id;
    const { data: garment } = await owner.client
      .from("tryon_garments")
      .insert({ name: "Куртка", category: "outerwear", storage_path: garmentPath, width: 800, height: 800 })
      .select("id")
      .single();
    garmentId = garment!.id;
  });

  test("чужие модели, наряды и образы недоступны", async () => {
    expect((await stranger.client.from("tryon_models").select("id").eq("id", modelId)).data).toEqual([]);
    expect((await stranger.client.from("tryon_garments").select("id").eq("id", garmentId)).data).toEqual([]);
    const { error } = await stranger.client.from("tryon_results").insert({ model_id: modelId, garment_ids: [garmentId] });
    expect(error).not.toBeNull();
    const { data: deleted } = await stranger.client.from("tryon_models").delete().eq("id", modelId).select("id");
    expect(deleted).toEqual([]);

    // Владельца и путь к файлу подменить нельзя
    const spoof = await owner.client.from("tryon_models").insert({ name: "x", storage_path: `${owner.id}/models/a.jpg`, owner_id: stranger.id });
    expect(spoof.error?.code).toBe("42501");
    const outside = await owner.client.from("tryon_models").insert({ name: "x", storage_path: `${stranger.id}/models/a.jpg` });
    expect(outside.error).not.toBeNull();
  });

  test("MCP без токена отвечает 401 и указывает, где авторизоваться", async () => {
    const { status, headers } = await mcp(null, "tools/list");
    expect(status).toBe(401);
    const challenge = headers.get("www-authenticate") ?? "";
    const metadataUrl = challenge.match(/resource_metadata="([^"]+)"/)?.[1];
    expect(metadataUrl).toBeTruthy();
    const metadata = await (await fetch(metadataUrl!)).json();
    // С MCP_OAUTH_AUTHORIZE_URL (локальный https-вход) сервером авторизации объявлен сам сайт.
    const advertised = process.env.MCP_OAUTH_AUTHORIZE_URL ? new URL(metadataUrl!).origin : issuer;
    expect(metadata.authorization_servers).toEqual([advertised]);

    expect((await mcp("not-a-token", "tools/list")).status).toBe(401);
    expect((await mcp(env.anonKey, "tools/list")).status).toBe(401);
  });

  test("MCP-клиент входит через OAuth: регистрация, согласие, обмен кода", async () => {
    const registration = await fetch(`${issuer}/oauth/clients/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: `E2E MCP ${runId}`, redirect_uris: [redirectUri], token_endpoint_auth_method: "none" }),
    });
    expect(registration.ok).toBe(true);
    clientId = (await registration.json()).client_id;

    const verifier = randomBytes(32).toString("base64url");
    const authorize = new URL(`${issuer}/oauth/authorize`);
    Object.entries({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
      state: "e2e",
    }).forEach(([key, value]) => authorize.searchParams.set(key, value));
    const redirect = await fetch(authorize, { redirect: "manual" });
    const consent = new URL(redirect.headers.get("location") ?? "", appUrl);
    expect(consent.pathname).toBe("/oauth/consent");

    // То же, что делает страница согласия: показывает запрос, затем «Разрешить доступ»
    const authorizationId = consent.searchParams.get("authorization_id")!;
    const { data: details } = await owner.client.auth.oauth.getAuthorizationDetails(authorizationId);
    expect(details && "client" in details ? details.client.name : null).toBe(`E2E MCP ${runId}`);
    const { data: approved, error } =await owner.client.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true });
    expect(error).toBeNull();
    const code = new URL(approved!.redirect_url).searchParams.get("code")!;

    const token = await fetch(`${issuer}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier }),
    });
    expect(token.ok).toBe(true);
    accessToken = (await token.json()).access_token;
  });

  test("инструменты MCP работают от имени пользователя", async () => {
    const init = await mcp(accessToken, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "e2e", version: "1" },
    });
    expect(init.body.result.serverInfo.name).toBe("frame");

    const { body } = await mcp(accessToken, "tools/list");
    const names = (body.result.tools as { name: string }[]).map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(["search_people", "search_portfolio", "search_projects", "tryon_list", "tryon_generate"]));

    expect((await callTool(accessToken, "whoami")).json.username).toBe(`to_${runId}`);
    expect(typeof (await callTool(accessToken, "search_people", { kind: "model", limit: 3 })).json.total).toBe("number");

    const studio = (await callTool(accessToken, "tryon_list")).json;
    expect(studio.models.map((m: { id: string }) => m.id)).toEqual([modelId]);
    expect(studio.garments.map((g: { id: string }) => g.id)).toEqual([garmentId]);

    // Чужая модель через MCP не находится
    const { data: strangerSession } = await stranger.client.auth.getSession();
    const foreign = await callTool(strangerSession.session!.access_token, "tryon_generate", { model_id: modelId, garment_ids: [garmentId] });
    expect(foreign.result.isError).toBe(true);
  });

  test("tryon_generate создаёт образ в приватном бакете", async () => {
    const { result, json } = await callTool(accessToken, "tryon_generate", { model_id: modelId, garment_ids: [garmentId] });
    const message = result.content[0]?.text ?? "";
    test.skip(message.startsWith("not_configured"), "Генерация не настроена: запустите приложение с TRYON_PROVIDER=mock");
    expect(result.isError ?? false).toBe(false);
    expect(result.content.find((block) => block.type === "image")?.mimeType).toBe("image/jpeg");

    const file = await fetch(json.url);
    expect(file.status).toBe(200);
    const { data: row } = await owner.client.from("tryon_results").select("status, storage_path").eq("id", json.look_id).single();
    expect(row?.status).toBe("succeeded");
    expect(row?.storage_path?.startsWith(`${owner.id}/results/`)).toBe(true);
    expect((await stranger.client.storage.from("tryon").download(row!.storage_path!)).error).not.toBeNull();
  });

  test("после отзыва доступа токен MCP-клиента перестаёт работать", async () => {
    const { data: grants } = await owner.client.auth.oauth.listGrants();
    expect(grants?.some((grant) => grant.client.id === clientId)).toBe(true);
    expect((await owner.client.auth.oauth.revokeGrant({ clientId })).error).toBeNull();
    expect((await mcp(accessToken, "tools/list")).status).toBe(401);
  });

  test("модель платформы открывает фото для примерки, только если она сама модель", async () => {
    // Фотограф не может открыть своё фото для других
    const ownPath = `${stranger.id}/models/${randomUUID()}.jpg`;
    await stranger.client.storage.from("tryon").upload(ownPath, readFileSync(fixture("portrait-2.jpg")), { contentType: "image/jpeg" });
    const { data: own } = await stranger.client
      .from("tryon_models")
      .insert({ name: "Фото", storage_path: ownPath, width: 800, height: 1200 })
      .select("id")
      .single();
    expect((await stranger.client.from("tryon_models").update({ is_shared: true }).eq("id", own!.id)).error).not.toBeNull();

    const { data: shared, error } = await owner.client
      .from("tryon_models")
      .update({ is_shared: true })
      .eq("id", modelId)
      .select("is_shared, shared_at")
      .single();
    expect(error).toBeNull();
    expect(shared?.shared_at).toBeTruthy();

    // Другие участники видят фото и могут скачать его для генерации…
    expect((await stranger.client.from("tryon_models").select("id").eq("id", modelId)).data).toHaveLength(1);
    expect((await stranger.client.storage.from("tryon").download(modelPath)).error).toBeNull();
    // …но не меняют и не удаляют его; наряды и образы модели по-прежнему закрыты
    expect((await stranger.client.from("tryon_models").update({ name: "x" }).eq("id", modelId).select("id")).data).toEqual([]);
    expect((await stranger.client.from("tryon_models").delete().eq("id", modelId).select("id")).data).toEqual([]);
    expect((await stranger.client.from("tryon_garments").select("id").eq("id", garmentId)).data).toEqual([]);
    // Гостям фото не доступно
    expect((await anonClient().from("tryon_models").select("id").eq("id", modelId)).data ?? []).toEqual([]);
  });

  test("модель платформы доступна в MCP, образ видит только его автор", async () => {
    const garmentPath = `${stranger.id}/garments/${randomUUID()}.jpg`;
    await stranger.client.storage.from("tryon").upload(garmentPath, readFileSync(fixture("street-1.jpg")), { contentType: "image/jpeg" });
    const { data: garment } = await stranger.client
      .from("tryon_garments")
      .insert({ name: "Пальто", category: "outerwear", storage_path: garmentPath, width: 800, height: 800 })
      .select("id")
      .single();

    const { data: session } = await stranger.client.auth.getSession();
    const token = session.session!.access_token;
    const studio = (await callTool(token, "tryon_list")).json;
    expect(studio.platform_models.map((m: { id: string }) => m.id)).toContain(modelId);

    const { result, json } = await callTool(token, "tryon_generate", { model_id: modelId, garment_ids: [garment!.id] });
    test.skip((result.content[0]?.text ?? "").startsWith("not_configured"), "Генерация не настроена: запустите приложение с TRYON_PROVIDER=mock");
    expect(result.isError ?? false).toBe(false);
    expect((await owner.client.from("tryon_results").select("id").eq("id", json.look_id)).data).toEqual([]);
    const { data: row } = await stranger.client.from("tryon_results").select("storage_path").eq("id", json.look_id).single();
    expect(row?.storage_path?.startsWith(`${stranger.id}/results/`)).toBe(true);
  });

  test("закрытый доступ и блокировка скрывают модель", async () => {
    await owner.client.from("tryon_models").update({ is_shared: false }).eq("id", modelId);
    expect((await stranger.client.from("tryon_models").select("id").eq("id", modelId)).data).toEqual([]);
    expect((await stranger.client.storage.from("tryon").download(modelPath)).error).not.toBeNull();

    await owner.client.from("tryon_models").update({ is_shared: true }).eq("id", modelId);
    await owner.client.from("user_blocks").insert({ blocked_id: stranger.id });
    expect((await stranger.client.from("tryon_models").select("id").eq("id", modelId)).data).toEqual([]);
    const { error } = await stranger.client.from("tryon_results").insert({ model_id: modelId, garment_ids: [garmentId] });
    expect(error).not.toBeNull();
  });
});
