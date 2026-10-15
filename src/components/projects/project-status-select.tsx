"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setProjectStatusAction } from "@/actions/projects";
import { NativeSelect } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";

export function ProjectStatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <NativeSelect
      aria-label={t.dashboardProjects.changeStatus}
      value={value}
      disabled={pending}
      className="h-9 w-auto text-sm"
      onChange={(e) => {
        const next = e.target.value as ProjectStatus;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const result = await setProjectStatusAction(projectId, next);
          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else {
            setValue(previous);
            toast.error(result.error);
          }
        });
      }}
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t.enums.projectStatus[s]}
        </option>
      ))}
    </NativeSelect>
  );
}
