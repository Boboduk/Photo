"use client";

import { BanIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setUserBanAction, setUserRoleAction } from "@/actions/admin";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { APP_ROLES, type AppRole } from "@/lib/constants";

export function UserBanButton({ userId, name, banned, disabled }: { userId: string; name: string; banned: boolean; disabled?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (banned) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending || disabled}
        onClick={() =>
          startTransition(async () => {
            const result = await setUserBanAction(userId, false);
            if (result.ok) {
              toast.success(result.message);
              router.refresh();
            } else toast.error(result.error);
          })
        }
      >
        <ShieldCheckIcon />
        {t.admin.unban}
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="danger-outline" disabled={disabled}>
          <BanIcon />
          {t.admin.ban}
        </Button>
      }
      title={format(t.admin.banTitle, { name })}
      description={t.admin.banText}
      confirmLabel={t.admin.ban}
      onConfirm={async () => {
        const result = await setUserBanAction(userId, true, reason);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(result.message);
        router.refresh();
      }}
    >
      <Field label={t.admin.banReason} htmlFor={`ban-${userId}`} optional={t.common.optional}>
        <Textarea id={`ban-${userId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
      </Field>
    </ConfirmDialog>
  );
}

export function UserRoleSelect({ userId, role, disabled }: { userId: string; role: AppRole; disabled?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [pending, startTransition] = useTransition();
  return (
    <NativeSelect
      aria-label={t.admin.changeRole}
      value={value}
      disabled={disabled || pending}
      className="h-9 w-auto text-sm"
      onChange={(e) => {
        const next = e.target.value as AppRole;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const result = await setUserRoleAction(userId, next);
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
      {APP_ROLES.map((r) => (
        <option key={r} value={r}>
          {t.enums.role[r]}
        </option>
      ))}
    </NativeSelect>
  );
}
