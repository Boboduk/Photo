/**
 * Проверяет NEXT_PUBLIC_SUPABASE_URL. Используется и в next.config.ts, и в рантайме,
 * чтобы опечатка в .env.local давала понятную ошибку, а не падение где-то глубоко.
 */
export function parseSupabaseUrl(value: string | undefined): URL | null {
  const raw = value?.trim();
  if (!raw) return null;
  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL задан неверно: "${raw}". ` +
        "Ожидается адрес вида http://127.0.0.1:54321 (локальный Supabase) или https://<project-ref>.supabase.co.",
    );
  }
  return url;
}
