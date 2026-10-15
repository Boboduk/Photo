"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateProfileAction } from "@/actions/profile";
import { FormMessage } from "@/components/common/form-message";
import { SubmitButton } from "@/components/common/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipGroup } from "@/components/ui/chip-group";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import {
  AVAILABILITY_STATUSES,
  COLLAB_FORMATS,
  EXPERIENCE_LEVELS,
  PROFILE_TYPES,
  SOCIAL_NETWORKS,
  type ProfileType,
} from "@/lib/constants";
import { initialFormState } from "@/lib/errors";
import type { Tables } from "@/types/database";

type Category = { slug: string; label: string; for_photographers: boolean; for_models: boolean };

export function ProfileForm({
  profile,
  privateData,
  categories,
}: {
  profile: Tables<"profiles">;
  privateData: Tables<"profile_private"> | null;
  categories: Category[];
}) {
  const t = useT();
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const [type, setType] = useState<ProfileType>(profile.profile_type);
  const [specs, setSpecs] = useState<string[]>(profile.specializations);
  const social = (profile.social_links ?? {}) as Record<string, string>;

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  const photographerOptions = categories.filter((c) => c.for_photographers);
  const modelOptions = categories.filter((c) => c.for_models && !c.for_photographers);
  const showPhotographer = type !== "model";
  const showModel = type !== "photographer";
  const toggleSpec = (value: string, checked: boolean) =>
    setSpecs((current) => (checked ? [...new Set([...current, value])] : current.filter((v) => v !== value)));
  // Направления модели, совпадающие со специализациями фотографа (Портрет, Fashion, Beauty), показываем один раз.
  const modelChipOptions = showPhotographer ? modelOptions : categories.filter((c) => c.for_models);

  return (
    <form action={action} className="flex flex-col gap-10" noValidate>
      {/* Скрытые поля сохраняют специализации, которые не видны при текущем типе профиля */}
      <FormMessage error={state.error} />

      <Section title={t.profileForm.sections.basic}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.profileForm.displayName} htmlFor="display_name" error={errors.display_name}>
            <Input {...fieldAria("display_name", errors.display_name)} name="display_name" defaultValue={profile.display_name} maxLength={60} required />
          </Field>
          <Field label={t.profileForm.username} htmlFor="username" error={errors.username} hint={t.auth.usernameHint}>
            <Input {...fieldAria("username", errors.username, true)} name="username" defaultValue={profile.username} maxLength={30} autoCapitalize="none" required />
          </Field>
          <Field label={t.profileForm.city} htmlFor="city" error={errors.city}>
            <Input {...fieldAria("city", errors.city)} name="city" defaultValue={profile.city ?? ""} maxLength={80} placeholder={t.catalog.cityPlaceholder} />
          </Field>
          <Field label={t.profileForm.profileType} htmlFor="profile_type">
            <NativeSelect id="profile_type" name="profile_type" value={type} onChange={(e) => setType(e.target.value as ProfileType)}>
              {PROFILE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t.enums.profileType[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t.profileForm.bio} htmlFor="bio" error={errors.bio} className="sm:col-span-2">
            <Textarea {...fieldAria("bio", errors.bio)} name="bio" defaultValue={profile.bio ?? ""} maxLength={1000} rows={4} placeholder={t.profileForm.bioPlaceholder} />
          </Field>
        </div>
      </Section>

      <Section title={t.profileForm.sections.professional}>
        <div className="flex flex-col gap-7">
          {showPhotographer ? (
            <ChipGroup
              name="specializations"
              legend={t.profileForm.specializationsPhotographer}
              options={photographerOptions.map((c) => ({ value: c.slug, label: c.label }))}
              selected={specs}
              onToggle={toggleSpec}
            />
          ) : null}
          {showModel ? (
            <ChipGroup
              name="specializations"
              legend={t.profileForm.specializationsModel}
              options={modelChipOptions.map((c) => ({ value: c.slug, label: c.label }))}
              selected={specs}
              onToggle={toggleSpec}
            />
          ) : null}
          {specs
            .filter((slug) => {
              const category = categories.find((c) => c.slug === slug);
              if (!category) return false;
              const visible =
                (showPhotographer && category.for_photographers) ||
                (showModel && modelChipOptions.some((c) => c.slug === slug));
              return !visible;
            })
            .map((slug) => (
              <input key={slug} type="hidden" name="specializations" value={slug} />
            ))}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t.profileForm.experience} htmlFor="experience">
              <NativeSelect id="experience" name="experience" defaultValue={profile.experience ?? ""}>
                <option value="">{t.common.notSpecified}</option>
                {EXPERIENCE_LEVELS.map((value) => (
                  <option key={value} value={value}>
                    {t.enums.experience[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={t.profileForm.availability} htmlFor="availability">
              <NativeSelect id="availability" name="availability" defaultValue={profile.availability}>
                {AVAILABILITY_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t.enums.availability[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <ChipGroup
            name="collab_formats"
            legend={t.profileForm.formats}
            options={COLLAB_FORMATS.map((value) => ({
              value,
              label: t.enums.collabFormat[value],
              hint: t.enums.collabFormatHint[value],
            }))}
            selected={profile.collab_formats}
          />
        </div>
      </Section>

      <Section title={t.profileForm.sections.social}>
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <Field key={network} label={t.profile.socialLabels[network]} htmlFor={`social_${network}`} error={errors[`social_${network}`]}>
              <Input
                {...fieldAria(`social_${network}`, errors[`social_${network}`])}
                name={`social_${network}`}
                defaultValue={social[network] ?? ""}
                maxLength={200}
                placeholder={network === "website" ? t.profileForm.websitePlaceholder : t.profileForm.socialPlaceholder}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title={t.profileForm.sections.params} description={t.profileForm.paramsHint}>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={t.profileForm.birthDate} htmlFor="birth_date" error={errors.birth_date} hint={t.profileForm.birthDateHint} className="sm:col-span-3 sm:max-w-xs">
            <Input {...fieldAria("birth_date", errors.birth_date, true)} type="date" name="birth_date" defaultValue={privateData?.birth_date ?? ""} />
          </Field>
          {showModel ? (
            <>
              <Field label={t.profileForm.height} htmlFor="height_cm" error={errors.height_cm}>
                <Input {...fieldAria("height_cm", errors.height_cm)} name="height_cm" inputMode="numeric" defaultValue={privateData?.height_cm ?? ""} />
              </Field>
              <Field label={t.profileForm.clothingSize} htmlFor="clothing_size">
                <Input id="clothing_size" name="clothing_size" defaultValue={privateData?.clothing_size ?? ""} maxLength={20} />
              </Field>
              <Field label={t.profileForm.shoeSize} htmlFor="shoe_size">
                <Input id="shoe_size" name="shoe_size" defaultValue={privateData?.shoe_size ?? ""} maxLength={20} />
              </Field>
              <Field label={t.profileForm.hairColor} htmlFor="hair_color">
                <Input id="hair_color" name="hair_color" defaultValue={privateData?.hair_color ?? ""} maxLength={40} />
              </Field>
              <Field label={t.profileForm.eyeColor} htmlFor="eye_color">
                <Input id="eye_color" name="eye_color" defaultValue={privateData?.eye_color ?? ""} maxLength={40} />
              </Field>
            </>
          ) : (
            <>
              <input type="hidden" name="height_cm" value={privateData?.height_cm ?? ""} />
              {(["clothing_size", "shoe_size", "hair_color", "eye_color"] as const).map((key) => (
                <input key={key} type="hidden" name={key} value={privateData?.[key] ?? ""} />
              ))}
            </>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-3 text-[15px]">
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox name="show_age" defaultChecked={privateData?.show_age ?? false} />
            {t.settings.showAge}
          </label>
          {showModel ? (
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox name="show_params" defaultChecked={privateData?.show_params ?? false} />
              {t.settings.showParams}
            </label>
          ) : privateData?.show_params ? (
            <input type="hidden" name="show_params" value="on" />
          ) : null}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-line bg-background/90 px-1 py-4 backdrop-blur">
        <SubmitButton size="lg" pendingText={t.common.saving}>
          {t.common.save}
        </SubmitButton>
        {state.ok ? <span className="text-sm text-success">{t.profileForm.saved}</span> : null}
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line pt-8 first:border-t-0 first:pt-0 lg:grid-cols-[220px_1fr] lg:gap-10">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
