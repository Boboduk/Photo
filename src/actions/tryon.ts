"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { isModelProfileType } from "@/lib/queries/profile-types";
import { BUCKETS, isOwnStoragePath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  deleteTryOnItem,
  requestTryOnPhoto,
  runTryOn,
  shareAvatarForTryOn,
  type TryOnKind,
  type TryOnResultView,
} from "@/lib/tryon/service";
import { translateIssues } from "@/lib/validation/common";
import {
  tryOnGarmentSchema,
  tryOnModelSchema,
  tryOnRunSchema,
  type TryOnGarmentInput,
  type TryOnModelInput,
  type TryOnRunInput,
} from "@/lib/validation/tryon";

const id = z.uuid();

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const revalidateStudio = () => revalidatePath("/dashboard/tryon");

/** Файл уже загружен в Storage из браузера — сохраняем запись о модели. */
export async function addTryOnModelAction(input: TryOnModelInput): Promise<ActionResult> {
  const t = await getT();
  const parsed = tryOnModelSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: t.errors.generic,
      fieldErrors: translateIssues(t, parsed.error),
    };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { storage_path, name, width, height } = parsed.data;
  if (!isOwnStoragePath(user.id, storage_path) || !storage_path.startsWith(`${user.id}/models/`)) {
    return { ok: false, error: t.errors.forbidden };
  }

  const { error } = await supabase.from("tryon_models").insert({ name, storage_path, width, height });
  if (error) {
    await supabase.storage.from(BUCKETS.tryon).remove([storage_path]);
    return { ok: false, error: errorMessage(t, error) };
  }
  revalidateStudio();
  return { ok: true, message: t.tryon.models.added };
}

export async function addTryOnGarmentAction(input: TryOnGarmentInput): Promise<ActionResult> {
  const t = await getT();
  const parsed = tryOnGarmentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: t.errors.generic,
      fieldErrors: translateIssues(t, parsed.error),
    };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { storage_path, name, category, width, height } = parsed.data;
  if (!isOwnStoragePath(user.id, storage_path) || !storage_path.startsWith(`${user.id}/garments/`)) {
    return { ok: false, error: t.errors.forbidden };
  }

  const { error } = await supabase.from("tryon_garments").insert({ name, category, storage_path, width, height });
  if (error) {
    await supabase.storage.from(BUCKETS.tryon).remove([storage_path]);
    return { ok: false, error: errorMessage(t, error) };
  }
  revalidateStudio();
  return { ok: true, message: t.tryon.garments.added };
}

/**
 * Модель открывает своё фото для примерки другим участникам (или закрывает доступ).
 * Разрешено только профилям моделей — это повторно проверяет политика RLS.
 */
export async function setTryOnModelSharedAction(modelId: string, shared: boolean): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(modelId).success || typeof shared !== "boolean") return { ok: false, error: t.errors.not_found };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  if (user.profile.banned_at) return { ok: false, error: t.errors.account_banned };
  if (shared && !(await isModelProfileType(user.profile.profile_type))) return { ok: false, error: t.tryon.share.onlyModels };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tryon_models")
    .update({ is_shared: shared })
    .eq("id", modelId)
    .eq("owner_id", user.id)
    .select("id");
  if (error) return { ok: false, error: errorMessage(t, error) };
  if (!data?.length) return { ok: false, error: t.errors.not_found };
  revalidateStudio();
  revalidatePath("/users/[username]", "page");
  return {
    ok: true,
    message: shared ? t.tryon.share.enabled : t.tryon.share.disabled,
  };
}

/** Попросить модель платформы открыть фото для примерки (уведомление модели). */
export async function requestTryOnPhotoAction(modelProfileId: string): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(modelProfileId).success) return { ok: false, error: t.tryon.requests.status.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const status = await requestTryOnPhoto(supabase, modelProfileId);
  revalidateStudio();
  if (status === "requested") return { ok: true, message: t.tryon.requests.status.requested };
  return {
    ok: false,
    error: status === "generic" ? t.errors.generic : t.tryon.requests.status[status],
  };
}

/** Модель открывает свой аватар для примерки одним нажатием (с подтверждением согласия). */
export async function shareAvatarForTryOnAction(consent: boolean): Promise<ActionResult> {
  const t = await getT();
  if (consent !== true) return { ok: false, error: t.validation.mustAccept };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  if (user.profile.banned_at) return { ok: false, error: t.errors.account_banned };
  if (!(await isModelProfileType(user.profile.profile_type))) return { ok: false, error: t.tryon.share.onlyModels };

  const supabase = await createClient();
  const outcome = await shareAvatarForTryOn(supabase, user.id, t.tryon.requests.avatarName);
  if (!outcome.ok)
    return {
      ok: false,
      error: outcome.code === "no_avatar" ? t.tryon.requests.noAvatar : t.tryon.errors[outcome.code],
    };
  revalidateStudio();
  revalidatePath("/users/[username]", "page");
  return { ok: true, message: t.tryon.requests.avatarShared };
}

export async function deleteTryOnItemAction(kind: TryOnKind, itemId: string): Promise<ActionResult> {
  const t = await getT();
  if (!["model", "garment", "result"].includes(kind) || !id.safeParse(itemId).success) {
    return { ok: false, error: t.errors.not_found };
  }
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const deleted = await deleteTryOnItem(supabase, user.id, kind, itemId);
  if (!deleted) return { ok: false, error: t.errors.not_found };
  revalidateStudio();
  return { ok: true };
}

/** Генерация занимает до минуты: maxDuration задан на странице примерочной. */
export async function generateTryOnAction(input: TryOnRunInput): Promise<ActionResult<{ result: TryOnResultView }>> {
  const t = await getT();
  const parsed = tryOnRunSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: t.errors.generic,
      fieldErrors: translateIssues(t, parsed.error),
    };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const outcome = await runTryOn(supabase, user.id, {
    modelId: parsed.data.model_id,
    garmentIds: parsed.data.garment_ids,
    instructions: parsed.data.instructions,
  });
  revalidateStudio();
  if (!outcome.ok) return { ok: false, error: t.tryon.errors[outcome.code] };
  return {
    ok: true,
    data: { result: outcome.result },
    message: t.tryon.generate.done,
  };
}
