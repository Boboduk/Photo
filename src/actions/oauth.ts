"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import type { ActionResult } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Решение пользователя по запросу доступа MCP-клиента (OAuth 2.1 сервер Supabase Auth).
 * Supabase возвращает адрес клиента с кодом авторизации (или ошибкой access_denied),
 * браузер переходит по нему сам.
 */
export async function decideOAuthAction(authorizationId: string, approve: boolean): Promise<ActionResult<{ url: string }>> {
  const t = await getT();
  if (!z.string().min(1).max(512).safeParse(authorizationId).success) return { ok: false, error: t.oauth.invalid };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  if (user.profile.banned_at) return { ok: false, error: t.errors.account_banned };

  const supabase = await createClient();
  const options = { skipBrowserRedirect: true };
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, options)
    : await supabase.auth.oauth.denyAuthorization(authorizationId, options);
  if (error || !data?.redirect_url) return { ok: false, error: t.oauth.invalid };
  return { ok: true, data: { url: data.redirect_url } };
}

export async function revokeOAuthGrantAction(clientId: string): Promise<ActionResult> {
  const t = await getT();
  if (!z.uuid().safeParse(clientId).success) return { ok: false, error: t.errors.not_found };
  const supabase = await createClient();
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
  if (error) return { ok: false, error: t.errors.generic };
  revalidatePath("/dashboard/settings");
  return { ok: true, message: t.assistants.revoked };
}
