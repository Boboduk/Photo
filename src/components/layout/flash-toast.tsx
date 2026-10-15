"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";

/** Сообщение после редиректа: /?m=account-deleted */
export function FlashToast() {
  const t = useT();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("m");

  useEffect(() => {
    if (!key) return;
    const messages: Record<string, string> = {
      "account-deleted": t.settings.deleted,
    };
    if (messages[key]) toast.success(messages[key]);
    const next = new URLSearchParams(params.toString());
    next.delete("m");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [key, params, pathname, router, t]);

  return null;
}
