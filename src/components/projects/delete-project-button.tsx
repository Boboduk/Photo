"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProjectAction } from "@/actions/projects";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function DeleteProjectButton({ projectId, redirectTo }: { projectId: string; redirectTo?: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft">
          <Trash2Icon />
          {t.common.delete}
        </Button>
      }
      title={t.dashboardProjects.deleteTitle}
      description={t.dashboardProjects.deleteText}
      confirmLabel={t.common.delete}
      onConfirm={async () => {
        const result = await deleteProjectAction(projectId);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(result.message);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      }}
    />
  );
}
