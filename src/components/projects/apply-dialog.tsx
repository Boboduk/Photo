"use client";

import { SendIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { applyToProjectAction } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import type { TeamRole } from "@/lib/constants";

export function ApplyDialog({
  projectId,
  roles,
  isAuthenticated,
  label,
}: {
  projectId: string;
  roles: TeamRole[];
  isAuthenticated: boolean;
  label?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<TeamRole>(roles[0] ?? "model");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button asChild size="lg" className="w-full">
        <Link href={`/login?next=/projects/${projectId}`}>{t.projects.loginToApply}</Link>
      </Button>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await applyToProjectAction({ projectId, role, message });
      if (result.ok) {
        setOpen(false);
        setMessage("");
        toast.success(result.message, {
          action: result.data
            ? { label: t.projects.openChat, onClick: () => router.push(`/dashboard/messages/${result.data!.conversationId}`) }
            : undefined,
        });
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <SendIcon />
          {label ?? t.projects.apply}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t.common.close}>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t.projects.applyTitle}</DialogTitle>
            <DialogDescription>{t.projects.applyText}</DialogDescription>
          </DialogHeader>
          <Field label={t.projects.applyRole} htmlFor="apply-role">
            <NativeSelect id="apply-role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
              {roles.map((value) => (
                <option key={value} value={value}>
                  {t.enums.teamRole[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t.projects.applyMessage} htmlFor="apply-message" error={errors.message}>
            <Textarea
              {...fieldAria("apply-message", errors.message)}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.projects.applyMessagePlaceholder}
              maxLength={1000}
              required
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending || message.trim().length === 0}>
              {pending ? t.common.sending : t.projects.applySubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
