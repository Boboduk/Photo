"use client";

import { loadMoreProfiles } from "@/actions/feed";
import { LoadMoreList } from "@/components/common/load-more";
import { useLocale, useT } from "@/i18n/client";
import type { Paged, ProfileCardData } from "@/types/views";
import { ProfileCard } from "./profile-card";

export function ProfileResults({
  kind,
  query,
  initial,
  categoryLabels,
}: {
  kind: "photographer" | "model";
  query: string;
  initial: Paged<ProfileCardData>;
  categoryLabels: Record<string, string>;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <LoadMoreList
      key={query}
      initial={initial}
      load={(offset) => loadMoreProfiles(kind, query, offset)}
      render={(items) => (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} categoryLabels={categoryLabels} t={t} locale={locale} />
          ))}
        </div>
      )}
    />
  );
}
