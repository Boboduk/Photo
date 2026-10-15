import { z } from "zod";
import { COLLAB_FORMATS, PROJECT_STATUSES, TEAM_ROLES } from "@/lib/constants";
import { optionalDate, optionalText, requiredText } from "./common";

export const projectSchema = z.object({
  title: requiredText(3, 120),
  description: requiredText(10, 5000),
  city: optionalText(80),
  location: optionalText(160),
  shoot_date: optionalDate,
  category_slug: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  looking_for: z.array(z.enum(TEAM_ROLES)).min(1, { error: "required" }).max(5),
  collab_format: z.enum(COLLAB_FORMATS, { error: "required" }),
  terms: optionalText(2000),
  usage_rights: optionalText(2000),
  requirements: optionalText(2000),
  spots: z.coerce
    .number({ error: "invalidNumber" })
    .int({ error: "invalidNumber" })
    .min(1, { error: "invalidValue" })
    .max(50, { error: "invalidValue" }),
  cover_path: z.string().max(500).nullable().optional(),
});

export type ProjectInput = z.input<typeof projectSchema>;

export const projectStatusSchema = z.enum(PROJECT_STATUSES);

export const applySchema = z.object({
  projectId: z.uuid(),
  role: z.enum(TEAM_ROLES),
  message: requiredText(1, 1000),
});
