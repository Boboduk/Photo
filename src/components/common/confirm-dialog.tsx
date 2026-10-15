"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
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
import { useT } from "@/i18n/client";

/** Подтверждение опасного действия. onConfirm может вернуть false, чтобы не закрывать окно. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  children,
  confirmDisabled,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => Promise<boolean | void> | boolean | void;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  const t = useT();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent closeLabel={t.common.close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button
            variant={confirmVariant}
            disabled={pending || confirmDisabled}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (result !== false) setOpen(false);
              })
            }
          >
            {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
