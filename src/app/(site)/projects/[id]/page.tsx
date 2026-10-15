import { CalendarIcon, EyeOffIcon, InfoIcon, MapPinIcon, PencilIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/common/copy-link-button";
import { ReportDialog } from "@/components/common/report-dialog";
import { SmartImage } from "@/components/media/smart-image";
import { StartChatButton } from "@/components/profile/start-chat-button";
import { ApplyDialog } from "@/components/projects/apply-dialog";
import { ProjectStatusBadge } from "@/components/projects/project-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDate, formatDay, plural } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryLabels } from "@/lib/categories";
import { getMyApplication, getProject } from "@/lib/queries/projects";

export async function generateMetadata(props: PageProps<"/projects/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const project = await getProject(id);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description.slice(0, 160),
    openGraph: project.cover_url ? { images: [{ url: project.cover_url }] } : undefined,
  };
}

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const { t, locale } = await getI18n();
  const [project, user, labels] = await Promise.all([getProject(id), getCurrentUser(), getCategoryLabels(locale)]);
  if (!project || !project.author) notFound();

  const author = project.author;
  const isAuthor = user?.id === project.author_id;
  const application = isAuthor ? null : await getMyApplication(project.id, user?.id);

  const sections = [
    { title: t.projects.description, text: project.description },
    { title: t.projects.terms, text: project.terms },
    { title: t.projects.requirements, text: project.requirements },
  ].filter((section) => section.text);

  return (
    <div className="container-page pt-8 sm:pt-12">
      {isAuthor && project.hidden_at ? (
        <div className="mb-6 flex items-center gap-2.5 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          <EyeOffIcon className="size-4 shrink-0" />
          {t.projects.hiddenNotice}
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <article className="min-w-0">
          <Link href="/projects" className="text-sm text-muted hover:text-foreground">
            ← {t.projects.title}
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} t={t} />
            <Badge variant="outline">{t.enums.collabFormat[project.collab_format]}</Badge>
            {project.category_slug && labels[project.category_slug] ? <Badge>{labels[project.category_slug]}</Badge> : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-[40px] sm:leading-[1.1]">
            {project.title}
          </h1>

          <dl className="mt-6 grid gap-3 text-[15px] sm:grid-cols-2">
            <div className="flex items-center gap-2.5">
              <dt className="sr-only">{t.projects.shootDate}</dt>
              <CalendarIcon className="size-[18px] text-muted" aria-hidden />
              <dd>{project.shoot_date ? formatDay(locale, project.shoot_date) : t.projects.dateFlexible}</dd>
            </div>
            {project.city || project.location ? (
              <div className="flex items-center gap-2.5">
                <dt className="sr-only">{t.projects.location}</dt>
                <MapPinIcon className="size-[18px] text-muted" aria-hidden />
                <dd>{[project.city, project.location].filter(Boolean).join(", ")}</dd>
              </div>
            ) : null}
            <div className="flex items-center gap-2.5">
              <dt className="sr-only">{t.projects.lookingFor}</dt>
              <UsersIcon className="size-[18px] text-muted" aria-hidden />
              <dd>
                {t.projects.lookingFor}: {project.looking_for.map((role) => t.enums.teamRole[role].toLowerCase()).join(", ")} ·{" "}
                {format(plural(locale, project.spots, t.projects.spots), { count: project.spots })}
              </dd>
            </div>
          </dl>

          {project.cover_url ? (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl bg-surface">
              <SmartImage src={project.cover_url} alt="" fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
            </div>
          ) : null}

          <div className="mt-10 flex flex-col gap-9">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{section.text}</p>
              </section>
            ))}
            <section>
              <h2 className="text-lg font-semibold">{t.projects.usageRights}</h2>
              <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">
                {project.usage_rights ?? t.projects.usageNotSpecified}
              </p>
              {project.collab_format === "tfp" ? (
                <p className="mt-4 flex gap-2.5 rounded-lg bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
                  <InfoIcon className="mt-0.5 size-4 shrink-0" />
                  {t.projects.tfpNote}
                </p>
              ) : null}
            </section>
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-line p-6">
            <p className="text-xs font-medium tracking-wide text-subtle uppercase">{t.projects.author}</p>
            <Link href={`/users/${author.username}`} className="group mt-3 flex items-center gap-3">
              <Avatar src={author.avatar_url} name={author.display_name} size="lg" />
              <span className="min-w-0">
                <span className="block truncate font-semibold group-hover:underline">{author.display_name}</span>
                <span className="block text-sm text-muted">
                  {t.enums.profileType[author.profile_type]}
                  {author.city ? ` · ${author.city}` : ""}
                </span>
              </span>
            </Link>

            <p className="mt-5 text-sm text-muted">
              {format(plural(locale, project.applications_count, t.projects.applications), {
                count: project.applications_count,
              })}{" "}
              · {formatDate(locale, project.created_at, { day: "numeric", month: "long" })}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {isAuthor ? (
                <>
                  <p className="text-sm font-medium">{t.projects.ownProject}</p>
                  <Button asChild size="lg">
                    <Link href={`/dashboard/projects/${project.id}`}>{t.projects.manage}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/projects/${project.id}/edit`}>
                      <PencilIcon />
                      {t.common.edit}
                    </Link>
                  </Button>
                </>
              ) : application && application.status !== "withdrawn" ? (
                <>
                  <p className="text-sm">
                    {t.projects.yourStatus}:{" "}
                    <span className="font-semibold">{t.enums.applicationStatus[application.status]}</span>
                  </p>
                  {application.conversation_id ? (
                    <Button asChild size="lg">
                      <Link href={`/dashboard/messages/${application.conversation_id}`}>{t.projects.openChat}</Link>
                    </Button>
                  ) : null}
                </>
              ) : project.status === "open" ? (
                <>
                  <ApplyDialog
                    projectId={project.id}
                    roles={project.looking_for}
                    isAuthenticated={Boolean(user)}
                    label={application?.status === "withdrawn" ? t.projects.reapply : undefined}
                  />
                  <StartChatButton userId={author.id} isAuthenticated={Boolean(user)} variant="outline" />
                </>
              ) : (
                <>
                  <p className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">{t.projects.closedNotice}</p>
                  <StartChatButton userId={author.id} isAuthenticated={Boolean(user)} variant="outline" />
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            <CopyLinkButton />
            {!isAuthor ? <ReportDialog targetType="project" targetId={project.id} isAuthenticated={Boolean(user)} /> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
