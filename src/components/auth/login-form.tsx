"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/actions/auth";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { initialFormState } from "@/lib/errors";
import { PasswordInput } from "./password-input";

export function LoginForm({ next }: { next?: string }) {
  const t = useT();
  const [state, action] = useActionState(signInAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormMessage error={state.error} />
      <Field label={t.auth.email} htmlFor="email" error={errors.email}>
        <Input
          {...fieldAria("email", errors.email)}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email ?? ""}
          required
          autoFocus
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Field label={t.auth.password} htmlFor="password" error={errors.password}>
          <PasswordInput
            {...fieldAria("password", errors.password)}
            name="password"
            autoComplete="current-password"
            required
            showLabel={t.auth.showPassword}
            hideLabel={t.auth.hidePassword}
          />
        </Field>
        <Link href="/forgot-password" className="self-end text-sm text-muted hover:text-foreground">
          {t.auth.forgot}
        </Link>
      </div>
      <SubmitButton size="lg" className="mt-1 w-full" pendingText={t.common.loading}>
        {t.auth.loginSubmit}
      </SubmitButton>
    </form>
  );
}
