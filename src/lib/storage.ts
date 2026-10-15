export const BUCKETS = {
  avatars: "avatars",
  media: "media",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Лимиты совпадают с настройками бакетов в миграции. */
export const MAX_UPLOAD_MB = {
  avatars: 5,
  media: 15,
} as const;

export const MAX_IMAGES_PER_WORK = 12;

export function publicStorageUrl(bucket: Bucket, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Путь файла внутри бакета по публичной ссылке (только для файлов нашего Storage). */
export function storagePathFromUrl(bucket: Bucket, url: string | null | undefined): string | null {
  if (!url) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const prefix = `${base}/storage/v1/object/public/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length));
}

/** Путь принадлежит папке пользователя (<userId>/...). */
export function isOwnStoragePath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}
