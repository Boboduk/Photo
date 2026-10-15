"use client";

import { ALLOWED_IMAGE_TYPES } from "./storage";

export type ProcessedImage = {
  blob: Blob;
  width: number;
  height: number;
  type: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
};

/**
 * Готовит изображение к загрузке: уменьшает до maxSize по длинной стороне,
 * учитывает ориентацию из EXIF и перекодирует в WebP (или JPEG).
 * Перекодирование заодно удаляет метаданные — в том числе геолокацию снимка.
 */
export async function prepareImage(file: File, maxSize = 2560, quality = 0.88): Promise<ProcessedImage> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("wrong_type");
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") {
    return { blob: webp, width, height, type: "image/webp", extension: "webp" };
  }
  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("encode_failed");
  return { blob: jpeg, width, height, type: "image/jpeg", extension: "jpg" };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export function randomFileName(extension: string) {
  return `${crypto.randomUUID()}.${extension}`;
}
