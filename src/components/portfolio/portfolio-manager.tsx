"use client";

import { ArrowDownIcon, ArrowUpIcon, EllipsisIcon, EyeIcon, EyeOffIcon, HeartIcon, PencilIcon, StarIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deletePortfolioItemAction,
  reorderPortfolioAction,
  setCoverAction,
  setPublishedAction,
} from "@/actions/portfolio";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SmartImage } from "@/components/media/smart-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/client";

export type ManagedItem = {
  id: string;
  title: string;
  cover_image_url: string | null;
  is_published: boolean;
  is_cover: boolean;
  hidden_at: string | null;
  likes_count: number;
  images_count: number;
};

/** Управление своими работами: порядок, публикация, обложка, удаление. */
export function PortfolioManager({ initialItems }: { initialItems: ManagedItem[] }) {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string; message?: string }>, optimistic?: () => void) => {
    optimistic?.();
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        setItems(initialItems);
      } else if (result.message) {
        toast.success(result.message);
      }
      router.refresh();
    });
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    run(() => reorderPortfolioAction(next.map((item) => item.id)), () => setItems(next));
  };

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
        {items.map((item, index) => (
          <li key={item.id} className="group overflow-hidden rounded-xl border border-line">
            <Link href={`/portfolio/${item.id}`} className="relative block aspect-[4/3] bg-surface">
              {item.cover_image_url ? (
                <SmartImage src={item.cover_image_url} alt={item.title} fill sizes="(min-width: 1280px) 25vw, 45vw" className="object-cover" />
              ) : null}
              <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                {item.is_cover ? (
                  <Badge variant="dark">
                    <StarIcon />
                    {t.dashboardPortfolio.cover}
                  </Badge>
                ) : null}
                {item.hidden_at ? <Badge variant="danger">{t.dashboardPortfolio.hiddenByModerator}</Badge> : null}
                {!item.is_published ? <Badge variant="warning">{t.dashboardPortfolio.draft}</Badge> : null}
              </span>
            </Link>
            <div className="flex items-center gap-2 p-3 pl-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  <HeartIcon className="size-3.5" />
                  {item.likes_count}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" disabled={index === 0 || pending} onClick={() => move(index, -1)} aria-label={t.dashboardPortfolio.moveUp}>
                <ArrowUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={index === items.length - 1 || pending}
                onClick={() => move(index, 1)}
                aria-label={t.dashboardPortfolio.moveDown}
              >
                <ArrowDownIcon />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t.common.moreActions}>
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/portfolio/${item.id}/edit`}>
                      <PencilIcon />
                      {t.common.edit}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      run(
                        () => setPublishedAction(item.id, !item.is_published),
                        () => setItems((current) => current.map((i) => (i.id === item.id ? { ...i, is_published: !i.is_published } : i))),
                      )
                    }
                  >
                    {item.is_published ? <EyeOffIcon /> : <EyeIcon />}
                    {item.is_published ? t.dashboardPortfolio.unpublish : t.dashboardPortfolio.publish}
                  </DropdownMenuItem>
                  {!item.is_cover ? (
                    <DropdownMenuItem
                      onSelect={() =>
                        run(
                          () => setCoverAction(item.id),
                          () => setItems((current) => current.map((i) => ({ ...i, is_cover: i.id === item.id }))),
                        )
                      }
                    >
                      <StarIcon />
                      {t.dashboardPortfolio.makeCover}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => setDeleteId(item.id)}>
                    <Trash2Icon />
                    {t.common.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t.dashboardPortfolio.deleteTitle}
        description={t.dashboardPortfolio.deleteText}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          if (!deleteId) return;
          const id = deleteId;
          const result = await deletePortfolioItemAction(id);
          if (result.ok) {
            setItems((current) => current.filter((i) => i.id !== id));
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.error);
            return false;
          }
        }}
      />
    </>
  );
}
