"use client";

import { useActionState, useTransition } from "react";
import { completeOnboardingAction, skipOnboardingAction } from "@/actions/profile";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { COLLAB_FORMATS } from "@/lib/constants";
import { initialFormState } from "@/lib/errors";

export function OnboardingForm({
  next,
  specializationOptions,
  specializationLabel,
}: {
  next: string;
  specializationOptions: { value: string; label: string }[];
  specializationLabel: string;
}) {
  const t = useT();
  const [state, action] = useActionState(completeOnboardingAction, initialFormState);
  const [skipping, startSkip] = useTransition();
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <FormMessage error={state.error} />
      <Field label={t.profileForm.city} htmlFor="city" error={errors.city}>
        <Input {...fieldAria("city", errors.city)} name="city" placeholder={t.catalog.cityPlaceholder} maxLength={80} />
      </Field>
      <Field label={t.welcome.aboutTitle} htmlFor="bio" error={errors.bio}>
        <Textarea {...fieldAria("bio", errors.bio)} name="bio" rows={3} maxLength={1000} placeholder={t.profileForm.bioPlaceholder} />
      </Field>
      <ChipGroup name="specializations" legend={specializationLabel} options={specializationOptions} />
      <ChipGroup
        name="collab_formats"
        legend={t.profileForm.formats}
        options={COLLAB_FORMATS.map((value) => ({ value, label: t.enums.collabFormat[value], hint: t.enums.collabFormatHint[value] }))}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <SubmitButton size="lg" pendingText={t.common.saving}>
          {t.welcome.finish}
        </SubmitButton>
        <Button variant="ghost" size="lg" disabled={skipping} onClick={() => startSkip(() => skipOnboardingAction(next))}>
          {t.welcome.skip}
        </Button>
      </div>
    </form>
  );
}
