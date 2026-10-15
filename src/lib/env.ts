import { parseSupabaseUrl } from "./supabase-url";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Не задана переменная окружения ${name}. Скопируйте .env.example в .env.local и заполните значения (см. README).`,
    );
  }
  return value;
}

/** Заполнены ли обязательные переменные (без них показываем экран настройки). */
export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Геттеры: проверка выполняется при первом обращении, а не при импорте модуля.
export const env = {
  get supabaseUrl() {
    return parseSupabaseUrl(required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL))!
      .toString()
      .replace(/\/$/, "");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
};
