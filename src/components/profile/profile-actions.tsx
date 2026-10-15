"use client";

import { BanIcon, BookmarkIcon, EllipsisIcon, FlagIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { setBlockAction, toggleFavoriteAction } from "@/actions/social";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ReportDialog } from "@/components/common/report-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** «В избранное», «Пожаловаться», «Заблокировать» на странице профиля. */
export function ProfileActions({
  profileId,
  isAuthenticated,
  favorite,
  blocked,
}: {
  profileId: string;
  isAuthenticated: boolean;
  favorite: boolean;
  blocked: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [saved, setSaved] = useState(favorite);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const requireAuth = () => {
    if (isAuthenticated) return true;
    router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    return false;
  };

  const toggleFavorite = () => {
    if (!requireAuth()) return;
    startTransition(async () => {
      setOptimisticSaved(!saved);
      const result = await toggleFavoriteAction({ profileId });
      if (result.ok && result.data) setSaved(result.data.saved);
      else if (!result.ok) toast.error(result.error);
    });
  };

  const toggleBlock = async () => {
    const result = await setBlockAction(profileId, !blocked);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={toggleFavorite} aria-pressed={optimisticSaved}>
        <BookmarkIcon className={cn(optimisticSaved && "fill-foreground")} />
        {optimisticSaved ? t.profile.inFavorites : t.profile.addFavorite}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label={t.common.moreActions}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => requireAuth() && setReportOpen(true)}>
            <FlagIcon />
            {t.profile.report}
          </DropdownMenuItem>
          {blocked ? (
            <DropdownMenuItem onSelect={() => requireAuth() && startTransition(toggleBlock)}>
              <BanIcon />
              {t.profile.unblock}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem destructive onSelect={() => requireAuth() && setBlockOpen(true)}>
              <BanIcon />
              {t.profile.block}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        targetType="profile"
        targetId={profileId}
        isAuthenticated={isAuthenticated}
        trigger={null}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
      <ConfirmDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title={t.profile.blockTitle}
        description={t.profile.blockText}
        confirmLabel={t.profile.block}
        onConfirm={toggleBlock}
      />
    </>
  );
}
