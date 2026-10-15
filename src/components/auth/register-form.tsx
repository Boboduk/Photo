"use client";

import { CameraIcon, MailCheckIcon, SparklesIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { resendConfirmationAction, signUpAction } from "@/actions/auth";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, fieldAria } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { PROFILE_TYPES, type ProfileType } from "@/lib/constants";
import { initialFormState } from "@/lib/errors";
import { suggestUsername } from "@/lib/translit";
import { cn } from "@/lib/utils";
import { PasswordInput } from "./password-input";

const TYPE_ICONS: Record<ProfileType, typeof CameraIcon> = {
  photographer: CameraIcon,
  model: UserIcon,
  both: SparklesIcon,
};

/** Подставляет ссылки в текст согласия: "Я принимаю {terms} и {privacy}". */
function withLinks(template: string, links: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return key && key in links ? <span key={index}>{links[key]}</span> : <span key={index}>{part}</span>;
  });
}

export function RegisterForm() {
  const t = useT();
  const [state, action] = useActionState(signUpAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const [name, setName] = useState(values.display_name ?? "");
  const [username, setUsername] = useState(values.username ?? "");
  const [usernameTouched, setUsernameTouched] = useState(Boolean(values.username));
  const [type, setType] = useState<ProfileType>((values.profile_type as ProfileType) ?? "photographer");
  const [resending, startResend] = useTransition();

  if (state.ok && state.message) {
    const email = state.message;
    return (
      <div className="animate-rise">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface">
          <MailCheckIcon className="size-6" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.auth.checkEmailTitle}</h1>
        <p className="mt-3 leading-relaxed text-muted">{format(t.auth.checkEmailText, { email })}</p>
        <p className="mt-3 text-sm text-muted">{t.auth.checkEmailHint}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={resending}
            onClick={() =>
              startResend(async () => {
                const result = await resendConfirmationAction(email);
                if (result.ok) toast.success(t.auth.resent);
                else toast.error(result.error);
              })
            }
          >
            {t.auth.resend}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">{t.auth.backToLogin}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const linkClass = "font-medium text-foreground underline underline-offset-2";

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage error={state.error} />

      <fieldset>
        <legend className="mb-2.5 text-sm font-medium">{t.auth.profileType}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PROFILE_TYPES.map((value) => {
            const Icon = TYPE_ICONS[value];
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-3.5 text-sm leading-tight font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground",
                  type === value ? "border-foreground bg-surface" : "border-line-strong hover:border-foreground/50",
                )}
              >
                <input
                  type="radio"
                  name="profile_type"
                  value={value}
                  checked={type === value}
                  onChange={() => setType(value)}
                  className="sr-only"
                />
                <Icon className="size-5" />
                {t.enums.profileType[value]}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[13px] text-muted">{t.auth.profileTypeHint}</p>
      </fieldset>

      <Field label={t.auth.displayName} htmlFor="display_name" error={errors.display_name}>
        <Input
          {...fieldAria("display_name", errors.display_name)}
          name="display_name"
          autoComplete="name"
          value={name}
          maxLength={60}
          onChange={(e) => {
            setName(e.target.value);
            if (!usernameTouched) setUsername(suggestUsername(e.target.value));
          }}
          required
        />
      </Field>

      <Field label={t.auth.username} htmlFor="username" error={errors.username} hint={t.auth.usernameHint}>
        <div className="flex items-center rounded-lg border border-line-strong focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/10">
          <span className="pl-3.5 text-[15px] text-subtle select-none">frame/</span>
          <input
            {...fieldAria("username", errors.username, true)}
            name="username"
            value={username}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setUsernameTouched(true);
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""));
            }}
            className="h-11 w-full bg-transparent pr-3.5 pl-0.5 text-[15px] outline-none"
            required
          />
        </div>
      </Field>

      <Field label={t.auth.email} htmlFor="email" error={errors.email}>
        <Input
          {...fieldAria("email", errors.email)}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={values.email ?? ""}
          required
        />
      </Field>

      <Field label={t.auth.password} htmlFor="password" error={errors.password} hint={t.auth.passwordHint}>
        <PasswordInput
          {...fieldAria("password", errors.password, true)}
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
        />
      </Field>

      <div className="flex flex-col gap-3 text-sm">
        <Consent name="terms" error={errors.terms}>
          {withLinks(t.auth.acceptTerms, {
            terms: (
              <Link href="/terms" target="_blank" className={linkClass}>
                {t.auth.termsLink}
              </Link>
            ),
            privacy: (
              <Link href="/privacy" target="_blank" className={linkClass}>
                {t.auth.privacyLink}
              </Link>
            ),
          })}
        </Consent>
        <Consent name="personal_data" error={errors.personal_data}>
          {withLinks(t.auth.acceptPersonalData, {
            consent: (
              <Link href="/consent" target="_blank" className={linkClass}>
                {t.auth.consentLink}
              </Link>
            ),
          })}
        </Consent>
        <Consent name="age" error={errors.age}>
          {format(t.auth.confirmAge, { age: brand.minAge })}
        </Consent>
      </div>

      <SubmitButton size="lg" className="mt-1 w-full" pendingText={t.common.creating}>
        {t.auth.registerSubmit}
      </SubmitButton>
    </form>
  );
}

function Consent({ name, error, children }: { name: string; error?: string[]; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 leading-snug text-foreground/85">
        <Checkbox name={name} className="mt-px" aria-invalid={error ? true : undefined} required />
        <span>{children}</span>
      </label>
      {error ? (
        <p role="alert" className="mt-1 pl-[30px] text-[13px] text-danger">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}
