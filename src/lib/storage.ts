export const BUCKETS = {
  avatars: "avatars",
  media: "media",
  /** Приватный бакет примерочной: файлы отдаются только по подписанным ссылкам. */
  tryon: "tryon",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Лимиты совпадают с настройками бакетов в миграции. */
export const MAX_UPLOAD_MB = {
  avatars: 5,
  media: 15,
  tryon: 10,
} as const;

export const MAX_IMAGES_PER_WORK = 12;

export function publicStorageUrl(bucket: Bucket, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];

/** Путь файла внутри бакета по публичной ссылке (только для файлов нашего Storage). */
export function storagePathFromUrl(bucket: Bucket, url: string | null | undefined): string | null {
  if (!url) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const prefix = `${base}/storage/v1/object/public/${bucket}/`;
  if (url.startsWith(prefix)) return decodeURIComponent(url.slice(prefix.length));
  // Локальный Supabase: в базе остались ссылки и с 127.0.0.1, и с localhost.
  try {
    const own = new URL(base);
    const given = new URL(url);
    const local = LOCAL_HOSTS.includes(own.hostname) && LOCAL_HOSTS.includes(given.hostname) && own.port === given.port;
    const path = `/storage/v1/object/public/${bucket}/`;
    if (!local || !given.pathname.startsWith(path)) return null;
    return decodeURIComponent(given.pathname.slice(path.length));
  } catch {
    return null;
  }
}

/** Путь принадлежит папке пользователя (<userId>/...). */
export function isOwnStoragePath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..");
}
