"use client";

import { CheckIcon, EyeIcon, EyeOffIcon, RotateCcwIcon, Trash2Icon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteContentAction, resolveReportAction, setContentHiddenAction } from "@/actions/admin";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useT } from "@/i18n/client";

type ContentType = "portfolio_item" | "project";

export function ContentModeration({ type, id, hidden }: { type: ContentType; id: string; hidden: boolean }) {
  const t = useT();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {hidden ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setContentHiddenAction(type, id, false);
              if (result.ok) {
                toast.success(result.message);
                router.refresh();
              } else toast.error(result.error);
            })
          }
        >
          <EyeIcon />
          {t.admin.unhide}
        </Button>
      ) : (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline">
              <EyeOffIcon />
              {t.admin.hide}
            </Button>
          }
          title={t.admin.hide}
          confirmLabel={t.admin.hide}
          confirmVariant="primary"
          onConfirm={async () => {
            const result = await setContentHiddenAction(type, id, true, reason);
            if (!result.ok) {
              toast.error(result.error);
              return false;
            }
            toast.success(result.message);
            router.refresh();
          }}
        >
          <Field label={t.admin.hideReason} htmlFor={`hide-${id}`} optional={t.common.optional}>
            <Textarea id={`hide-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
          </Field>
        </ConfirmDialog>
      )}
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="danger-outline">
            <Trash2Icon />
            {t.common.delete}
          </Button>
        }
        title={t.admin.deleteContentTitle}
        description={t.admin.deleteContentText}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const result = await deleteContentAction(type, id);
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          toast.success(result.message);
          router.refresh();
        }}
      />
    </div>
  );
}

export function ReportResolution({ reportId, status }: { reportId: string; status: "open" | "resolved" | "dismissed" }) {
  const t = useT();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const update = (next: "open" | "resolved" | "dismissed") =>
    startTransition(async () => {
      const result = await resolveReportAction(reportId, next, note);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.error);
    });

  if (status !== "open") {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => update("open")}>
        <RotateCcwIcon />
        {t.admin.reopen}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder={t.admin.resolutionNote}
        aria-label={t.admin.resolutionNote}
        className="min-h-16 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => update("resolved")}>
          <CheckIcon />
          {t.admin.resolve}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => update("dismissed")}>
          <XIcon />
          {t.admin.dismiss}
        </Button>
      </div>
    </div>
  );
}
