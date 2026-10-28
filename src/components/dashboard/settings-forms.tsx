"use client";

import { CameraIcon, SparklesIcon, UserIcon, UserPenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  changeEmailAction,
  changePasswordAction,
  deleteAccountAction,
  updateContactsAction,
  updateNotificationSettingsAction,
  updateProfileTypeAction,
} from "@/actions/profile";
import { setBlockAction } from "@/actions/social";
import { PasswordInput } from "@/components/auth/password-input";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { CONTACTS_VISIBILITY } from "@/lib/constants";
import { initialFormState, type FormState } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

function useToastOnSuccess(state: FormState) {
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
}

export function EmailForm({ email }: { email: string }) {
  const t = useT();
  const [state, action] = useActionState(changeEmailAction, initialFormState);
  useToastOnSuccess(state);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} success={state.ok ? state.message : undefined} />
      <Field label={t.settings.email} htmlFor="current_email">
        <Input id="current_email" value={email} readOnly disabled />
      </Field>
      <Field label={t.settings.newEmail} htmlFor="email" error={errors.email}>
        <Input {...fieldAria("email", errors.email)} name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton variant="outline" className="self-start" pendingText={t.common.saving}>
        {t.settings.changeEmail}
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const t = useT();
  const [state, action] = useActionState(changePasswordAction, initialFormState);
  useToastOnSuccess(state);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} />
      <Field label={t.auth.newPassword} htmlFor="new_password" error={errors.password} hint={t.auth.passwordHint}>
        <PasswordInput
          {...fieldAria("new_password", errors.password, true)}
          name="password"
          autoComplete="new-password"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
        />
      </Field>
      <Field label={t.auth.confirmPassword} htmlFor="confirm_password" error={errors.confirm}>
        <PasswordInput
          {...fieldAria("confirm_password", errors.confirm)}
          name="confirm"
          autoComplete="new-password"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
        />
      </Field>
      <SubmitButton variant="outline" className="self-start" pendingText={t.common.saving}>
        {t.settings.changePassword}
      </SubmitButton>
    </form>
  );
}

const TYPE_ICONS: Record<string, typeof CameraIcon> = {
  photographer: CameraIcon,
  model: UserIcon,
  both: SparklesIcon,
  videographer: CameraIcon,
};

function getTypeIcon(slug: string) {
  return TYPE_ICONS[slug] ?? UserPenIcon;
}

export function ProfileTypeForm({ value, profileTypes }: { value: string; profileTypes: { slug: string; name: string }[] }) {
  const t = useT();
  const router = useRouter();
  const [type, setType] = useState(value);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t.settings.profileType}>
      {profileTypes.map((option) => {
        const Icon = getTypeIcon(option.slug);
        return (
          <button
            key={option.slug}
            type="button"
            role="radio"
            aria-checked={type === option.slug}
            disabled={pending}
            onClick={() => {
              if (option.slug === type) return;
              const previous = type;
              setType(option.slug);
              startTransition(async () => {
                const result = await updateProfileTypeAction(option.slug);
                if (result.ok) {
                  toast.success(result.message);
                  router.refresh();
                } else {
                  setType(previous);
                  toast.error(result.error);
                }
              });
            }}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 text-left text-[15px] font-medium transition-colors",
              type === option.slug ? "border-foreground bg-surface" : "border-line-strong hover:border-foreground/50",
            )}
          >
            <Icon className="size-5" />
            {option.name}
          </button>
        );
      })}
    </div>
  );
}

export function ContactsForm({ data }: { data: Tables<"profile_private"> }) {
  const t = useT();
  const [state, action] = useActionState(updateContactsAction, initialFormState);
  useToastOnSuccess(state);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} />
      <p className="text-sm text-muted">{t.settings.contactsHint}</p>
      <Field label={t.settings.contactsVisibility} htmlFor="contacts_visibility">
        <NativeSelect id="contacts_visibility" name="contacts_visibility" defaultValue={data.contacts_visibility}>
          {CONTACTS_VISIBILITY.map((value) => (
            <option key={value} value={value}>
              {t.enums.contactsVisibility[value]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t.settings.contactEmail} htmlFor="contact_email" error={errors.contact_email}>
          <Input {...fieldAria("contact_email", errors.contact_email)} name="contact_email" type="email" defaultValue={data.contact_email ?? ""} />
        </Field>
        <Field label={t.settings.contactPhone} htmlFor="contact_phone" error={errors.contact_phone}>
          <Input {...fieldAria("contact_phone", errors.contact_phone)} name="contact_phone" type="tel" defaultValue={data.contact_phone ?? ""} />
        </Field>
        <Field label={t.settings.contactTelegram} htmlFor="contact_telegram" error={errors.contact_telegram}>
          <Input {...fieldAria("contact_telegram", errors.contact_telegram)} name="contact_telegram" defaultValue={data.contact_telegram ?? ""} placeholder="@username" />
        </Field>
      </div>
      <SubmitButton variant="outline" className="self-start" pendingText={t.common.saving}>
        {t.common.save}
      </SubmitButton>
    </form>
  );
}

export function NotificationSettingsForm({ data }: { data: Tables<"profile_private"> }) {
  const t = useT();
  const [state, action] = useActionState(updateNotificationSettingsAction, initialFormState);
  useToastOnSuccess(state);
  const options = [
    ["notify_messages", t.settings.notifyMessages],
    ["notify_applications", t.settings.notifyApplications],
    ["notify_project_updates", t.settings.notifyProjectUpdates],
    ["notify_likes", t.settings.notifyLikes],
    ["notify_mentions", t.settings.notifyMentions],
  ] as const;
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} />
      <div className="flex flex-col gap-3">
        {options.map(([name, label]) => (
          <label key={name} className="flex cursor-pointer items-center gap-3 text-[15px]">
            <Checkbox name={name} defaultChecked={data[name]} />
            {label}
          </label>
        ))}
      </div>
      <SubmitButton variant="outline" className="self-start" pendingText={t.common.saving}>
        {t.common.save}
      </SubmitButton>
    </form>
  );
}

export function BlockedUsers({ users }: { users: { id: string; username: string; display_name: string; avatar_url: string | null }[] }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (users.length === 0) return <p className="text-sm text-muted">{t.settings.noBlocked}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
      {users.map((user) => (
        <li key={user.id} className="flex items-center gap-3 px-4 py-3">
          <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {user.display_name} <span className="font-normal text-muted">@{user.username}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setBlockAction(user.id, false);
                if (result.ok) {
                  toast.success(result.message);
                  router.refresh();
                } else toast.error(result.error);
              })
            }
          >
            {t.profile.unblock}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function DeleteAccount({ username }: { username: string }) {
  const t = useT();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  return (
    <ConfirmDialog
      trigger={<Button variant="danger-outline">{t.settings.deleteButton}</Button>}
      title={t.settings.deleteTitle}
      description={t.settings.deleteText}
      confirmLabel={t.settings.deleteButton}
      confirmDisabled={value.trim().toLowerCase() !== username}
      onConfirm={async () => {
        const result = await deleteAccountAction(value);
        if (result && !result.ok) {
          setError(result.error);
          return false;
        }
      }}
    >
      <Field label={format(t.settings.deleteConfirmLabel, { username })} htmlFor="confirm_username" error={error}>
        <Input
          {...fieldAria("confirm_username", error)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
        />
      </Field>
    </ConfirmDialog>
  );
}
