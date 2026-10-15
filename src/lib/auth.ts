import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

export type CurrentUser = {
  id: string;
  email: string | undefined;
  profile: Profile;
};

/**
 * Текущий пользователь (или null). getUser() проверяет токен на сервере Auth,
 * поэтому результату можно доверять. Кэшируется в пределах одного запроса.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;

  return { id: user.id, email: user.email, profile };
});

/** Требует авторизации; заблокированных отправляет на страницу с объяснением. */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  if (user.profile.banned_at) {
    redirect("/banned");
  }
  return user;
}

export function isStaff(profile: Pick<Profile, "role" | "banned_at">) {
  return !profile.banned_at && (profile.role === "moderator" || profile.role === "admin");
}

/** Доступ к админке. Для остальных раздел выглядит как несуществующий. */
export async function requireModerator(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isStaff(user.profile)) notFound();
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireModerator();
  if (user.profile.role !== "admin") notFound();
  return user;
}
