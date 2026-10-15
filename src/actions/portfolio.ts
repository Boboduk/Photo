"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { BUCKETS, isOwnStoragePath, publicStorageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { translateIssues } from "@/lib/validation/common";
import { portfolioItemSchema, type PortfolioItemInput } from "@/lib/validation/portfolio";

const id = z.uuid();

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidatePortfolio(itemId?: string) {
  revalidatePath("/dashboard/portfolio");
  revalidatePath("/portfolio");
  if (itemId) revalidatePath(`/portfolio/${itemId}`);
}

export async function createPortfolioItemAction(input: PortfolioItemInput): Promise<ActionResult<{ id: string }>> {
  const t = await getT();
  const parsed = portfolioItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.generic, fieldErrors: translateIssues(t, parsed.error) };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const data = parsed.data;

  const newImages = data.images.filter((image) => image.kind === "new");
  if (newImages.length !== data.images.length || newImages.some((image) => !isOwnStoragePath(user.id, image.storage_path))) {
    return { ok: false, error: t.errors.forbidden };
  }

  // Новая работа встаёт в начало портфолио.
  const { data: first } = await supabase
    .from("portfolio_items")
    .select("position")
    .eq("owner_id", user.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: item, error } = await supabase
    .from("portfolio_items")
    .insert({
      title: data.title,
      description: data.description,
      category_slug: data.category_slug,
      shot_on: data.shot_on,
      is_published: data.is_published,
      position: (first?.position ?? 1) - 1,
    })
    .select("id")
    .single();
  if (error || !item) return { ok: false, error: errorMessage(t, error) };

  const result = await writeRelations(supabase, item.id, data, []);
  if (!result.ok) {
    await supabase.from("portfolio_items").delete().eq("id", item.id);
    return result;
  }

  revalidatePortfolio(item.id);
  return { ok: true, data: { id: item.id }, message: t.dashboardPortfolio.created };
}

export async function updatePortfolioItemAction(
  itemId: string,
  input: PortfolioItemInput,
): Promise<ActionResult<{ id: string }>> {
  const t = await getT();
  if (!id.safeParse(itemId).success) return { ok: false, error: t.errors.not_found };
  const parsed = portfolioItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.generic, fieldErrors: translateIssues(t, parsed.error) };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const data = parsed.data;

  const { data: existing } = await supabase
    .from("portfolio_items")
    .select("id, owner_id, images:portfolio_images(id, storage_path), credits:portfolio_credits(id, profile_id, name, role)")
    .eq("id", itemId)
    .maybeSingle();
  if (!existing || existing.owner_id !== user.id) return { ok: false, error: t.errors.forbidden };

  for (const image of data.images) {
    if (image.kind === "new" && !isOwnStoragePath(user.id, image.storage_path)) {
      return { ok: false, error: t.errors.forbidden };
    }
    if (image.kind === "existing" && !existing.images.some((current) => current.id === image.id)) {
      return { ok: false, error: t.errors.forbidden };
    }
  }

  const { error } = await supabase
    .from("portfolio_items")
    .update({
      title: data.title,
      description: data.description,
      category_slug: data.category_slug,
      shot_on: data.shot_on,
      is_published: data.is_published,
    })
    .eq("id", itemId);
  if (error) return { ok: false, error: errorMessage(t, error) };

  // Удалённые фотографии: сначала записи, затем файлы.
  const keptIds = new Set(data.images.flatMap((image) => (image.kind === "existing" ? [image.id] : [])));
  const removed = existing.images.filter((image) => !keptIds.has(image.id));
  if (removed.length > 0) {
    await supabase.from("portfolio_images").delete().in("id", removed.map((image) => image.id));
    const paths = removed.map((image) => image.storage_path).filter((path): path is string => Boolean(path));
    if (paths.length > 0) await supabase.storage.from(BUCKETS.media).remove(paths);
  }

  const result = await writeRelations(supabase, itemId, data, existing.credits);
  if (!result.ok) return result;

  revalidatePortfolio(itemId);
  return { ok: true, data: { id: itemId }, message: t.dashboardPortfolio.updated };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ParsedItem = z.infer<typeof portfolioItemSchema>;

/** Изображения (с порядком), теги и участники работы. */
async function writeRelations(
  supabase: Supabase,
  itemId: string,
  data: ParsedItem,
  existingCredits: { id: string; profile_id: string | null; name: string | null; role: string }[],
): Promise<ActionResult> {
  const t = await getT();

  // Изображения: новые вставляем, существующие переупорядочиваем.
  const inserts = data.images.flatMap((image, position) =>
    image.kind === "new"
      ? [
          {
            item_id: itemId,
            storage_path: image.storage_path,
            url: publicStorageUrl(BUCKETS.media, image.storage_path),
            width: image.width,
            height: image.height,
            position,
            alt: data.title,
          },
        ]
      : [],
  );
  if (inserts.length > 0) {
    const { error } = await supabase.from("portfolio_images").insert(inserts);
    if (error) return { ok: false, error: errorMessage(t, error) };
  }
  const existingOrder = data.images.flatMap((image, position) => (image.kind === "existing" ? [{ id: image.id, position }] : []));
  for (const image of existingOrder) {
    await supabase.from("portfolio_images").update({ position: image.position, alt: data.title }).eq("id", image.id);
  }

  // Теги: полная замена.
  await supabase.from("portfolio_tags").delete().eq("item_id", itemId);
  const tags = [...new Set(data.tags)];
  if (tags.length > 0) {
    const { error } = await supabase.from("portfolio_tags").insert(tags.map((tag) => ({ item_id: itemId, tag })));
    if (error) return { ok: false, error: errorMessage(t, error) };
  }

  // Участники: удаляем исключённых и добавляем новых (существующих не трогаем,
  // чтобы не отправлять повторные уведомления).
  const key = (c: { profile_id?: string | null; name?: string | null; role: string }) =>
    `${c.profile_id ?? ""}|${(c.name ?? "").toLowerCase()}|${c.role}`;
  const wanted = new Map(data.credits.map((c) => [key(c), c]));
  const toDelete = existingCredits.filter((c) => !wanted.has(key(c)));
  if (toDelete.length > 0) {
    await supabase.from("portfolio_credits").delete().in("id", toDelete.map((c) => c.id));
  }
  const existingKeys = new Set(existingCredits.map(key));
  const seenProfiles = new Set(existingCredits.filter((c) => wanted.has(key(c))).map((c) => c.profile_id).filter(Boolean));
  const newCredits = [...wanted.values()].filter((c) => {
    if (existingKeys.has(key(c))) return false;
    if (c.profile_id) {
      if (seenProfiles.has(c.profile_id)) return false;
      seenProfiles.add(c.profile_id);
    }
    return true;
  });
  if (newCredits.length > 0) {
    const { error } = await supabase.from("portfolio_credits").insert(
      newCredits.map((c) => ({
        item_id: itemId,
        profile_id: c.profile_id ?? null,
        name: c.profile_id ? null : (c.name ?? null),
        role: c.role,
      })),
    );
    if (error) return { ok: false, error: errorMessage(t, error) };
  }

  return { ok: true };
}

export async function deletePortfolioItemAction(itemId: string): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(itemId).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data: images } = await supabase
    .from("portfolio_images")
    .select("storage_path")
    .eq("item_id", itemId)
    .eq("owner_id", user.id);

  const { data: deleted, error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", itemId)
    .eq("owner_id", user.id)
    .select("id");
  if (error) return { ok: false, error: errorMessage(t, error) };
  if (!deleted?.length) return { ok: false, error: t.errors.not_found };

  const paths = (images ?? []).map((image) => image.storage_path).filter((path): path is string => Boolean(path));
  if (paths.length > 0) await supabase.storage.from(BUCKETS.media).remove(paths);

  revalidatePortfolio(itemId);
  return { ok: true, message: t.dashboardPortfolio.deleted };
}

export async function setPublishedAction(itemId: string, published: boolean): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(itemId).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase
    .from("portfolio_items")
    .update({ is_published: published })
    .eq("id", itemId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePortfolio(itemId);
  return { ok: true };
}

export async function setCoverAction(itemId: string): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(itemId).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase.rpc("set_portfolio_cover", { p_item: itemId });
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePortfolio();
  return { ok: true };
}

export async function reorderPortfolioAction(ids: string[]): Promise<ActionResult> {
  const t = await getT();
  const parsed = z.array(z.uuid()).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false, error: t.errors.generic };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase.rpc("reorder_portfolio", { p_ids: parsed.data });
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePortfolio();
  return { ok: true };
}

/** Отмеченный в работе пользователь убирает отметку о себе. */
export async function removeMyCreditAction(creditId: string): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(creditId).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase.from("portfolio_credits").delete().eq("id", creditId).eq("profile_id", user.id);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidatePath("/portfolio/[id]", "page");
  return { ok: true, message: t.portfolio.creditRemoved };
}

/** Поиск пользователей для отметки участников съёмки. */
export async function searchPeopleAction(query: string) {
  const q = (typeof query === "string" ? query : "").trim().slice(0, 60);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, profile_type")
    .or(`display_name.ilike.${JSON.stringify(pattern)},username.ilike.${JSON.stringify(pattern)}`)
    .limit(8);
  return data ?? [];
}
