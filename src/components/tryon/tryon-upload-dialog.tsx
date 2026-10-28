"use client";

import { ImagePlusIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { addTryOnGarmentAction, addTryOnModelAction } from "@/actions/tryon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { UploadError, uploadImage } from "@/components/media/use-upload";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format";
import { GARMENT_CATEGORIES, type GarmentCategory } from "@/lib/constants";
import { BUCKETS, MAX_UPLOAD_MB } from "@/lib/storage";
import { TRYON_LIMITS, TRYON_UPLOAD_SIZE } from "@/lib/tryon/config";
import { cn } from "@/lib/utils";

type Kind = "model" | "garment";

/** Загрузка фото модели или наряда: файл уходит в приватный бакет, затем сохраняется запись. */
export function TryOnUploadDialog({
  kind,
  userId,
  open,
  onOpenChange,
}: {
  kind: Kind;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const ids = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GarmentCategory>("top");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const texts = kind === "model" ? t.tryon.models : t.tryon.garments;

  const previewRef = useRef<string | null>(null);
  const setPreviewFor = (next: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setPreview(previewRef.current);
  };
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const reset = () => {
    setFile(null);
    setPreviewFor(null);
    setName("");
    setCategory("top");
    setConsent(false);
    setErrors({});
    if (input.current) input.current.value = "";
  };

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    setFile(picked);
    setPreviewFor(picked);
    setErrors((current) => ({ ...current, file: [] }));
    if (!name) setName(picked.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, TRYON_LIMITS.nameMax));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string[]> = {};
    if (!file) nextErrors.file = [t.validation.required];
    if (!name.trim()) nextErrors.name = [t.validation.required];
    if (kind === "model" && !consent) nextErrors.consent = [t.validation.mustAccept];
    setErrors(nextErrors);
    if (!file || Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const uploaded = await uploadImage(file, {
        bucket: BUCKETS.tryon,
        userId,
        folder: kind === "model" ? "models" : "garments",
        maxSize: TRYON_UPLOAD_SIZE[kind],
        background: kind === "garment" ? "#ffffff" : undefined,
      });
      const payload = { name, storage_path: uploaded.path, width: uploaded.width, height: uploaded.height };
      const result =
        kind === "model"
          ? await addTryOnModelAction({ ...payload, consent: true })
          : await addTryOnGarmentAction({ ...payload, category });
      if (result.ok) {
        toast.success(result.message ?? t.common.saved);
        reset();
        onOpenChange(false);
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof UploadError && error.reason === "too_large"
          ? format(t.dashboardPortfolio.fileTooLarge, { name: error.fileName, size: MAX_UPLOAD_MB.tryon })
          : error instanceof UploadError && error.reason === "wrong_type"
            ? format(t.dashboardPortfolio.fileWrongType, { name: error.fileName })
            : t.errors.upload_failed,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (busy) return;
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>{texts.dialogTitle}</DialogTitle>
          <DialogDescription>{texts.dialogText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <Field label={texts.photo} htmlFor={`${ids}-file`} error={errors.file} hint={format(t.tryon.fileHint, { size: MAX_UPLOAD_MB.tryon })}>
            <input
              ref={input}
              id={`${ids}-file`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className={cn(
                "relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface text-sm text-muted transition-colors hover:border-foreground",
                kind === "model" ? "aspect-[3/4] max-h-80" : "aspect-square max-h-64",
              )}
            >
              {preview ? (
                // Локальный предпросмотр (blob:) — next/image для него не нужен.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className={cn("absolute inset-0 size-full", kind === "model" ? "object-cover" : "object-contain")} />
              ) : (
                <span className="flex flex-col items-center gap-2 px-6 text-center">
                  <ImagePlusIcon className="size-6" />
                  {t.dashboardPortfolio.dropzone}
                </span>
              )}
            </button>
          </Field>

          <Field label={texts.name} htmlFor={`${ids}-name`} error={errors.name}>
            <Input
              {...fieldAria(`${ids}-name`, errors.name)}
              value={name}
              maxLength={TRYON_LIMITS.nameMax}
              placeholder={texts.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </Field>

          {kind === "garment" ? (
            <Field label={t.tryon.garments.category} htmlFor={`${ids}-category`} error={errors.category}>
              <NativeSelect
                id={`${ids}-category`}
                value={category}
                onChange={(e) => setCategory(e.target.value as GarmentCategory)}
                disabled={busy}
              >
                {GARMENT_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {t.enums.garmentCategory[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-3 text-sm leading-relaxed">
                <Checkbox
                  className="mt-0.5"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-invalid={errors.consent?.length ? true : undefined}
                  disabled={busy}
                />
                {t.tryon.models.consent}
              </label>
              {errors.consent?.length ? (
                <p role="alert" className="text-[13px] text-danger">
                  {errors.consent[0]}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
              {busy ? t.common.uploading : t.common.upload}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
