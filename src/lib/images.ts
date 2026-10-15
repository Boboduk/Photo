import type { ImageLoader } from "next/image";

/**
 * Внешние демо-изображения (Unsplash) уже раздаются CDN с нужным размером,
 * поэтому для них используем собственный загрузчик вместо оптимизатора Next.js.
 */
const unsplashLoader: ImageLoader = ({ src, width, quality }) => {
  const url = new URL(src);
  const w = Number(url.searchParams.get("w"));
  const h = Number(url.searchParams.get("h"));
  url.searchParams.set("w", String(width));
  if (w > 0 && h > 0) {
    url.searchParams.set("h", String(Math.round((width * h) / w)));
  }
  url.searchParams.set("q", String(quality ?? 75));
  return url.toString();
};

export function imageLoaderFor(src: string): ImageLoader | undefined {
  return src.startsWith("https://images.unsplash.com/") ? unsplashLoader : undefined;
}
