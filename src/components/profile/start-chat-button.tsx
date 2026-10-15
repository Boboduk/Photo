"use client";

import { LoaderCircleIcon, MessageCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { startConversationAction } from "@/actions/social";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useT } from "@/i18n/client";

/** «Написать»: открывает существующий диалог или создаёт новый. */
export function StartChatButton({
  userId,
  isAuthenticated,
  label,
  variant = "primary",
  size = "md",
  className,
}: {
  userId: string;
  isAuthenticated: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      const result = await startConversationAction(userId);
      if (result && !result.ok) toast.error(result.error);
    });
  };

  return (
    <Button variant={variant} size={size} onClick={onClick} disabled={pending} className={className}>
      {pending ? <LoaderCircleIcon className="animate-spin" /> : <MessageCircleIcon />}
      {label ?? t.profile.writeMessage}
    </Button>
  );
}
