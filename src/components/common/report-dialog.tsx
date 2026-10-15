"use client";

import { FlagIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitReportAction } from "@/actions/social";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { REPORT_REASONS, type ReportReason, type ReportTarget } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ReportDialog({
  targetType,
  targetId,
  isAuthenticated,
  trigger,
  variant = "ghost",
  size = "sm",
  label,
  open: controlledOpen,
  onOpenChange,
}: {
  targetType: ReportTarget;
  targetId: string;
  isAuthenticated: boolean;
  trigger?: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [reason, setReason] = useState<ReportReason>(targetType === "message" ? "harassment" : "inappropriate");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  const reasons = REPORT_REASONS.filter((r) =>
    targetType === "message" ? !["copyright", "unauthorized_photo"].includes(r) : true,
  );

  const onOpen = (value: boolean) => {
    if (value && !isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setOpen(value);
  };

  const submit = () =>
    startTransition(async () => {
      const result = await submitReportAction({ targetType, targetId, reason, details });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setDetails("");
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      {trigger !== null ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant={variant} size={size}>
              <FlagIcon />
              {label ?? t.report.title}
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>{t.report.title}</DialogTitle>
          <DialogDescription>{targetType === "message" ? t.report.messageNote : t.report.text}</DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t.report.reason}</legend>
          {reasons.map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[15px] transition-colors",
                reason === value ? "border-foreground bg-surface" : "border-line hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="size-4 accent-foreground"
              />
              {t.enums.reportReason[value]}
            </label>
          ))}
        </fieldset>
        <Field label={t.report.details} htmlFor="report-details" optional={t.common.optional}>
          <Textarea
            id="report-details"
            value={details}
            maxLength={2000}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t.report.detailsPlaceholder}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? t.common.sending : t.report.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
