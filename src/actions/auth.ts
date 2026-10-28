"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { siteUrl } from "@/config/site";
import { getT } from "@/i18n/server";
import type { FormState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";
import {
  checkbox,
  email,
  formDataToObject,
  formValues,
  password,
  requiredText,
  translateIssues,
  username,
} from "@/lib/validation/common";

const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "required" }),
  next: z.string().optional(),
});

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = signInSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: translateIssues(t, parsed.error), values: formValues(formData) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const message =
      error?.code === "email_not_confirmed"
        ? t.auth.errors.emailNotConfirmed
        : error?.code === "over_request_rate_limit" || error?.status === 429
          ? t.auth.errors.rateLimited
          : t.auth.errors.invalidCredentials;
    return { error: message, values: formValues(formData) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle();

  const next = safeNextPath(parsed.data.next);
  if (profile && !profile.onboarded_at) {
    redirect(`/welcome?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

const signUpSchema = z.object({
  display_name: requiredText(2, 60),
  username,
  email,
  password,
  profile_type: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, { error: "required" }),
  terms: checkbox.refine(Boolean, { error: "mustAccept" }),
  personal_data: checkbox.refine(Boolean, { error: "mustAccept" }),
  age: checkbox.refine(Boolean, { error: "mustAccept" }),
});

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = signUpSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: translateIssues(t, parsed.error), values: formValues(formData) };
  }
  const input = parsed.data;
  const supabase = await createClient();

  const { data: taken } = await supabase.from("profiles").select("id").eq("username", input.username).maybeSingle();
  if (taken) {
    return { fieldErrors: { username: [t.auth.errors.usernameTaken] }, values: formValues(formData) };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/welcome`,
      data: {
        display_name: input.display_name,
        username: input.username,
        profile_type: input.profile_type,
        terms_accepted: "true",
        personal_data_consent: "true",
        age_confirmed: "true",
      },
    },
  });

  if (error) {
    const message =
      error.code === "user_already_exists"
        ? t.auth.errors.userExists
        : error.code === "weak_password"
          ? t.auth.errors.weakPassword
          : error.status === 429
            ? t.auth.errors.rateLimited
            : t.errors.generic;
    return { error: message, values: formValues(formData) };
  }

  // Если подтверждение почты отключено, сессия появляется сразу.
  if (data.session) {
    redirect("/welcome");
  }

  return { ok: true, message: input.email };
}

export async function resendConfirmationAction(emailValue: string): Promise<{ ok: boolean; error?: string }> {
  const t = await getT();
  const parsed = email.safeParse(emailValue);
  if (!parsed.success) return { ok: false, error: t.validation.invalidEmail };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=/welcome` },
  });
  if (error) {
    return { ok: false, error: error.status === 429 ? t.auth.errors.rateLimited : t.errors.generic };
  }
  return { ok: true };
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = z.object({ email }).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: translateIssues(t, parsed.error), values: formValues(formData) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });
  if (error?.status === 429) {
    return { error: t.auth.errors.rateLimited, values: formValues(formData) };
  }
  // Не сообщаем, существует ли аккаунт с такой почтой.
  return { ok: true, message: parsed.data.email };
}

const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "passwordsMismatch" });

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const parsed = newPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: translateIssues(t, parsed.error) };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t.auth.errors.sessionExpired };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password" || error.code === "weak_password"
          ? t.auth.errors.weakPassword
          : t.errors.generic,
    };
  }
  return { ok: true, message: t.auth.passwordUpdated };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
