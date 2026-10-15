"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { PROFILE_TYPES } from "@/lib/constants";
import { errorMessage, type ActionResult, type FormState } from "@/lib/errors";
import { BUCKETS, isOwnStoragePath, publicStorageUrl, storagePathFromUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { email, formDataToObject, formValues, password, translateIssues } from "@/lib/validation/common";
import { contactsSchema, notificationSettingsSchema, onboardingSchema, profileSchema } from "@/lib/validation/profile";
import { SOCIAL_NETWORKS } from "@/lib/constants";
import { safeNextPath } from "@/lib/utils";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Оставляет только существующие активные категории. */
async function validSpecializations(supabase: Awaited<ReturnType<typeof createClient>>, slugs: string[]) {
  if (slugs.length === 0) return [];
  const { data } = await supabase.from("categories").select("slug").in("slug", slugs).eq("is_active", true);
  const allowed = new Set((data ?? []).map((c) => c.slug));
  return [...new Set(slugs)].filter((slug) => allowed.has(slug));
}

function revalidateProfile(username?: string) {
  revalidatePath("/dashboard", "layout");
  if (username) revalidatePath(`/users/${username}`);
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const raw = formDataToObject(formData, ["specializations", "collab_formats"]);
  raw.social = Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, raw[`social_${n}`] ?? ""]));
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = translateIssues(t, parsed.error);
    // social.instagram → social_instagram (имена полей формы)
    for (const key of Object.keys(fieldErrors)) {
      if (key.startsWith("social.")) fieldErrors[key.replace(".", "_")] = fieldErrors[key];
    }
    return { error: t.errors.generic, fieldErrors, values: formValues(formData) };
  }
  const { supabase, user } = await authed();
  if (!user) return { error: t.errors.not_authenticated };
  const input = parsed.data;

  const { data: current } = await supabase.from("profiles").select("username").eq("id", user.id).single();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name,
      username: input.username,
      city: input.city,
      bio: input.bio,
      profile_type: input.profile_type,
      specializations: await validSpecializations(supabase, input.specializations),
      experience: input.experience,
      availability: input.availability,
      collab_formats: input.collab_formats,
      social_links: input.social,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { username: [t.errors.username_taken] }, values: formValues(formData) };
    }
    return { error: errorMessage(t, error), values: formValues(formData) };
  }

  const { error: privateError } = await supabase
    .from("profile_private")
    .update({
      birth_date: input.birth_date,
      height_cm: input.height_cm,
      clothing_size: input.clothing_size,
      shoe_size: input.shoe_size,
      hair_color: input.hair_color,
      eye_color: input.eye_color,
      show_age: input.show_age,
      show_params: input.show_params,
    })
    .eq("id", user.id);
  if (privateError) return { error: errorMessage(t, privateError), values: formValues(formData) };

  revalidateProfile(input.username);
  if (current?.username && current.username !== input.username) revalidatePath(`/users/${current.username}`);
  return { ok: true, message: t.profileForm.saved };
}

/** Аватар или обложка: файл уже загружен в Storage браузером, сохраняем ссылку. */
export async function setProfileImageAction(kind: "avatar" | "cover", path: string | null): Promise<ActionResult<{ url: string | null }>> {
  const t = await getT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  if (path !== null && (typeof path !== "string" || !isOwnStoragePath(user.id, path))) {
    return { ok: false, error: t.errors.forbidden };
  }

  const column = kind === "avatar" ? "avatar_url" : "cover_url";
  const { data: current } = await supabase.from("profiles").select("avatar_url, cover_url, username").eq("id", user.id).single();
  const url = path ? publicStorageUrl(BUCKETS.avatars, path) : null;

  const { error } = await supabase
    .from("profiles")
    .update(kind === "avatar" ? { avatar_url: url } : { cover_url: url })
    .eq("id", user.id);
  if (error) return { ok: false, error: errorMessage(t, error) };

  const oldPath = storagePathFromUrl(BUCKETS.avatars, current?.[column]);
  if (oldPath && oldPath !== path && isOwnStoragePath(user.id, oldPath)) {
    await supabase.storage.from(BUCKETS.avatars).remove([oldPath]);
  }

  revalidateProfile(current?.username);
  return { ok: true, data: { url } };
}

export async function completeOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = onboardingSchema.safeParse(formDataToObject(formData, ["specializations", "collab_formats"]));
  if (!parsed.success) return { fieldErrors: translateIssues(t, parsed.error), values: formValues(formData) };
  const { supabase, user } = await authed();
  if (!user) return { error: t.errors.not_authenticated };

  const { error } = await supabase
    .from("profiles")
    .update({
      city: parsed.data.city,
      bio: parsed.data.bio,
      specializations: await validSpecializations(supabase, parsed.data.specializations),
      collab_formats: parsed.data.collab_formats,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { error: errorMessage(t, error), values: formValues(formData) };

  revalidateProfile();
  redirect(safeNextPath(formData.get("next")));
}

export async function skipOnboardingAction(next: string) {
  const { supabase, user } = await authed();
  if (user) {
    await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  }
  redirect(safeNextPath(next));
}

// --- Настройки -------------------------------------------------------------------

export async function updateProfileTypeAction(profileType: string): Promise<ActionResult> {
  const t = await getT();
  const parsed = z.enum(PROFILE_TYPES).safeParse(profileType);
  if (!parsed.success) return { ok: false, error: t.validation.invalidValue };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };
  const { error } = await supabase.from("profiles").update({ profile_type: parsed.data }).eq("id", user.id);
  if (error) return { ok: false, error: errorMessage(t, error) };
  revalidateProfile();
  return { ok: true, message: t.settings.profileTypeSaved };
}

export async function updateContactsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = contactsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: translateIssues(t, parsed.error), values: formValues(formData) };
  const { supabase, user } = await authed();
  if (!user) return { error: t.errors.not_authenticated };
  const { error } = await supabase.from("profile_private").update(parsed.data).eq("id", user.id);
  if (error) return { error: errorMessage(t, error), values: formValues(formData) };
  revalidateProfile();
  return { ok: true, message: t.settings.privacySaved };
}

export async function updateNotificationSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = notificationSettingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { error: t.errors.generic };
  const { supabase, user } = await authed();
  if (!user) return { error: t.errors.not_authenticated };
  const { error } = await supabase.from("profile_private").update(parsed.data).eq("id", user.id);
  if (error) return { error: errorMessage(t, error) };
  return { ok: true, message: t.settings.notificationsSaved };
}

export async function changeEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = z.object({ email }).safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: translateIssues(t, parsed.error), values: formValues(formData) };
  const { supabase, user } = await authed();
  if (!user) return { error: t.errors.not_authenticated };
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) {
    return {
      error: error.status === 429 ? t.auth.errors.rateLimited : error.code === "email_exists" ? t.auth.errors.userExists : t.errors.generic,
      values: formValues(formData),
    };
  }
  return { ok: true, message: t.settings.emailChangeSent };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "passwordsMismatch" })
    .safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: translateIssues(t, parsed.error) };
  const { supabase, user } = await authed();
  if (!user) return { error: t.errors.not_authenticated };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password" || error.code === "weak_password"
          ? t.auth.errors.weakPassword
          : error.code === "reauthentication_needed"
            ? t.auth.errors.sessionExpired
            : t.errors.generic,
    };
  }
  return { ok: true, message: t.settings.passwordChanged };
}

/**
 * Удаление аккаунта: сначала файлы пользователя в Storage (по его же сессии),
 * затем сам пользователь — всё остальное удаляется каскадно в базе.
 */
export async function deleteAccountAction(confirmUsername: string): Promise<ActionResult> {
  const t = await getT();
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  if (!profile || typeof confirmUsername !== "string" || confirmUsername.trim().toLowerCase() !== profile.username) {
    return { ok: false, error: t.settings.deleteConfirmMismatch };
  }

  for (const bucket of [BUCKETS.avatars, BUCKETS.media]) {
    const paths = await listAllFiles(supabase, bucket, user.id);
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
    }
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { ok: false, error: errorMessage(t, error) };

  await supabase.auth.signOut();
  redirect("/?m=account-deleted");
}

async function listAllFiles(supabase: Awaited<ReturnType<typeof createClient>>, bucket: string, folder: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  const result: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data } = await supabase.storage.from(bucket).list(folder, { limit: 100, offset });
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = `${folder}/${entry.name}`;
      // У папок нет id
      if (entry.id) result.push(path);
      else result.push(...(await listAllFiles(supabase, bucket, path, depth + 1)));
    }
    if (data.length < 100) break;
  }
  return result;
}
