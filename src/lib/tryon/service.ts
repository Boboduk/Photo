import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { BUCKETS, isOwnStoragePath, storagePathFromUrl } from "@/lib/storage";
import type { Database, Tables } from "@/types/database";
import { TRYON_LIMITS, TRYON_SIGNED_URL_TTL, TRYON_STALE_MS, TRYON_UPLOAD_SIZE } from "./config";
import { getTryOnProvider, TryOnProviderError, type TryOnFailureCode } from "./provider";

/**
 * Общая логика примерочной для server actions и MCP-сервера.
 * Клиент Supabase всегда работает от имени пользователя — доступ проверяет RLS.
 */

type Db = SupabaseClient<Database>;

export type TryOnModelView = Pick<Tables<"tryon_models">, "id" | "name" | "width" | "height" | "created_at" | "is_shared"> & {
  url: string | null;
};
/** Модель платформы, открывшая своё фото для примерки. */
export type TryOnPlatformModelView = Pick<Tables<"tryon_models">, "id" | "name" | "width" | "height" | "shared_at"> & {
  url: string | null;
  owner: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    city: string | null;
  };
};
/** Модель платформы, которая ещё не открыла фото: её можно только попросить об этом. */
export type TryOnModelProfileView = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  requested_at: string | null;
};
export type TryOnGarmentView = Pick<Tables<"tryon_garments">, "id" | "name" | "category" | "width" | "height" | "created_at"> & {
  url: string | null;
};
export type TryOnResultView = Pick<
  Tables<"tryon_results">,
  "id" | "model_id" | "garment_ids" | "instructions" | "status" | "width" | "height" | "error" | "created_at" | "completed_at"
> & { url: string | null };

export type TryOnStudioData = {
  models: TryOnModelView[];
  platformModels: TryOnPlatformModelView[];
  /** Остальные модели платформы — без открытого фото. */
  modelProfiles: TryOnModelProfileView[];
  garments: TryOnGarmentView[];
  results: TryOnResultView[];
  /** Сколько участников просили текущего пользователя открыть фото для примерки. */
  incomingRequests: number;
};

async function signUrls(db: Db, paths: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (unique.length === 0) return new Map();
  const { data } = await db.storage.from(BUCKETS.tryon).createSignedUrls(unique, TRYON_SIGNED_URL_TTL);
  return new Map((data ?? []).flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [])));
}

/** Генерация, оборвавшаяся на середине (например, перезапуск сервера), показывается как ошибка. */
function withStaleStatus<
  T extends {
    status: Tables<"tryon_results">["status"];
    error: string | null;
    created_at: string;
  },
>(row: T): T {
  if (row.status === "processing" && Date.now() - new Date(row.created_at).getTime() > TRYON_STALE_MS) {
    return { ...row, status: "failed", error: row.error ?? "timeout" };
  }
  return row;
}

export async function getTryOnStudio(db: Db, userId: string, resultsLimit = 60): Promise<TryOnStudioData> {
  const [models, platformModels, garments, results, modelProfiles, incoming] = await Promise.all([
    db
      .from("tryon_models")
      .select("id, name, storage_path, width, height, created_at, is_shared")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(TRYON_LIMITS.models),
    // Чужие модели видны только открытые для примерки — это проверяет RLS.
    db
      .from("tryon_models")
      .select(
        "id, name, storage_path, width, height, shared_at, owner:profiles!tryon_models_owner_id_fkey(id, username, display_name, avatar_url, city)",
      )
      .eq("is_shared", true)
      .neq("owner_id", userId)
      .order("shared_at", { ascending: false })
      .limit(TRYON_LIMITS.platformModels),
    db
      .from("tryon_garments")
      .select("id, name, category, storage_path, width, height, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(TRYON_LIMITS.garments),
    db
      .from("tryon_results")
      .select("id, model_id, garment_ids, instructions, status, storage_path, width, height, error, created_at, completed_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(resultsLimit),
    // Все модели платформы (без себя и заблокированных) — и отметка, просили ли мы их.
    db.rpc("tryon_model_profiles", { p_limit: TRYON_LIMITS.platformModels }),
    db.from("tryon_requests").select("requester_id", { count: "exact", head: true }).eq("model_id", userId),
  ]);

  const urls = await signUrls(db, [
    ...(models.data ?? []).map((row) => row.storage_path),
    ...(platformModels.data ?? []).map((row) => row.storage_path),
    ...(garments.data ?? []).map((row) => row.storage_path),
    ...(results.data ?? []).map((row) => row.storage_path),
  ]);

  const shared = (platformModels.data ?? []).flatMap(({ storage_path, owner, ...row }) =>
    owner ? [{ ...row, owner, url: urls.get(storage_path) ?? null }] : [],
  );
  const sharedOwners = new Set(shared.map((row) => row.owner.id));

  return {
    models: (models.data ?? []).map(({ storage_path, ...row }) => ({
      ...row,
      url: urls.get(storage_path) ?? null,
    })),
    platformModels: shared,
    modelProfiles: (modelProfiles.data ?? []).filter((profile) => !sharedOwners.has(profile.id)),
    incomingRequests: incoming.count ?? 0,
    garments: (garments.data ?? []).map(({ storage_path, ...row }) => ({
      ...row,
      url: urls.get(storage_path) ?? null,
    })),
    results: (results.data ?? []).map(({ storage_path, ...row }) =>
      withStaleStatus({
        ...row,
        url: storage_path ? (urls.get(storage_path) ?? null) : null,
      }),
    ),
  };
}

export type TryOnRunError =
  "not_configured" | "not_found" | "rate_limited" | "tryon_busy" | "storage_failed" | "generic" | TryOnFailureCode;

export type TryOnRunResult =
  | {
      ok: true;
      result: TryOnResultView;
      image: { bytes: Buffer; type: "image/webp" };
    }
  | { ok: false; code: TryOnRunError };

/**
 * Полный цикл примерки: проверка, запись в журнал (там же лимиты частоты),
 * загрузка исходников, генерация, сохранение результата в приватный бакет.
 */
export async function runTryOn(
  db: Db,
  userId: string,
  input: { modelId: string; garmentIds: string[]; instructions: string | null },
): Promise<TryOnRunResult> {
  const provider = getTryOnProvider();
  if (!provider) return { ok: false, code: "not_configured" };

  const garmentIds = [...new Set(input.garmentIds)];
  const [{ data: model }, { data: garments }] = await Promise.all([
    // Своя модель или модель платформы, открытая для примерки (проверяет RLS).
    db.from("tryon_models").select("id, storage_path, width, height").eq("id", input.modelId).maybeSingle(),
    db.from("tryon_garments").select("id, name, category, storage_path").in("id", garmentIds).eq("owner_id", userId),
  ]);
  const ordered = garmentIds.flatMap((id) => garments?.filter((garment) => garment.id === id) ?? []);
  if (!model || ordered.length !== garmentIds.length || ordered.length === 0) return { ok: false, code: "not_found" };

  // Строка создаётся до обращения к API: триггер в БД проверяет лимиты частоты.
  const { data: row, error: insertError } = await db
    .from("tryon_results")
    .insert({
      model_id: model.id,
      garment_ids: garmentIds,
      instructions: input.instructions,
    })
    .select("id, created_at")
    .single();
  if (insertError || !row) {
    const message = insertError?.message;
    return {
      ok: false,
      code: message === "rate_limited" || message === "tryon_busy" ? message : "generic",
    };
  }

  const fail = async (code: TryOnRunError): Promise<TryOnRunResult> => {
    await db
      .from("tryon_results")
      .update({
        status: "failed",
        error: code,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return { ok: false, code };
  };

  const download = async (path: string) => {
    const { data, error } = await db.storage.from(BUCKETS.tryon).download(path);
    if (error || !data) throw new Error(`download_failed: ${path}`);
    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      mimeType: data.type || "image/webp",
    };
  };

  let sources;
  try {
    sources = await Promise.all([download(model.storage_path), ...ordered.map((garment) => download(garment.storage_path))]);
  } catch (error) {
    console.error("[tryon] source download failed", error);
    return fail("storage_failed");
  }
  const [modelImage, ...garmentImages] = sources;

  let generated: Uint8Array;
  try {
    generated = await provider.generate({
      model: { ...modelImage, width: model.width, height: model.height },
      garments: ordered.map((garment, index) => ({
        ...garmentImages[index],
        name: garment.name,
        category: garment.category,
      })),
      instructions: input.instructions,
    });
  } catch (error) {
    if (error instanceof TryOnProviderError) {
      console.error(`[tryon] ${provider.name} failed: ${error.code}`, error.message);
      return fail(error.code);
    }
    console.error(`[tryon] ${provider.name} failed`, error);
    return fail("provider_error");
  }

  // Перекодируем в WebP: файл в разы меньше PNG, а заодно проверяем, что это изображение.
  const output = await sharp(generated)
    .rotate()
    .webp({ quality: 90 })
    .toBuffer({ resolveWithObject: true })
    .catch((error: unknown) => {
      console.error("[tryon] provider returned an unreadable image", error);
      return null;
    });
  if (!output) return fail("no_image");

  const storagePath = `${userId}/results/${row.id}.webp`;
  const { error: uploadError } = await db.storage.from(BUCKETS.tryon).upload(storagePath, output.data, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    console.error("[tryon] result upload failed", uploadError.message);
    return fail("storage_failed");
  }

  const { data: saved, error: updateError } = await db
    .from("tryon_results")
    .update({
      status: "succeeded",
      storage_path: storagePath,
      width: output.info.width,
      height: output.info.height,
      error: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("id, model_id, garment_ids, instructions, status, width, height, error, created_at, completed_at")
    .single();
  if (updateError || !saved) {
    await db.storage.from(BUCKETS.tryon).remove([storagePath]);
    return fail("generic");
  }

  const urls = await signUrls(db, [storagePath]);
  return {
    ok: true,
    result: { ...saved, url: urls.get(storagePath) ?? null },
    image: { bytes: output.data, type: "image/webp" },
  };
}

export type TryOnKind = "model" | "garment" | "result";

/** Удаляет запись и её файл. Возвращает false, если записи нет (или она чужая). */
export async function deleteTryOnItem(db: Db, userId: string, kind: TryOnKind, id: string): Promise<boolean> {
  const query =
    kind === "model"
      ? db.from("tryon_models").delete().eq("id", id).eq("owner_id", userId).select("storage_path")
      : kind === "garment"
        ? db.from("tryon_garments").delete().eq("id", id).eq("owner_id", userId).select("storage_path")
        : db.from("tryon_results").delete().eq("id", id).eq("owner_id", userId).select("storage_path");
  const { data, error } = await query;
  if (error || !data?.length) return false;
  const paths = data.map((row) => row.storage_path).filter((path): path is string => Boolean(path));
  if (paths.length > 0) await db.storage.from(BUCKETS.tryon).remove(paths);
  return true;
}

export type TryOnRequestStatus = "requested" | "already_requested" | "already_shared" | "rate_limited" | "not_found";

/** Попросить модель платформы открыть фото для примерки: модель получит уведомление. */
export async function requestTryOnPhoto(db: Db, modelProfileId: string): Promise<TryOnRequestStatus | "generic"> {
  const { data, error } = await db.rpc("request_tryon_photo", {
    p_model: modelProfileId,
  });
  if (error) {
    console.error("[tryon] request failed", error.message);
    return "generic";
  }
  return data as TryOnRequestStatus;
}

export type TryOnAvatarShareError = "no_avatar" | "storage_failed" | "generic";

/**
 * Модель открывает свой аватар для примерки одним действием: файл копируется в приватный
 * бакет примерочной как её фото и сразу открывается. Согласие проверяет вызывающий код.
 */
export async function shareAvatarForTryOn(
  db: Db,
  userId: string,
  name: string,
): Promise<{ ok: true; modelId: string } | { ok: false; code: TryOnAvatarShareError }> {
  const { data: profile } = await db.from("profiles").select("avatar_url").eq("id", userId).single();
  const avatarPath = storagePathFromUrl(BUCKETS.avatars, profile?.avatar_url);
  if (!avatarPath || !isOwnStoragePath(userId, avatarPath)) return { ok: false, code: "no_avatar" };

  const { data: file, error: downloadError } = await db.storage.from(BUCKETS.avatars).download(avatarPath);
  if (downloadError || !file) return { ok: false, code: "storage_failed" };
  const image = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({
      width: TRYON_UPLOAD_SIZE.model,
      height: TRYON_UPLOAD_SIZE.model,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 90 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => null);
  if (!image) return { ok: false, code: "storage_failed" };

  const storagePath = `${userId}/models/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await db.storage.from(BUCKETS.tryon).upload(storagePath, image.data, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) return { ok: false, code: "storage_failed" };

  const { data: model, error: insertError } = await db
    .from("tryon_models")
    .insert({
      name,
      storage_path: storagePath,
      width: image.info.width,
      height: image.info.height,
    })
    .select("id")
    .single();
  if (insertError || !model) {
    await db.storage.from(BUCKETS.tryon).remove([storagePath]);
    return { ok: false, code: "generic" };
  }
  const { error: shareError } = await db.from("tryon_models").update({ is_shared: true }).eq("id", model.id);
  if (shareError) {
    await deleteTryOnItem(db, userId, "model", model.id);
    return { ok: false, code: "generic" };
  }
  return { ok: true, modelId: model.id };
}
