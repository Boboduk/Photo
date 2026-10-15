"use client";

import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createPortfolioItemAction, updatePortfolioItemAction } from "@/actions/portfolio";
import { FormMessage } from "@/components/common/form-message";
import { UploadError, uploadImage } from "@/components/media/use-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { imageLoaderFor } from "@/lib/images";
import { BUCKETS, MAX_IMAGES_PER_WORK, MAX_UPLOAD_MB } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { PortfolioItemInput } from "@/lib/validation/portfolio";
import { CreditsEditor, type CreditDraft } from "./credits-editor";

type EditorImage =
  | { key: string; kind: "existing"; id: string; url: string }
  | { key: string; kind: "new"; preview: string; storage_path?: string; width?: number; height?: number; uploading: boolean };

export type WorkEditorInitial = {
  id: string;
  title: string;
  description: string | null;
  category_slug: string | null;
  shot_on: string | null;
  is_published: boolean;
  tags: string[];
  credits: CreditDraft[];
  images: { id: string; url: string }[];
};

export function WorkEditor({
  userId,
  categories,
  initial,
}: {
  userId: string;
  categories: { value: string; label: string }[];
  initial?: WorkEditorInitial;
}) {
  const t = useT();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<EditorImage[]>(
    initial?.images.map((image) => ({ key: image.id, kind: "existing", id: image.id, url: image.url })) ?? [],
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category_slug ?? "");
  const [shotOn, setShotOn] = useState(initial?.shot_on ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [credits, setCredits] = useState<CreditDraft[]>(initial?.credits ?? []);
  const [published, setPublished] = useState(initial?.is_published ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string>();
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();

  const uploading = images.some((image) => image.kind === "new" && image.uploading);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const room = MAX_IMAGES_PER_WORK - images.length;
    if (list.length > room) {
      toast.error(format(t.dashboardPortfolio.tooManyImages, { max: MAX_IMAGES_PER_WORK }));
    }
    const accepted = list.slice(0, Math.max(room, 0));
    const drafts = accepted.map((file) => ({
      file,
      draft: { key: crypto.randomUUID(), kind: "new" as const, preview: URL.createObjectURL(file), uploading: true },
    }));
    setImages((current) => [...current, ...drafts.map((d) => d.draft)]);

    await Promise.all(
      drafts.map(async ({ file, draft }) => {
        try {
          const uploaded = await uploadImage(file, { bucket: BUCKETS.media, userId, folder: "portfolio", maxSize: 2560 });
          setImages((current) =>
            current.map((image) =>
              image.key === draft.key
                ? { ...draft, uploading: false, storage_path: uploaded.path, width: uploaded.width, height: uploaded.height }
                : image,
            ),
          );
        } catch (error) {
          setImages((current) => current.filter((image) => image.key !== draft.key));
          URL.revokeObjectURL(draft.preview);
          const reason = error instanceof UploadError ? error.reason : "failed";
          toast.error(
            reason === "too_large"
              ? format(t.dashboardPortfolio.fileTooLarge, { name: file.name, size: MAX_UPLOAD_MB.media })
              : reason === "wrong_type"
                ? format(t.dashboardPortfolio.fileWrongType, { name: file.name })
                : t.errors.upload_failed,
          );
        }
      }),
    );
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const remove = (key: string) => {
    const image = images.find((i) => i.key === key);
    setImages((current) => current.filter((i) => i.key !== key));
    // Новые, ещё не сохранённые файлы удаляем из хранилища сразу.
    if (image?.kind === "new" && image.storage_path) {
      void createClient().storage.from(BUCKETS.media).remove([image.storage_path]);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (images.length === 0) {
      setErrors({ images: [t.dashboardPortfolio.imagesRequired] });
      return;
    }
    const input: PortfolioItemInput = {
      title,
      description,
      category_slug: category,
      shot_on: shotOn,
      is_published: published,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      credits: credits.map((c) => ({ profile_id: c.profile_id, name: c.name, role: c.role })),
      images: images.map((image) =>
        image.kind === "existing"
          ? { kind: "existing" as const, id: image.id }
          : { kind: "new" as const, storage_path: image.storage_path!, width: image.width!, height: image.height! },
      ),
    };

    startSaving(async () => {
      const result = initial ? await updatePortfolioItemAction(initial.id, input) : await createPortfolioItemAction(input);
      if (result.ok) {
        toast.success(result.message);
        router.push(result.data ? `/portfolio/${result.data.id}` : "/dashboard/portfolio");
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-8" noValidate>
      <FormMessage error={formError} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t.dashboardPortfolio.images}</h2>
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (e.dataTransfer.files.length > 0) {
              e.preventDefault();
              setDragOver(false);
              void addFiles(e.dataTransfer.files);
            }
          }}
          className={cn(
            "grid grid-cols-2 gap-3 rounded-xl border-2 border-dashed p-3 transition-colors sm:grid-cols-3 lg:grid-cols-4",
            dragOver ? "border-foreground bg-surface" : "border-line-strong",
            errors.images && "border-danger/60",
          )}
        >
          {images.map((image, index) => (
            <div
              key={image.key}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                if (dragIndex !== null) e.preventDefault();
              }}
              onDrop={(e) => {
                if (dragIndex !== null) {
                  e.preventDefault();
                  e.stopPropagation();
                  move(dragIndex, index);
                  setDragIndex(null);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "group relative aspect-[4/5] cursor-grab overflow-hidden rounded-lg bg-surface active:cursor-grabbing",
                dragIndex === index && "opacity-50",
              )}
            >
              <Image
                src={image.kind === "existing" ? image.url : image.preview}
                alt=""
                fill
                sizes="(min-width: 1024px) 15vw, 40vw"
                className="object-cover"
                unoptimized={image.kind === "new"}
                loader={image.kind === "existing" ? imageLoaderFor(image.url) : undefined}
              />
              {image.kind === "new" && image.uploading ? (
                <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <LoaderCircleIcon className="size-6 animate-spin" />
                </span>
              ) : null}
              {index === 0 ? (
                <Badge variant="dark" className="absolute top-2 left-2">
                  {t.dashboardPortfolio.coverBadge}
                </Badge>
              ) : null}
              <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                <div className="flex gap-1">
                  <Button
                    variant="overlay"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label={t.dashboardPortfolio.moveImageLeft}
                  >
                    <ArrowLeftIcon />
                  </Button>
                  <Button
                    variant="overlay"
                    size="icon-sm"
                    disabled={index === images.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label={t.dashboardPortfolio.moveImageRight}
                  >
                    <ArrowRightIcon />
                  </Button>
                </div>
                <Button variant="overlay" size="icon-sm" onClick={() => remove(image.key)} aria-label={t.dashboardPortfolio.removeImage}>
                  <XIcon />
                </Button>
              </div>
            </div>
          ))}
          {images.length < MAX_IMAGES_PER_WORK ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={cn(
                "flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-lg bg-surface px-4 text-center text-sm text-muted transition-colors hover:bg-surface-strong hover:text-foreground",
                images.length === 0 && "col-span-2 aspect-auto py-14 sm:col-span-3 lg:col-span-4",
              )}
            >
              <ImagePlusIcon className="size-6" />
              {t.dashboardPortfolio.dropzone}
            </button>
          ) : null}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          aria-label={t.dashboardPortfolio.images}
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className={cn("text-[13px]", errors.images ? "text-danger" : "text-muted")} role={errors.images ? "alert" : undefined}>
          {errors.images?.[0] ??
            format(t.dashboardPortfolio.imagesHint, { size: MAX_UPLOAD_MB.media, max: MAX_IMAGES_PER_WORK })}
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.dashboardPortfolio.workTitle} htmlFor="title" error={errors.title} className="sm:col-span-2">
          <Input {...fieldAria("title", errors.title)} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </Field>
        <Field label={t.dashboardPortfolio.description} htmlFor="description" error={errors.description} className="sm:col-span-2" optional={t.common.optional}>
          <Textarea
            {...fieldAria("description", errors.description)}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={3000}
            rows={4}
            placeholder={t.dashboardPortfolio.descriptionPlaceholder}
          />
        </Field>
        <Field label={t.dashboardPortfolio.category} htmlFor="category">
          <NativeSelect id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t.dashboardPortfolio.noCategory}</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t.dashboardPortfolio.shotOn} htmlFor="shot_on" error={errors.shot_on} optional={t.common.optional}>
          <Input {...fieldAria("shot_on", errors.shot_on)} type="date" value={shotOn} onChange={(e) => setShotOn(e.target.value)} />
        </Field>
        <Field label={t.dashboardPortfolio.tags} htmlFor="tags" hint={t.dashboardPortfolio.tagsHint} error={errors.tags ?? errors["tags.0"]} className="sm:col-span-2">
          <Input {...fieldAria("tags", errors.tags, true)} value={tags} onChange={(e) => setTags(e.target.value)} maxLength={400} placeholder={t.dashboardPortfolio.tagsPlaceholder} />
        </Field>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t.dashboardPortfolio.credits}</h2>
        <CreditsEditor credits={credits} onChange={setCredits} excludeUserId={userId} />
      </section>

      <label className="flex cursor-pointer items-start justify-between gap-6 rounded-xl border border-line p-4">
        <span>
          <span className="block text-[15px] font-medium">{t.dashboardPortfolio.publishNow}</span>
          <span className="mt-0.5 block text-sm text-muted">{t.dashboardPortfolio.publishHint}</span>
        </span>
        <Switch checked={published} onCheckedChange={setPublished} aria-label={t.dashboardPortfolio.publishNow} />
      </label>

      <div className="sticky bottom-0 -mx-1 flex gap-2 border-t border-line bg-background/90 px-1 py-4 backdrop-blur">
        <Button type="submit" size="lg" disabled={saving || uploading}>
          {saving || uploading ? <LoaderCircleIcon className="animate-spin" /> : null}
          {uploading ? t.common.uploading : initial ? t.dashboardPortfolio.saveSubmit : t.dashboardPortfolio.createSubmit}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => router.back()} disabled={saving}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
