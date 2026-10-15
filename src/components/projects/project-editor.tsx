"use client";

import { ImagePlusIcon, InfoIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createProjectAction, updateProjectAction } from "@/actions/projects";
import { FormMessage } from "@/components/common/form-message";
import { SmartImage } from "@/components/media/smart-image";
import { UploadError, uploadImage } from "@/components/media/use-upload";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { COLLAB_FORMATS, TEAM_ROLES, type CollabFormat, type TeamRole } from "@/lib/constants";
import { BUCKETS, MAX_UPLOAD_MB, publicStorageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type ProjectEditorInitial = {
  id: string;
  title: string;
  description: string;
  city: string | null;
  location: string | null;
  shoot_date: string | null;
  category_slug: string | null;
  looking_for: TeamRole[];
  collab_format: CollabFormat;
  terms: string | null;
  usage_rights: string | null;
  requirements: string | null;
  spots: number;
  cover_url: string | null;
  cover_path: string | null;
};

export function ProjectEditor({
  userId,
  categories,
  initial,
  defaultCity,
}: {
  userId: string;
  categories: { value: string; label: string }[];
  initial?: ProjectEditorInitial;
  defaultCity?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lookingFor, setLookingFor] = useState<TeamRole[]>(initial?.looking_for ?? ["model"]);
  const [format_, setFormat] = useState<CollabFormat>(initial?.collab_format ?? "tfp");
  const [cover, setCover] = useState<{ path: string | null; url: string | null }>({
    path: initial?.cover_path ?? null,
    url: initial?.cover_url ?? null,
  });
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const onCover = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, { bucket: BUCKETS.media, userId, folder: "projects", maxSize: 2000 });
      setCover({ path: uploaded.path, url: publicStorageUrl(BUCKETS.media, uploaded.path) });
    } catch (error) {
      const reason = error instanceof UploadError ? error.reason : "failed";
      toast.error(
        reason === "too_large"
          ? format(t.dashboardPortfolio.fileTooLarge, { name: file.name, size: MAX_UPLOAD_MB.media })
          : reason === "wrong_type"
            ? format(t.dashboardPortfolio.fileWrongType, { name: file.name })
            : t.errors.upload_failed,
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "");
    const input = {
      title: value("title"),
      description: value("description"),
      city: value("city"),
      location: value("location"),
      shoot_date: value("shoot_date"),
      category_slug: value("category_slug"),
      looking_for: lookingFor,
      collab_format: format_,
      terms: value("terms"),
      usage_rights: value("usage_rights"),
      requirements: value("requirements"),
      spots: value("spots"),
      cover_path: cover.path,
    };
    startSaving(async () => {
      const result = initial ? await updateProjectAction(initial.id, input) : await createProjectAction(input);
      if (result.ok) {
        toast.success(result.message);
        router.push(result.data ? `/projects/${result.data.id}` : "/dashboard/projects");
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <FormMessage error={formError} />

      <Field label={t.dashboardProjects.fields.title} htmlFor="title" error={errors.title}>
        <Input
          {...fieldAria("title", errors.title)}
          name="title"
          defaultValue={initial?.title}
          maxLength={120}
          placeholder={t.dashboardProjects.fields.titlePlaceholder}
          required
        />
      </Field>
      <Field label={t.dashboardProjects.fields.description} htmlFor="description" error={errors.description}>
        <Textarea
          {...fieldAria("description", errors.description)}
          name="description"
          defaultValue={initial?.description}
          maxLength={5000}
          rows={6}
          placeholder={t.dashboardProjects.fields.descriptionPlaceholder}
          required
        />
      </Field>

      <ChipGroup
        name="looking_for_view"
        legend={t.dashboardProjects.fields.lookingFor}
        options={TEAM_ROLES.map((role) => ({ value: role, label: t.enums.teamRole[role] }))}
        selected={lookingFor}
        onToggle={(value, checked) =>
          setLookingFor((current) =>
            checked ? [...new Set([...current, value as TeamRole])] : current.filter((v) => v !== value),
          )
        }
        error={errors.looking_for}
      />

      <fieldset>
        <legend className="mb-2.5 text-sm font-medium">{t.dashboardProjects.fields.collabFormat}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {COLLAB_FORMATS.map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground",
                format_ === value ? "border-foreground bg-surface" : "border-line-strong hover:border-foreground/50",
              )}
            >
              <input type="radio" name="collab_format" value={value} checked={format_ === value} onChange={() => setFormat(value)} className="sr-only" />
              <span className="text-[15px] font-medium">{t.enums.collabFormat[value]}</span>
              <span className="text-[13px] text-muted">{t.enums.collabFormatHint[value]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.dashboardProjects.fields.city} htmlFor="city" error={errors.city}>
          <Input {...fieldAria("city", errors.city)} name="city" defaultValue={initial?.city ?? defaultCity ?? ""} maxLength={80} />
        </Field>
        <Field label={t.dashboardProjects.fields.location} htmlFor="location" error={errors.location} optional={t.common.optional}>
          <Input
            {...fieldAria("location", errors.location)}
            name="location"
            defaultValue={initial?.location ?? ""}
            maxLength={160}
            placeholder={t.dashboardProjects.fields.locationPlaceholder}
          />
        </Field>
        <Field label={t.dashboardProjects.fields.shootDate} htmlFor="shoot_date" error={errors.shoot_date} hint={t.projects.dateFlexible}>
          <Input {...fieldAria("shoot_date", errors.shoot_date, true)} type="date" name="shoot_date" defaultValue={initial?.shoot_date ?? ""} />
        </Field>
        <Field label={t.dashboardProjects.fields.category} htmlFor="category_slug">
          <NativeSelect id="category_slug" name="category_slug" defaultValue={initial?.category_slug ?? ""}>
            <option value="">{t.dashboardPortfolio.noCategory}</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t.dashboardProjects.fields.spots} htmlFor="spots" error={errors.spots}>
          <Input {...fieldAria("spots", errors.spots)} type="number" name="spots" min={1} max={50} defaultValue={initial?.spots ?? 1} />
        </Field>
      </div>

      <Field label={t.dashboardProjects.fields.terms} htmlFor="terms" error={errors.terms} optional={t.common.optional}>
        <Textarea
          {...fieldAria("terms", errors.terms)}
          name="terms"
          defaultValue={initial?.terms ?? ""}
          maxLength={2000}
          rows={3}
          placeholder={t.dashboardProjects.fields.termsPlaceholder}
        />
      </Field>
      <Field
        label={t.dashboardProjects.fields.usageRights}
        htmlFor="usage_rights"
        error={errors.usage_rights}
        hint={format_ === "tfp" ? t.dashboardProjects.fields.usageRightsHint : undefined}
      >
        <Textarea
          {...fieldAria("usage_rights", errors.usage_rights, format_ === "tfp")}
          name="usage_rights"
          defaultValue={initial?.usage_rights ?? ""}
          maxLength={2000}
          rows={3}
          placeholder={t.dashboardProjects.fields.usageRightsPlaceholder}
        />
      </Field>
      <Field label={t.dashboardProjects.fields.requirements} htmlFor="requirements" error={errors.requirements} optional={t.common.optional}>
        <Textarea {...fieldAria("requirements", errors.requirements)} name="requirements" defaultValue={initial?.requirements ?? ""} maxLength={2000} rows={3} />
      </Field>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{t.dashboardProjects.fields.cover}</p>
        {cover.url ? (
          <div className="relative aspect-[16/9] max-w-md overflow-hidden rounded-xl bg-surface">
            <SmartImage src={cover.url} alt="" fill sizes="28rem" className="object-cover" />
            <Button
              variant="overlay"
              size="sm"
              className="absolute right-3 bottom-3"
              onClick={() => setCover({ path: null, url: null })}
            >
              <Trash2Icon />
              {t.common.remove}
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="self-start" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <LoaderCircleIcon className="animate-spin" /> : <ImagePlusIcon />}
            {t.common.upload}
          </Button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={t.dashboardProjects.fields.cover}
          onChange={(e) => {
            void onCover(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="text-[13px] text-muted">{format(t.dashboardProjects.fields.coverHint, { size: MAX_UPLOAD_MB.media })}</p>
      </div>

      <p className="flex gap-2.5 rounded-lg bg-surface px-4 py-3 text-sm text-muted">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        {t.dashboardProjects.contactNote}
      </p>

      <div className="sticky bottom-0 -mx-1 flex gap-2 border-t border-line bg-background/90 px-1 py-4 backdrop-blur">
        <Button type="submit" size="lg" disabled={saving || uploading}>
          {saving ? <LoaderCircleIcon className="animate-spin" /> : null}
          {initial ? t.dashboardProjects.saveSubmit : t.dashboardProjects.createSubmit}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => router.back()} disabled={saving}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
