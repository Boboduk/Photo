import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Переменные из .env.local (если не заданы явно).
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  mailUrl: process.env.MAILPIT_URL ?? "http://127.0.0.1:54324",
};

export const fixture = (name: string) => path.join(__dirname, "fixtures", name);

export const runId = Date.now().toString(36);

export function serviceClient(): SupabaseClient {
  if (!env.serviceKey) throw new Error("Для тестов нужен SUPABASE_SERVICE_ROLE_KEY локального Supabase");
  return createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function anonClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Создаёт подтверждённого пользователя через Admin API и возвращает клиент с его сессией. */
export async function createUser(
  username: string,
  profileType: "photographer" | "model" | "both" = "photographer",
): Promise<{ id: string; email: string; password: string; client: SupabaseClient }> {
  const email = `${username}@e2e.frame.test`;
  const password = "e2e-password-123";
  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: `E2E ${username}`, profile_type: profileType },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, password, client };
}

type MailSummary = { ID: string; Subject: string; To: { Address: string }[]; Created: string };

/** Ждёт письмо в локальном почтовом ящике (Mailpit) и возвращает ссылку /auth/confirm из него. */
export async function waitForAuthLink(email: string, subjectIncludes: string): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${env.mailUrl}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    if (response.ok) {
      const data = (await response.json()) as { messages: MailSummary[] };
      const message = data.messages.find((m) => m.Subject.includes(subjectIncludes));
      if (message) {
        const full = (await (await fetch(`${env.mailUrl}/api/v1/message/${message.ID}`)).json()) as { HTML: string; Text: string };
        const html = full.HTML || full.Text;
        const match = html.match(/href="([^"]*\/auth\/(?:confirm|v1\/verify)[^"]*)"/);
        if (match) return match[1].replace(/&amp;/g, "&");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Письмо «${subjectIncludes}» для ${email} не пришло`);
}

export async function registerViaUi(
  page: Page,
  opts: { name: string; username: string; email: string; password: string; type: "Фотограф" | "Модель" | "Фотограф и модель" },
) {
  await page.goto("/register");
  await page.getByText(opts.type, { exact: true }).click();
  await page.getByLabel("Имя или творческий псевдоним").fill(opts.name);
  await page.getByLabel("Адрес профиля").fill(opts.username);
  await page.getByLabel("Электронная почта").fill(opts.email);
  await page.getByLabel("Пароль", { exact: true }).fill(opts.password);
  await page.getByLabel(/Я принимаю/).check();
  await page.getByLabel(/Даю согласие/).check();
  await page.getByLabel(/Мне исполнилось/).check();
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page.getByRole("heading", { name: "Подтвердите почту" })).toBeVisible();

  const link = await waitForAuthLink(opts.email, "Подтвердите почту");
  await page.goto(link);
  await expect(page).toHaveURL(/\/welcome/);
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
