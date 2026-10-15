import { z } from "zod";
import {
  AVAILABILITY_STATUSES,
  COLLAB_FORMATS,
  CONTACTS_VISIBILITY,
  EXPERIENCE_LEVELS,
  PROFILE_TYPES,
  SOCIAL_NETWORKS,
} from "@/lib/constants";
import { socialUrl } from "@/lib/social";
import { checkbox, optionalDate, optionalText, requiredText, username } from "./common";

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null));

const socialLinks = z
  .object(Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, z.string().trim().max(200).optional()])) as Record<
    (typeof SOCIAL_NETWORKS)[number],
    z.ZodOptional<z.ZodString>
  >)
  .superRefine((links, ctx) => {
    for (const network of SOCIAL_NETWORKS) {
      const value = links[network];
      if (value && !socialUrl(network, value)) {
        ctx.addIssue({ code: "custom", path: [network], message: "invalidUrl" });
      }
    }
  })
  .transform((links) =>
    Object.fromEntries(Object.entries(links).filter(([, value]) => Boolean(value))) as Record<string, string>,
  );

export const profileSchema = z.object({
  display_name: requiredText(2, 60),
  username,
  city: optionalText(80),
  bio: optionalText(1000),
  profile_type: z.enum(PROFILE_TYPES),
  specializations: z.array(z.string().max(40)).max(12, { error: "tooMany" }),
  experience: optionalEnum(EXPERIENCE_LEVELS),
  availability: z.enum(AVAILABILITY_STATUSES),
  collab_formats: z.array(z.enum(COLLAB_FORMATS)).max(4),
  social: socialLinks,
  // Приватные поля (profile_private)
  birth_date: optionalDate.refine(
    (v) => v === null || (new Date(v) < new Date() && new Date(v) > new Date("1900-01-01")),
    { error: "invalidDate" },
  ),
  height_cm: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 100 && v <= 230), { error: "invalidValue" }),
  clothing_size: optionalText(20),
  shoe_size: optionalText(20),
  hair_color: optionalText(40),
  eye_color: optionalText(40),
  show_age: checkbox,
  show_params: checkbox,
});

export const onboardingSchema = z.object({
  city: optionalText(80),
  bio: optionalText(1000),
  specializations: z.array(z.string().max(40)).max(12),
  collab_formats: z.array(z.enum(COLLAB_FORMATS)).max(4),
});

export const contactsSchema = z.object({
  contact_email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || z.email().safeParse(v).success, { error: "invalidEmail" }),
  contact_phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[+\d][\d\s()-]{5,}$/.test(v), { error: "invalidValue" }),
  contact_telegram: optionalText(64),
  contacts_visibility: z.enum(CONTACTS_VISIBILITY),
});

export const notificationSettingsSchema = z.object({
  notify_messages: checkbox,
  notify_applications: checkbox,
  notify_project_updates: checkbox,
  notify_likes: checkbox,
  notify_mentions: checkbox,
});
