"use client";

import { HeartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleLikeAction } from "@/actions/social";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type LikeState = { liked: boolean; count: number };

export function LikeButton({
  itemId,
  liked,
  count,
  isAuthenticated,
  variant = "overlay",
  showCount = true,
}: {
  itemId: string;
  liked: boolean;
  count: number;
  isAuthenticated: boolean;
  variant?: "overlay" | "plain";
  showCount?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<LikeState>({ liked, count });
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [, startTransition] = useTransition();

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      toast(t.portfolio.loginToLike, {
        action: { label: t.nav.login, onClick: () => router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`) },
      });
      return;
    }
    startTransition(async () => {
      setOptimistic({ liked: !state.liked, count: state.count + (state.liked ? -1 : 1) });
      const result = await toggleLikeAction(itemId);
      if (result.ok && result.data) {
        setState({ liked: result.data.liked, count: result.data.likesCount });
      } else if (!result.ok) {
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? t.portfolio.unlike : t.portfolio.like}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition-all active:scale-90",
        variant === "overlay"
          ? "h-9 bg-white/90 px-3 text-foreground backdrop-blur hover:bg-white"
          : "h-10 border border-line-strong px-4 hover:border-foreground",
        !showCount && "w-9 justify-center px-0",
      )}
    >
      <HeartIcon
        className={cn("size-[18px] transition-colors", optimistic.liked ? "fill-brand text-brand" : "")}
        strokeWidth={2}
      />
      {showCount ? <span className="tabular-nums">{optimistic.count}</span> : null}
    </button>
  );
}
