"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { useT } from "@/i18n/client";
import type { PortfolioCardData } from "@/types/views";
import { LikeButton } from "./like-button";
import { SaveButton } from "./save-button";
import { SmartImage } from "./smart-image";

/** Карточка работы для masonry-ленты. */
export function PhotoCard({
  item,
  categoryLabel,
  isAuthenticated,
  priority,
  showAuthor = true,
}: {
  item: PortfolioCardData;
  categoryLabel?: string;
  isAuthenticated: boolean;
  priority?: boolean;
  showAuthor?: boolean;
}) {
  const t = useT();
  const width = item.cover_width ?? 1200;
  const height = item.cover_height ?? 1500;

  return (
    <article className="group relative">
      <div className="relative overflow-hidden rounded-lg bg-surface">
        <Link href={`/portfolio/${item.id}`} className="block" aria-label={item.title}>
          <SmartImage
            src={item.cover_image_url}
            alt={item.title}
            width={width}
            height={height}
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 31vw, 48vw"
            className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100" />
        </Link>

        {categoryLabel ? (
          <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {categoryLabel}
          </span>
        ) : null}

        <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <SaveButton itemId={item.id} saved={item.saved} isAuthenticated={isAuthenticated} />
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <p className="hidden min-w-0 line-clamp-2 text-sm font-medium text-white drop-shadow md:block">{item.title}</p>
          <LikeButton
            itemId={item.id}
            liked={item.liked}
            count={item.likes_count}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>

      {showAuthor ? (
        <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
          <Link
            href={`/users/${item.owner_username}`}
            className="flex min-w-0 items-center gap-2 rounded-full text-sm"
            title={t.portfolio.openAuthor}
          >
            <Avatar src={item.owner_avatar_url} name={item.owner_display_name} size="xs" />
            <span className="truncate font-medium hover:underline">{item.owner_display_name}</span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function PhotoMasonry({
  items,
  categoryLabels,
  isAuthenticated,
  showAuthor,
}: {
  items: PortfolioCardData[];
  categoryLabels: Record<string, string>;
  isAuthenticated: boolean;
  showAuthor?: boolean;
}) {
  return (
    <div className="masonry">
      {items.map((item, index) => (
        <PhotoCard
          key={item.id}
          item={item}
          categoryLabel={item.category_slug ? categoryLabels[item.category_slug] : undefined}
          isAuthenticated={isAuthenticated}
          priority={index < 4}
          showAuthor={showAuthor}
        />
      ))}
    </div>
  );
}
