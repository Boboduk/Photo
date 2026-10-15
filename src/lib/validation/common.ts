import { z } from "zod";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Сообщения об ошибках в схемах — это ключи словаря validation.
 * Переводятся при выводе функцией translateIssues().
 */
export type ValidationKey = keyof Dictionary["validation"];

export const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "tooLong" satisfies ValidationKey });

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "tooLong" satisfies ValidationKey })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const requiredText = (min: number, max: number) =>
  z
    .string({ error: "required" satisfies ValidationKey })
    .trim()
    .min(1, { error: "required" satisfies ValidationKey })
    .min(min, { error: "tooShort" satisfies ValidationKey })
    .max(max, { error: "tooLong" satisfies ValidationKey });

export const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), {
    error: "invalidDate" satisfies ValidationKey,
  });

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, { error: "invalidUsername" satisfies ValidationKey });

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: "required" satisfies ValidationKey })
  .pipe(z.email({ error: "invalidEmail" satisfies ValidationKey }));

export const password = z
  .string()
  .min(8, { error: "passwordMin" satisfies ValidationKey })
  .max(72, { error: "tooLong" satisfies ValidationKey });

export const uuid = z.uuid({ error: "invalidValue" satisfies ValidationKey });

/** Чекбокс из FormData: "on" или отсутствие поля. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .nullable()
  .optional()
  .transform((v) => v === "on" || v === "true");

export function translateIssues(t: Dictionary, error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_form";
    const key = issue.message as ValidationKey;
    const message = t.validation[key] ?? t.validation.invalidValue;
    (result[field] ??= []).push(message);
  }
  return result;
}

/** FormData → объект: одиночные поля строкой, повторяющиеся — массивом. */
export function formDataToObject(formData: FormData, arrayFields: string[] = []) {
  const result: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).filter((v): v is string => typeof v === "string");
    result[key] = arrayFields.includes(key) ? values.filter(Boolean) : values[0];
  }
  for (const key of arrayFields) {
    result[key] ??= [];
  }
  return result;
}

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !key.startsWith("$ACTION") && !key.toLowerCase().includes("password")) {
      values[key] = value;
    }
  });
  return values;
}
