"use client";

import { loadMoreProjects } from "@/actions/feed";
import { LoadMoreList } from "@/components/common/load-more";
import { useLocale, useT } from "@/i18n/client";
import type { Paged, ProjectCardData } from "@/types/views";
import { ProjectCard } from "./project-card";

export function ProjectResults({
  query,
  author,
  initial,
  categoryLabels,
}: {
  query: string;
  author?: string;
  initial: Paged<ProjectCardData>;
  categoryLabels: Record<string, string>;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <LoadMoreList
      key={query + (author ?? "")}
      initial={initial}
      load={(offset) => loadMoreProjects(query, offset, author)}
      render={(items) => (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} categoryLabels={categoryLabels} t={t} locale={locale} />
          ))}
        </div>
      )}
    />
  );
}
