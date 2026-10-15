"use client";

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useCallback, useEffect, useState } from "react";
import { SmartImage } from "@/components/media/smart-image";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";

type GalleryImage = { id: string; url: string; width: number | null; height: number | null; alt: string | null };

/** Фотографии работы крупно, одна под другой, с полноэкранным просмотром. */
export function WorkGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const t = useT();
  const [index, setIndex] = useState<number | null>(null);
  const total = images.length;

  const go = useCallback(
    (delta: number) => setIndex((current) => (current === null ? current : (current + delta + total) % total)),
    [total],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const current = index !== null ? images[index] : null;

  return (
    <>
      <div className="flex flex-col gap-4">
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setIndex(i)}
            onContextMenu={(e) => e.preventDefault()}
            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg bg-surface"
            aria-label={format(t.portfolio.photoOf, { index: i + 1, total })}
          >
            <SmartImage
              src={image.url}
              alt={image.alt || title}
              width={image.width ?? 1600}
              height={image.height ?? 2000}
              priority={i === 0}
              sizes="(min-width: 1024px) 62vw, 100vw"
              className="h-auto w-full select-none"
              draggable={false}
            />
          </button>
        ))}
      </div>

      <DialogPrimitive.Root open={index !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-fade-in" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none sm:p-10"
            aria-describedby={undefined}
            onContextMenu={(e) => e.preventDefault()}
          >
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            {current ? (
              <div className="relative h-full w-full">
                <SmartImage
                  key={current.id}
                  src={current.url}
                  alt={current.alt || title}
                  fill
                  sizes="100vw"
                  quality={80}
                  className="object-contain select-none"
                  draggable={false}
                />
              </div>
            ) : null}
            <DialogPrimitive.Close
              className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={t.common.close}
            >
              <XIcon className="size-5" />
            </DialogPrimitive.Close>
            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-4 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label={t.common.back}
                >
                  <ChevronLeftIcon className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-4 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label={t.common.showMore}
                >
                  <ChevronRightIcon className="size-6" />
                </button>
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white tabular-nums">
                  {(index ?? 0) + 1} / {total}
                </span>
              </>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
