"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Кнопка отправки формы с индикатором загрузки. */
export function SubmitButton({ children, pendingText, disabled, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
