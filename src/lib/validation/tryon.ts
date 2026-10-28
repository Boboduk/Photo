import { z } from "zod";
import { GARMENT_CATEGORIES } from "@/lib/constants";
import { TRYON_LIMITS } from "@/lib/tryon/config";
import { optionalText, requiredText, type ValidationKey } from "./common";

const upload = {
  storage_path: z.string().min(3).max(500),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
};

export const tryOnModelSchema = z.object({
  name: requiredText(1, TRYON_LIMITS.nameMax),
  ...upload,
  consent: z.literal(true, { error: "mustAccept" satisfies ValidationKey }),
});

export const tryOnGarmentSchema = z.object({
  name: requiredText(1, TRYON_LIMITS.nameMax),
  category: z.enum(GARMENT_CATEGORIES),
  ...upload,
});

export const tryOnRunSchema = z.object({
  model_id: z.uuid({ error: "required" satisfies ValidationKey }),
  garment_ids: z
    .array(z.uuid())
    .min(1, { error: "required" satisfies ValidationKey })
    .max(TRYON_LIMITS.garmentsPerLook, { error: "tooMany" satisfies ValidationKey }),
  instructions: optionalText(TRYON_LIMITS.instructionsMax),
});

export type TryOnModelInput = z.input<typeof tryOnModelSchema>;
export type TryOnGarmentInput = z.input<typeof tryOnGarmentSchema>;
export type TryOnRunInput = z.input<typeof tryOnRunSchema>;
