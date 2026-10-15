"use client";

import { BookmarkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/actions/social";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function SaveButton({
  itemId,
  saved,
  isAuthenticated,
  variant = "overlay",
  withLabel = false,
}: {
  itemId: string;
  saved: boolean;
  isAuthenticated: boolean;
  variant?: "overlay" | "plain";
  withLabel?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState(saved);
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [, startTransition] = useTransition();

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      setOptimistic(!state);
      const result = await toggleFavoriteAction({ itemId });
      if (result.ok && result.data) setState(result.data.saved);
      else if (!result.ok) toast.error(result.error);
    });
  };

  const label = optimistic ? t.portfolio.unsave : t.portfolio.save;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all active:scale-90",
        variant === "overlay"
          ? "size-9 bg-white/90 text-foreground backdrop-blur hover:bg-white"
          : "h-10 border border-line-strong px-4 hover:border-foreground",
      )}
    >
      <BookmarkIcon className={cn("size-[18px]", optimistic ? "fill-foreground" : "")} />
      {withLabel ? <span>{optimistic ? t.favorites.title : t.common.save}</span> : null}
    </button>
  );
}
