import { FolderOpenIcon, PencilIcon, PlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { ProjectStatusSelect } from "@/components/projects/project-status-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDay, plural } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboardProjects.title };
}

export default async function DashboardProjectsPage() {
  const user = await requireUser("/dashboard/projects");
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, applications_count, shoot_date, city, spots, collab_format, hidden_at, created_at, applications:project_applications(status)")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        size="md"
        title={t.dashboardProjects.title}
        subtitle={t.dashboardProjects.subtitle}
        actions={
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <PlusIcon />
              {t.dashboardProjects.newProject}
            </Link>
          </Button>
        }
      />
      {projects && projects.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => {
            const pending = project.applications.filter((a) => a.status === "pending").length;
            const accepted = project.applications.filter((a) => a.status === "accepted").length;
            return (
              <li key={project.id} className="flex flex-col gap-4 rounded-xl border border-line p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/projects/${project.id}`} className="text-[17px] font-semibold hover:underline">
                      {project.title}
                    </Link>
                    {project.hidden_at ? <Badge variant="danger">{t.dashboardPortfolio.hiddenByModerator}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {t.enums.collabFormat[project.collab_format]}
                    {project.city ? ` · ${project.city}` : ""}
                    {" · "}
                    {project.shoot_date ? formatDay(locale, project.shoot_date, { day: "numeric", month: "long", timeZone: "UTC" }) : t.projects.dateFlexible}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm">
                    <UsersIcon className="size-4 text-muted" />
                    {format(plural(locale, project.applications_count, t.projects.applications), { count: project.applications_count })}
                    {pending > 0 ? <Badge variant="brand">+{pending}</Badge> : null}
                    <span className="text-muted">· {format(t.dashboardProjects.acceptedCount, { accepted, spots: project.spots })}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ProjectStatusSelect projectId={project.id} status={project.status} />
                  <Button asChild size="sm">
                    <Link href={`/dashboard/projects/${project.id}`}>{t.dashboardProjects.applicationsTitle}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/projects/${project.id}/edit`} aria-label={t.common.edit}>
                      <PencilIcon />
                    </Link>
                  </Button>
                  <DeleteProjectButton projectId={project.id} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={FolderOpenIcon}
          title={t.dashboardProjects.emptyTitle}
          text={t.dashboardProjects.emptyText}
          action={
            <Button asChild>
              <Link href="/dashboard/projects/new">{t.dashboardProjects.newProject}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
