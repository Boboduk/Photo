"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { decideOAuthAction } from "@/actions/oauth";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function ConsentActions({ authorizationId }: { authorizationId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<boolean | null>(null);

  const decide = (approve: boolean) => {
    setChoice(approve);
    startTransition(async () => {
      const result = await decideOAuthAction(authorizationId, approve);
      if (result.ok && result.data) {
        // Адрес приложения (часто localhost у десктопных клиентов) — переходим полной навигацией.
        window.location.assign(result.data.url);
      } else {
        toast.error(result.ok ? t.errors.generic : result.error);
        setChoice(null);
      }
    });
  };

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row">
      <Button variant="outline" size="lg" className="flex-1" disabled={pending} onClick={() => decide(false)}>
        {pending && choice === false ? <LoaderCircleIcon className="animate-spin" /> : null}
        {t.oauth.deny}
      </Button>
      <Button size="lg" className="flex-1" disabled={pending} onClick={() => decide(true)}>
        {pending && choice === true ? <LoaderCircleIcon className="animate-spin" /> : null}
        {t.oauth.approve}
      </Button>
    </div>
  );
}
