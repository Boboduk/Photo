import { MessageCircleIcon, SendIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { WithdrawApplicationButton } from "@/components/projects/application-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.applications.title };
}

const STATUS_VARIANT = { pending: "brand", accepted: "success", declined: "danger", withdrawn: "default" } as const;

export default async function ApplicationsPage() {
  const user = await requireUser("/dashboard/applications");
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("project_applications")
    .select(
      `id, status, role, message, created_at, conversation_id,
      project:projects(id, title, status, city, shoot_date,
        author:profiles!projects_author_id_fkey(username, display_name, avatar_url))`,
    )
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader size="md" title={t.applications.title} subtitle={t.applications.subtitle} />
      {applications && applications.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {applications.map((application) => (
            <li key={application.id} className="rounded-xl border border-line p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[application.status]}>{t.enums.applicationStatus[application.status]}</Badge>
                {application.role ? <span className="text-sm text-muted">{t.enums.teamRole[application.role]}</span> : null}
                <span className="text-sm text-subtle">{format(t.applications.sentAt, { date: formatDate(locale, application.created_at) })}</span>
              </div>
              {application.project ? (
                <>
                  <Link href={`/projects/${application.project.id}`} className="mt-3 block text-[17px] font-semibold hover:underline">
                    {application.project.title}
                  </Link>
                  {application.project.author ? (
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
                      <Avatar src={application.project.author.avatar_url} name={application.project.author.display_name} size="xs" />
                      {application.project.author.display_name}
                      {application.project.status !== "open" ? ` · ${t.enums.projectStatus[application.project.status]}` : ""}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-muted">{t.applications.projectUnavailable}</p>
              )}
              <p className="mt-3 line-clamp-3 text-[15px] text-foreground/80">{application.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {application.conversation_id ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/messages/${application.conversation_id}`}>
                      <MessageCircleIcon />
                      {t.applications.openChat}
                    </Link>
                  </Button>
                ) : null}
                {application.status === "pending" || application.status === "accepted" ? (
                  <WithdrawApplicationButton applicationId={application.id} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={SendIcon}
          title={t.applications.emptyTitle}
          text={t.applications.emptyText}
          action={
            <Button asChild>
              <Link href="/projects">{t.applications.browse}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
