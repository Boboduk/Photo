"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { isStaff } from "@/lib/auth";
import { APP_ROLES, REPORT_STATUSES } from "@/lib/constants";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { BUCKETS } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

/**
 * Каждое действие повторно проверяет роль на сервере. Те же проверки выполняют
 * функции базы данных (admin_*), поэтому обойти их прямым запросом нельзя.
 */
async function staff(requireAdmin = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, banned_at").eq("id", user.id).single();
  if (!profile || !isStaff(profile)) return null;
  if (requireAdmin && profile.role !== "admin") return null;
  return { supabase, user, role: profile.role };
}

const id = z.uuid();
const contentType = z.enum(["portfolio_item", "project"]);

export async function setUserBanAction(userId: string, banned: boolean, reason?: string): Promise<ActionResult> {
  const t = await getT();
  const ctx = await staff();
  if (!ctx) return { ok: false, error: t.errors.forbidden };
  if (!id.safeParse(userId).success) return { ok: false, error: t.errors.user_not_found };
  const { error } = await ctx.supabase.rpc("admin_set_user_ban", {
    p_user: userId,
    p_banned: banned,
    p_reason: reason?.slice(0, 500),
  });
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: banned ? t.admin.banned : t.admin.unbanned };
}

export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  const t = await getT();
  const ctx = await staff(true);
  if (!ctx) return { ok: false, error: t.errors.forbidden };
  const parsed = z.enum(APP_ROLES).safeParse(role);
  if (!id.safeParse(userId).success || !parsed.success) return { ok: false, error: t.validation.invalidValue };
  const { error } = await ctx.supabase.rpc("admin_set_user_role", { p_user: userId, p_role: parsed.data });
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/admin/users");
  return { ok: true, message: t.admin.roleChanged };
}

export async function setContentHiddenAction(type: string, contentId: string, hidden: boolean, reason?: string): Promise<ActionResult> {
  const t = await getT();
  const ctx = await staff();
  if (!ctx) return { ok: false, error: t.errors.forbidden };
  const parsedType = contentType.safeParse(type);
  if (!parsedType.success || !id.safeParse(contentId).success) return { ok: false, error: t.validation.invalidValue };
  const { error } = await ctx.supabase.rpc("admin_set_content_hidden", {
    p_type: parsedType.data,
    p_id: contentId,
    p_hidden: hidden,
    p_reason: reason?.slice(0, 500),
  });
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/admin", "layout");
  revalidatePath(parsedType.data === "project" ? `/projects/${contentId}` : `/portfolio/${contentId}`);
  return { ok: true, message: hidden ? t.admin.hidden : t.admin.restored };
}

export async function deleteContentAction(type: string, contentId: string): Promise<ActionResult> {
  const t = await getT();
  const ctx = await staff();
  if (!ctx) return { ok: false, error: t.errors.forbidden };
  const parsedType = contentType.safeParse(type);
  if (!parsedType.success || !id.safeParse(contentId).success) return { ok: false, error: t.validation.invalidValue };
  const { data: paths, error } = await ctx.supabase.rpc("admin_delete_content", { p_type: parsedType.data, p_id: contentId });
  if (error) return { ok: false, error: errorMessage(t, error) };
  // Файлы нарушающего контента удаляются из хранилища (политика Storage разрешает это модераторам).
  if (paths && paths.length > 0) {
    await ctx.supabase.storage.from(BUCKETS.media).remove(paths);
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/portfolio");
  revalidatePath("/projects");
  return { ok: true, message: t.admin.contentDeleted };
}

export async function resolveReportAction(reportId: string, status: string, note?: string): Promise<ActionResult> {
  const t = await getT();
  const ctx = await staff();
  if (!ctx) return { ok: false, error: t.errors.forbidden };
  const parsed = z.enum(REPORT_STATUSES).safeParse(status);
  if (!id.safeParse(reportId).success || !parsed.success) return { ok: false, error: t.validation.invalidValue };
  const { error } = await ctx.supabase.rpc("admin_resolve_report", {
    p_report: reportId,
    p_status: parsed.data,
    p_note: note?.slice(0, 1000),
  });
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: t.admin.reportUpdated };
}

const categorySchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/),
  name: z.string().trim().min(1).max(60),
  name_en: z.string().trim().max(60).optional(),
  sort_order: z.coerce.number().int().min(0).max(10000),
  for_photographers: z.boolean(),
  for_models: z.boolean(),
  for_works: z.boolean(),
  is_active: z.boolean(),
});

export async function saveCategoryAction(input: z.input<typeof categorySchema>, isNew: boolean): Promise<ActionResult> {
  const t = await getT();
  const ctx = await staff(true);
  if (!ctx) return { ok: false, error: t.errors.forbidden };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.validation.invalidValue };
  const { name_en, ...data } = parsed.data;
  const row = { ...data, translations: name_en ? { en: name_en } : {} };
  const { error } = isNew
    ? await ctx.supabase.from("categories").insert(row)
    : await ctx.supabase.from("categories").update(row).eq("slug", data.slug);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/", "layout");
  return { ok: true, message: t.admin.categorySaved };
}

export async function deleteCategoryAction(slug: string): Promise<ActionResult> {
  const t = await getT();
  const ctx = await staff(true);
  if (!ctx) return { ok: false, error: t.errors.forbidden };
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return { ok: false, error: t.validation.invalidValue };
  const { error } = await ctx.supabase.from("categories").delete().eq("slug", slug);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/", "layout");
  return { ok: true, message: t.admin.categoryDeleted };
}
