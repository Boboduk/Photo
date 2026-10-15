"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { Paged } from "@/types/views";

/**
 * Список с кнопкой «Загрузить ещё». Первая страница приходит с сервера,
 * следующие — через server action.
 */
export function LoadMoreList<T extends { id: string }>({
  initial,
  load,
  render,
  className,
}: {
  initial: Paged<T>;
  load: (offset: number) => Promise<Paged<T>>;
  render: (items: T[]) => React.ReactNode;
  className?: string;
}) {
  const t = useT();
  const [items, setItems] = useState(initial.items);
  const [nextOffset, setNextOffset] = useState(initial.nextOffset);
  const [pending, startTransition] = useTransition();

  const onLoad = () => {
    if (nextOffset === null) return;
    startTransition(async () => {
      try {
        const page = await load(nextOffset);
        setItems((current) => {
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...page.items.filter((item) => !seen.has(item.id))];
        });
        setNextOffset(page.nextOffset);
      } catch {
        toast.error(t.errors.generic);
      }
    });
  };

  return (
    <div className={className}>
      {render(items)}
      {nextOffset !== null ? (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" size="lg" onClick={onLoad} disabled={pending} aria-busy={pending}>
            {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
            {t.common.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
