"use client";

import { LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function CopyLinkButton() {
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success(t.common.linkCopied);
        } catch {
          toast.error(t.errors.generic);
        }
      }}
    >
      <LinkIcon />
      {t.common.copyLink}
    </Button>
  );
}
