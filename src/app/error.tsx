"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex min-h-[60dvh] flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t.pages.errorTitle}</h1>
      <p className="mt-3 max-w-md text-muted">{t.pages.errorText}</p>
      <Button className="mt-8" onClick={reset}>
        {t.common.tryAgain}
      </Button>
    </div>
  );
}
