import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Клиент Supabase от имени пользователя по access-токену из заголовка Authorization
 * (MCP-клиенты получают его через OAuth-сервер Supabase Auth). Как и cookie-клиент,
 * работает только в пределах прав пользователя — все запросы проходят через RLS.
 */
export function createTokenClient(accessToken: string) {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type TokenSupabase = ReturnType<typeof createTokenClient>;
