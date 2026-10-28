import "server-only";

import { z } from "zod";
import { AVAILABILITY_STATUSES, COLLAB_FORMATS, EXPERIENCE_LEVELS, SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/constants";
import { socialUrl } from "@/lib/social";
import type { Tables } from "@/types/database";

/**
 * Помощь в заполнении профиля через MCP: что ещё не заполнено, как это заполнить
 * и частичное обновление полей. Ограничения совпадают с формой профиля на сайте
 * (lib/validation/profile.ts), права проверяют GRANT на колонки и RLS.
 */

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

export const profilePatchSchema = z.object({
  display_name: z.string().trim().min(2).max(60).optional(),
  city: z.string().trim().max(80).optional().describe("City; empty string clears it. Abbreviations (мск, спб, питер, екб) are expanded"),
  bio: z.string().trim().max(1000).optional().describe("About me, up to 1000 characters; empty string clears it"),
  profile_type: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,40}$/)
    .optional()
    .describe("Profile type slug (options.profile_types)"),
  specializations: z
    .array(z.string().trim().min(1).max(60))
    .max(12)
    .optional()
    .describe("Replaces the list. Category slugs or Russian names (options.specializations); close spellings are matched"),
  experience: z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  availability: z.enum(AVAILABILITY_STATUSES).optional(),
  collab_formats: z.array(z.enum(COLLAB_FORMATS)).max(4).optional().describe("Replaces the list"),
  social: z
    .object(
      Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, z.string().trim().max(200).optional()])) as Record<
        SocialNetwork,
        z.ZodOptional<z.ZodString>
      >,
    )
    .optional()
    .describe("Links or @handles to set; empty string removes a link; networks not listed stay unchanged"),
  birth_date: z.iso.date().nullable().optional().describe("YYYY-MM-DD; private unless show_age"),
  show_age: z.boolean().optional(),
  height_cm: z.number().int().min(100).max(230).nullable().optional(),
  clothing_size: nullableText(20),
  shoe_size: nullableText(20),
  hair_color: nullableText(40),
  eye_color: nullableText(40),
  show_params: z.boolean().optional().describe("Show height, sizes, hair and eye color on the public profile"),
});

export type ProfilePatch = z.infer<typeof profilePatchSchema>;

type Category = Pick<Tables<"categories">, "slug" | "name">;

const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, "");

/** Специализации по slug или названию; другие окончания тоже подходят («свадьба», «портреты»). */
export function resolveSpecializations(values: string[], categories: Category[]) {
  const resolved: string[] = [];
  const unknown: string[] = [];
  for (const value of values) {
    const key = norm(value);
    const match =
      categories.find((c) => c.slug === value.trim().toLowerCase() || norm(c.name) === key) ??
      // «свадьба» → «Свадебная съёмка», «портреты» → «Портрет»: совпадение по началу слова.
      categories.find((c) => key.length >= 4 && (norm(c.name).startsWith(key.slice(0, 5)) || key.startsWith(norm(c.name).slice(0, 5))));
    if (match) resolved.push(match.slug);
    else unknown.push(value);
  }
  return { resolved: [...new Set(resolved)], unknown };
}

/** Соцсети: проверка как на сайте; пустая строка удаляет ссылку. */
export function mergeSocialLinks(current: unknown, patch: Partial<Record<SocialNetwork, string>>) {
  const links: Record<string, string> = {
    ...((current && typeof current === "object" ? current : {}) as Record<string, string>),
  };
  const invalid: string[] = [];
  for (const network of SOCIAL_NETWORKS) {
    const value = patch[network];
    if (value === undefined) continue;
    if (value === "") delete links[network];
    else if (socialUrl(network, value)) links[network] = value;
    else invalid.push(network);
  }
  return { links, invalid };
}

type ProfileRow = Pick<
  Tables<"profiles">,
  "display_name" | "avatar_url" | "city" | "bio" | "specializations" | "experience" | "collab_formats" | "social_links"
>;
type PrivateRow = Pick<Tables<"profile_private">, "height_cm" | "clothing_size" | "shoe_size" | "hair_color" | "eye_color"> | null;

/** Что ещё не заполнено в профиле — с подсказкой, как это сделать. */
export function profileCompleteness(
  profile: ProfileRow,
  details: PrivateRow,
  {
    isModel,
    worksCount,
    editUrl,
    portfolioUrl,
  }: {
    isModel: boolean;
    worksCount: number;
    editUrl: string;
    portfolioUrl: string;
  },
) {
  const checks: { field: string; done: boolean; hint: string }[] = [
    {
      field: "avatar",
      done: Boolean(profile.avatar_url),
      hint: `A clear portrait photo; upload it on the website: ${editUrl}`,
    },
    {
      field: "city",
      done: Boolean(profile.city),
      hint: "City where the member shoots",
    },
    {
      field: "bio",
      done: (profile.bio ?? "").trim().length >= 80,
      hint: "2–4 sentences: who they are, style, experience, what shoots they are looking for. Draft it from the user's answers and confirm before saving",
    },
    {
      field: "specializations",
      done: profile.specializations.length > 0,
      hint: "Shoot genres from options.specializations",
    },
    {
      field: "experience",
      done: profile.experience !== null,
      hint: "beginner, intermediate or professional",
    },
    {
      field: "collab_formats",
      done: profile.collab_formats.length > 0,
      hint: "TFP, paid, commercial, collab",
    },
    {
      field: "social",
      done: Object.keys((profile.social_links ?? {}) as object).length > 0,
      hint: "At least one link: Instagram, Telegram, VK, Behance or a website",
    },
    {
      field: "portfolio",
      done: worksCount >= 3,
      hint: `At least 3 published works; photos are uploaded on the website: ${portfolioUrl}`,
    },
  ];
  if (isModel) {
    checks.push(
      {
        field: "height_cm",
        done: details?.height_cm != null,
        hint: "Height in cm (models)",
      },
      {
        field: "clothing_size",
        done: Boolean(details?.clothing_size),
        hint: "Clothing size, e.g. 42–44 or S",
      },
      {
        field: "shoe_size",
        done: Boolean(details?.shoe_size),
        hint: "Shoe size",
      },
      {
        field: "hair_color",
        done: Boolean(details?.hair_color),
        hint: "Hair color",
      },
      {
        field: "eye_color",
        done: Boolean(details?.eye_color),
        hint: "Eye color",
      },
    );
  }
  const missing = checks.filter((check) => !check.done).map(({ field, hint }) => ({ field, hint }));
  return {
    percent: Math.round(((checks.length - missing.length) / checks.length) * 100),
    missing,
  };
}
