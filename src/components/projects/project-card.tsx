import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { SmartImage } from "@/components/media/smart-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { format, formatDay, plural } from "@/i18n/format";
import { cn } from "@/lib/utils";
import type { ProjectCardData } from "@/types/views";

export function ProjectStatusBadge({ status, t }: { status: ProjectCardData["status"]; t: Dictionary }) {
  const variant = status === "open" ? "success" : status === "in_progress" ? "brand" : status === "cancelled" ? "danger" : "default";
  return <Badge variant={variant}>{t.enums.projectStatus[status]}</Badge>;
}

/** Карточка объявления о съёмке. */
export function ProjectCard({
  project,
  categoryLabels,
  t,
  locale,
  compact = false,
}: {
  project: ProjectCardData;
  categoryLabels: Record<string, string>;
  t: Dictionary;
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-background transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-pop">
      {project.cover_url && !compact ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-surface">
          <SmartImage
            src={project.cover_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <Badge variant="overlay">{t.enums.collabFormat[project.collab_format]}</Badge>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {project.status !== "open" ? <ProjectStatusBadge status={project.status} t={t} /> : null}
          {!project.cover_url || compact ? <Badge variant="outline">{t.enums.collabFormat[project.collab_format]}</Badge> : null}
          {project.category_slug && categoryLabels[project.category_slug] ? (
            <Badge>{categoryLabels[project.category_slug]}</Badge>
          ) : null}
        </div>

        <h3 className="text-[17px] leading-snug font-semibold text-balance">
          <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {project.title}
          </Link>
        </h3>

        {!compact ? <p className="line-clamp-2 text-sm leading-relaxed text-muted">{project.description}</p> : null}

        <dl className="mt-auto grid gap-1.5 pt-1 text-sm text-muted">
          <div className="flex items-center gap-2">
            <dt className="sr-only">{t.projects.lookingFor}</dt>
            <UsersIcon className="size-4 shrink-0" aria-hidden />
            <dd className="truncate">
              {t.projects.lookingFor}: {project.looking_for.map((role) => t.enums.teamRole[role].toLowerCase()).join(", ")}
            </dd>
          </div>
          {project.city ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t.projects.location}</dt>
              <MapPinIcon className="size-4 shrink-0" aria-hidden />
              <dd className="truncate">{project.city}</dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <dt className="sr-only">{t.projects.shootDate}</dt>
            <CalendarIcon className="size-4 shrink-0" aria-hidden />
            <dd>{project.shoot_date ? formatDay(locale, project.shoot_date, { day: "numeric", month: "long", timeZone: "UTC" }) : t.projects.dateFlexible}</dd>
          </div>
        </dl>

        <div className={cn("flex items-center justify-between gap-3 border-t border-line pt-3")}>
          <span className="relative z-10 flex min-w-0 items-center gap-2 text-sm">
            <Avatar src={project.author_avatar_url} name={project.author_display_name} size="xs" />
            <Link href={`/users/${project.author_username}`} className="truncate font-medium hover:underline">
              {project.author_display_name}
            </Link>
          </span>
          <span className="shrink-0 text-xs text-subtle">
            {format(plural(locale, project.applications_count, t.projects.applications), { count: project.applications_count })}
          </span>
        </div>
      </div>
    </article>
  );
}
