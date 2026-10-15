#!/usr/bin/env node
/**
 * Назначает пользователя администратором (или модератором).
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/make-admin.mjs <username|email> [admin|moderator|user]
 *
 * Сервисный ключ нужен только этому скрипту и только на вашем компьютере —
 * не добавляйте его в переменные окружения сайта.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

// Подхватываем NEXT_PUBLIC_SUPABASE_URL из .env.local, если переменная не задана.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const [, , identifier, role = "admin"] = process.argv;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!identifier || !["admin", "moderator", "user"].includes(role)) {
  console.error("Использование: node scripts/make-admin.mjs <username|email> [admin|moderator|user]");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Нужны переменные NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let userId = null;
if (identifier.includes("@")) {
  for (let page = 1; page <= 50 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === identifier.toLowerCase())?.id ?? null;
    if (data.users.length < 200) break;
  }
} else {
  const { data } = await supabase.from("profiles").select("id").eq("username", identifier.toLowerCase()).maybeSingle();
  userId = data?.id ?? null;
}

if (!userId) {
  console.error(`Пользователь «${identifier}» не найден.`);
  process.exit(1);
}

const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
if (error) {
  console.error("Не удалось изменить роль:", error.message);
  process.exit(1);
}
console.log(`Готово: ${identifier} → ${role}`);
