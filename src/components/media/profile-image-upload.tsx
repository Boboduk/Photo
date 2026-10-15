"use client";

import { CameraIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { setProfileImageAction } from "@/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { BUCKETS, MAX_UPLOAD_MB } from "@/lib/storage";
import { SmartImage } from "./smart-image";
import { UploadError, uploadImage } from "./use-upload";

/** Загрузка аватара или обложки профиля. */
export function ProfileImageUpload({
  kind,
  userId,
  name,
  initialUrl,
}: {
  kind: "avatar" | "cover";
  userId: string;
  name: string;
  initialUrl: string | null;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadImage(file, {
        bucket: BUCKETS.avatars,
        userId,
        folder: kind,
        maxSize: kind === "avatar" ? 640 : 2400,
      });
      const result = await setProfileImageAction(kind, uploaded.path);
      if (result.ok) {
        setUrl(result.data?.url ?? null);
        toast.success(t.common.saved);
      } else toast.error(result.error);
    } catch (error) {
      if (error instanceof UploadError) {
        toast.error(
          error.reason === "too_large"
            ? format(t.dashboardPortfolio.fileTooLarge, { name: error.fileName, size: MAX_UPLOAD_MB.avatars })
            : error.reason === "wrong_type"
              ? format(t.dashboardPortfolio.fileWrongType, { name: error.fileName })
              : t.errors.upload_failed,
        );
      } else toast.error(t.errors.upload_failed);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    const result = await setProfileImageAction(kind, null);
    setBusy(false);
    if (result.ok) setUrl(null);
    else toast.error(result.error);
  };

  const label = kind === "avatar" ? t.profileForm.avatar : t.profileForm.cover;

  return (
    <div className={kind === "avatar" ? "flex items-center gap-5" : "flex flex-col gap-3"}>
      {kind === "avatar" ? (
        <div className="relative">
          <Avatar src={url} name={name} size="xl" />
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
              <LoaderCircleIcon className="size-6 animate-spin" />
            </span>
          ) : null}
        </div>
      ) : (
        <div className="relative aspect-[4/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-surface to-surface-strong">
          {url ? <SmartImage src={url} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" /> : null}
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-white/60">
              <LoaderCircleIcon className="size-6 animate-spin" />
            </span>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          id={`upload-${kind}`}
          onChange={(e) => onFile(e.target.files?.[0])}
          disabled={busy}
        />
        <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()} aria-label={`${label}: ${t.profileForm.changePhoto}`}>
          <CameraIcon />
          {url ? t.profileForm.changePhoto : t.common.upload}
        </Button>
        {url ? (
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            <Trash2Icon />
            {t.profileForm.removePhoto}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
