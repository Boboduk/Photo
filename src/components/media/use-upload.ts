"use client";

import { useState } from "react";
import { prepareImage, randomFileName, type ProcessedImage } from "@/lib/image-processing";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_MB, type Bucket } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export type UploadedImage = { path: string; width: number; height: number };

export class UploadError extends Error {
  constructor(public reason: "wrong_type" | "too_large" | "failed", public fileName: string) {
    super(reason);
  }
}

/**
 * Загрузка изображения в Storage от имени пользователя.
 * Политики Storage разрешают запись только в папку <user_id>/.
 */
export async function uploadImage(
  file: File,
  { bucket, userId, folder, maxSize }: { bucket: Bucket; userId: string; folder: string; maxSize: number },
): Promise<UploadedImage> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new UploadError("wrong_type", file.name);
  }
  // Исходник проверяем с запасом: после сжатия файл станет меньше лимита бакета.
  if (file.size > MAX_UPLOAD_MB[bucket] * 1024 * 1024 * 3) {
    throw new UploadError("too_large", file.name);
  }

  let processed: ProcessedImage;
  try {
    processed = await prepareImage(file, maxSize);
  } catch {
    throw new UploadError("wrong_type", file.name);
  }
  if (processed.blob.size > MAX_UPLOAD_MB[bucket] * 1024 * 1024) {
    throw new UploadError("too_large", file.name);
  }

  const path = `${userId}/${folder}/${randomFileName(processed.extension)}`;
  const { error } = await createClient().storage.from(bucket).upload(path, processed.blob, {
    contentType: processed.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new UploadError("failed", file.name);
  return { path, width: processed.width, height: processed.height };
}

export function useUploadState() {
  const [uploading, setUploading] = useState(false);
  return { uploading, setUploading };
}
