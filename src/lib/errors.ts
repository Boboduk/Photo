import type { Dictionary } from "@/i18n/dictionaries";

type ErrorLike = { message?: string; code?: string } | null | undefined;

/**
 * Переводит ошибку базы данных или Supabase в понятное сообщение.
 * Функции БД выбрасывают исключения с кодами вида 'rate_limited', 'already_applied'.
 */
export function errorMessage(t: Dictionary, error: ErrorLike): string {
  if (!error) return t.errors.generic;
  const message = error.message ?? "";
  const known = Object.keys(t.errors) as (keyof Dictionary["errors"])[];
  const key = known.find((k) => message === k || message.startsWith(`${k}:`));
  if (key) return t.errors[key];
  if (error.code === "23505" && message.includes("username")) return t.errors.username_taken;
  if (error.code === "42501") return t.errors.forbidden;
  if (error.code === "PGRST116") return t.errors.not_found;
  return t.errors.generic;
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Повторно подставляем значения в форму после ошибки */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};
