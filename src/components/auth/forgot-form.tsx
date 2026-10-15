"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/actions/auth";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { initialFormState } from "@/lib/errors";

export function ForgotForm() {
  const t = useT();
  const [state, action] = useActionState(requestPasswordResetAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  if (state.ok && state.message) {
    return (
      <div className="animate-rise">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface">
          <MailCheckIcon className="size-6" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.auth.linkSentTitle}</h1>
        <p className="mt-3 leading-relaxed text-muted">{format(t.auth.linkSentText, { email: state.message })}</p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/login">{t.auth.backToLogin}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <h1 className="text-3xl font-semibold tracking-tight">{t.auth.forgotTitle}</h1>
      <p className="mt-2 text-muted">{t.auth.forgotText}</p>
      <form action={action} className="mt-8 flex flex-col gap-5" noValidate>
        <FormMessage error={state.error} />
        <Field label={t.auth.email} htmlFor="email" error={errors.email}>
          <Input
            {...fieldAria("email", errors.email)}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values?.email ?? ""}
            required
            autoFocus
          />
        </Field>
        <SubmitButton size="lg" className="w-full" pendingText={t.common.sending}>
          {t.auth.sendLink}
        </SubmitButton>
      </form>
      <p className="mt-8 text-sm">
        <Link href="/login" className="text-muted hover:text-foreground">
          ← {t.auth.backToLogin}
        </Link>
      </p>
    </div>
  );
}
