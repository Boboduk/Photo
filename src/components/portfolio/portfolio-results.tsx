"use client";

import { loadMorePortfolio } from "@/actions/feed";
import { LoadMoreList } from "@/components/common/load-more";
import { PhotoMasonry } from "@/components/media/photo-card";
import type { Paged, PortfolioCardData } from "@/types/views";

export function PortfolioResults({
  query,
  owner,
  initial,
  categoryLabels,
  isAuthenticated,
  showAuthor = true,
}: {
  query: string;
  owner?: string;
  initial: Paged<PortfolioCardData>;
  categoryLabels: Record<string, string>;
  isAuthenticated: boolean;
  showAuthor?: boolean;
}) {
  return (
    <LoadMoreList
      key={query + (owner ?? "")}
      initial={initial}
      load={(offset) => loadMorePortfolio(query, offset, owner)}
      render={(items) => (
        <PhotoMasonry
          items={items}
          categoryLabels={categoryLabels}
          isAuthenticated={isAuthenticated}
          showAuthor={showAuthor}
        />
      )}
    />
  );
}
