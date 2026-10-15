import type { SocialNetwork } from "./constants";

const BASES: Record<Exclude<SocialNetwork, "website">, { url: string; hosts: string[] }> = {
  instagram: { url: "https://instagram.com/", hosts: ["instagram.com", "www.instagram.com"] },
  telegram: { url: "https://t.me/", hosts: ["t.me", "telegram.me"] },
  vk: { url: "https://vk.com/", hosts: ["vk.com", "www.vk.com", "m.vk.com"] },
  behance: { url: "https://www.behance.net/", hosts: ["behance.net", "www.behance.net"] },
};

/**
 * Превращает введённое пользователем значение (ссылка или @имя) в безопасную ссылку.
 * Возвращает null для всего, что не похоже на http(s)-адрес нужной соцсети.
 */
export function socialUrl(network: SocialNetwork, raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  if (network === "website") {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  const base = BASES[network];
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return base.hosts.includes(url.hostname.toLowerCase()) ? url.toString() : null;
    } catch {
      return null;
    }
  }
  const handle = value.replace(/^@/, "");
  return /^[A-Za-z0-9_.-]{1,64}$/.test(handle) ? base.url + handle : null;
}

/** Короткая подпись для ссылки: @имя или домен. */
export function socialLabel(network: SocialNetwork, raw: string): string {
  const value = raw.trim();
  if (network === "website") {
    try {
      return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, "");
    } catch {
      return value;
    }
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const path = new URL(value).pathname.replace(/^\/|\/$/g, "");
      return path ? `@${path.split("/")[0]}` : value;
    } catch {
      return value;
    }
  }
  return `@${value.replace(/^@/, "")}`;
}
