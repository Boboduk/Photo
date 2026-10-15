"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { removeMyCreditAction } from "@/actions/portfolio";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function RemoveCreditButton({ creditId }: { creditId: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="link"
      size="sm"
      className="mt-3 text-muted"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeMyCreditAction(creditId);
          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else toast.error(result.error);
        })
      }
    >
      {t.portfolio.removeMyCredit}
    </Button>
  );
}
