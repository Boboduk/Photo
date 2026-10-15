import { z } from "zod";
import { TEAM_ROLES } from "@/lib/constants";
import { MAX_IMAGES_PER_WORK } from "@/lib/storage";
import { optionalDate, optionalText, requiredText } from "./common";

export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^#/, "").replace(/\s+/g, "_"))
  .pipe(z.string().regex(/^[\p{L}\p{N}_-]{1,32}$/u, { error: "invalidValue" }));

export const creditSchema = z
  .object({
    id: z.uuid().optional(),
    profile_id: z.uuid().nullable().optional(),
    name: z.string().trim().max(80, { error: "tooLong" }).nullable().optional(),
    role: z.enum(TEAM_ROLES),
  })
  .refine((c) => Boolean(c.profile_id) || Boolean(c.name), { error: "required", path: ["name"] });

export const imageInputSchema = z.union([
  z.object({ kind: z.literal("existing"), id: z.uuid() }),
  z.object({
    kind: z.literal("new"),
    storage_path: z.string().min(3).max(500),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
  }),
]);

export const portfolioItemSchema = z.object({
  title: requiredText(1, 120),
  description: optionalText(3000),
  category_slug: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  shot_on: optionalDate,
  is_published: z.boolean(),
  tags: z.array(tagSchema).max(10, { error: "tooMany" }),
  credits: z.array(creditSchema).max(20, { error: "tooMany" }),
  images: z
    .array(imageInputSchema)
    .min(1, { error: "required" })
    .max(MAX_IMAGES_PER_WORK, { error: "tooMany" }),
});

export type PortfolioItemInput = z.input<typeof portfolioItemSchema>;
export type ImageInput = z.infer<typeof imageInputSchema>;
