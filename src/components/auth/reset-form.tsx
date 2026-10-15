"use client";

import { CircleCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction } from "@/actions/auth";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { useT } from "@/i18n/client";
import { initialFormState } from "@/lib/errors";
import { PasswordInput } from "./password-input";

export function ResetForm() {
  const t = useT();
  const [state, action] = useActionState(updatePasswordAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="animate-rise">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CircleCheckIcon className="size-6" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.auth.passwordUpdated}</h1>
        <Button asChild className="mt-8">
          <Link href="/dashboard">{t.nav.dashboard}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage error={state.error} />
      <Field label={t.auth.newPassword} htmlFor="password" error={errors.password} hint={t.auth.passwordHint}>
        <PasswordInput
          {...fieldAria("password", errors.password, true)}
          name="password"
          autoComplete="new-password"
          required
          autoFocus
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
        />
      </Field>
      <Field label={t.auth.confirmPassword} htmlFor="confirm" error={errors.confirm}>
        <PasswordInput
          {...fieldAria("confirm", errors.confirm)}
          name="confirm"
          autoComplete="new-password"
          required
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText={t.common.saving}>
        {t.auth.resetSubmit}
      </SubmitButton>
    </form>
  );
}
