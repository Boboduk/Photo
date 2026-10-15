import { MessageCircleIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ApplicationDecision } from "@/components/projects/application-actions";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { ProjectStatusSelect } from "@/components/projects/project-status-select";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatRelative } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboardProjects.applicationsTitle };
}

const STATUS_VARIANT = { pending: "brand", accepted: "success", declined: "danger", withdrawn: "default" } as const;

export default async function ManageProjectPage(props: PageProps<"/dashboard/projects/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/dashboard/projects/${id}`);
  const { t, locale } = await getI18n();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      `id, title, status, spots, author_id,
      applications:project_applications(id, status, role, message, created_at, conversation_id,
        applicant:profiles!project_applications_applicant_id_fkey(id, username, display_name, avatar_url, city, profile_type))`,
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "project_applications", ascending: false })
    .maybeSingle();

  if (!project || project.author_id !== user.id) notFound();
  const accepted = project.applications.filter((a) => a.status === "accepted").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        size="md"
        title={project.title}
        subtitle={format(t.dashboardProjects.acceptedCount, { accepted, spots: project.spots })}
        actions={
          <>
            <ProjectStatusSelect projectId={project.id} status={project.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${project.id}`}>{t.dashboardProjects.viewProject}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/projects/${project.id}/edit`}>
                <PencilIcon />
                {t.common.edit}
              </Link>
            </Button>
            <DeleteProjectButton projectId={project.id} redirectTo="/dashboard/projects" />
          </>
        }
      />

      <section aria-labelledby="applications-title">
        <h2 id="applications-title" className="mb-4 text-lg font-semibold">
          {t.dashboardProjects.applicationsTitle} · {project.applications.length}
        </h2>
        {project.applications.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {project.applications.map((application) =>
              application.applicant ? (
                <li key={application.id} className="rounded-xl border border-line p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Link href={`/users/${application.applicant.username}`} className="flex min-w-0 items-center gap-3 sm:w-64">
                      <Avatar src={application.applicant.avatar_url} name={application.applicant.display_name} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:underline">{application.applicant.display_name}</span>
                        <span className="block truncate text-sm text-muted">
                          {t.enums.profileType[application.applicant.profile_type]}
                          {application.applicant.city ? ` · ${application.applicant.city}` : ""}
                        </span>
                      </span>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant={STATUS_VARIANT[application.status]}>{t.enums.applicationStatus[application.status]}</Badge>
                        {application.role ? (
                          <span className="text-muted">{format(t.dashboardProjects.asRole, { role: t.enums.teamRole[application.role] })}</span>
                        ) : null}
                        <span className="text-subtle">{formatRelative(locale, application.created_at)}</span>
                      </div>
                      <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{application.message}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <ApplicationDecision applicationId={application.id} status={application.status} />
                        {application.conversation_id ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/dashboard/messages/${application.conversation_id}`}>
                              <MessageCircleIcon />
                              {t.dashboardProjects.openChat}
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ) : null,
            )}
          </ul>
        ) : (
          <EmptyState title={t.dashboardProjects.noApplications} />
        )}
      </section>
    </div>
  );
}
