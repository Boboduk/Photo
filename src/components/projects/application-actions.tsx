"use client";

import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { setApplicationStatusAction } from "@/actions/projects";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { ApplicationStatus } from "@/lib/constants";

/** Кнопки автора проекта: принять, отклонить, вернуть на рассмотрение. */
export function ApplicationDecision({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const set = (next: ApplicationStatus) =>
    startTransition(async () => {
      const result = await setApplicationStatusAction(applicationId, next);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.error);
    });

  if (status === "withdrawn") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "accepted" ? (
        <Button size="sm" disabled={pending} onClick={() => set("accepted")}>
          <CheckIcon />
          {t.dashboardProjects.accept}
        </Button>
      ) : null}
      {status !== "declined" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("declined")}>
          <XIcon />
          {t.dashboardProjects.decline}
        </Button>
      ) : null}
      {status !== "pending" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("pending")}>
          <RotateCcwIcon />
          {t.dashboardProjects.resetStatus}
        </Button>
      ) : null}
    </div>
  );
}

/** Откликнувшийся отзывает свой отклик. */
export function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost">
          {t.applications.withdraw}
        </Button>
      }
      title={t.applications.withdrawTitle}
      description={t.applications.withdrawText}
      confirmLabel={t.applications.withdraw}
      onConfirm={async () => {
        const result = await setApplicationStatusAction(applicationId, "withdrawn");
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(result.message);
        router.refresh();
      }}
    />
  );
}
