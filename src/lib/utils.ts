import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Безопасный внутренний путь для редиректа после входа (защита от open redirect). */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function listParam(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : value.split(",");
  return list.map((v) => v.trim()).filter(Boolean);
}

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** searchParams страницы → строка запроса (для подгрузки и ссылок). */
export function toQueryString(params: Record<string, string | string[] | undefined>, omit: string[] = []) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (omit.includes(key) || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== "") search.append(key, v);
    }
  }
  return search.toString();
}
