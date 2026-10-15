import Link from "next/link";
import { ContentModeration, ReportResolution } from "@/components/admin/content-actions";
import { UserBanButton } from "@/components/admin/user-actions";
import { PageHeader } from "@/components/common/page-header";
import { SmartImage } from "@/components/media/smart-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkTabs } from "@/components/ui/tabs";
import { format, formatRelative } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";

type Snapshot = {
  title?: string;
  description?: string;
  cover_image_url?: string;
  body?: string;
  username?: string;
  display_name?: string;
  bio?: string;
};

export default async function AdminReportsPage(props: PageProps<"/admin/reports">) {
  const me = await requireModerator();
  const { t, locale } = await getI18n();
  const tab = firstParam((await props.searchParams).status) === "closed" ? "closed" : "open";
  const supabase = await createClient();

  let query = supabase
    .from("reports")
    .select(
      `id, target_type, target_id, reason, details, snapshot, status, resolution_note, created_at, resolved_at,
      reporter:profiles!reports_reporter_id_fkey(username, display_name, avatar_url),
      owner:profiles!reports_target_owner_id_fkey(id, username, display_name, avatar_url, role, banned_at)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);
  query = tab === "open" ? query.eq("status", "open") : query.neq("status", "open");
  const { data: reports } = await query;

  // Текущее состояние скрытия для работ и проектов из жалоб.
  const itemIds = (reports ?? []).filter((r) => r.target_type === "portfolio_item").map((r) => r.target_id);
  const projectIds = (reports ?? []).filter((r) => r.target_type === "project").map((r) => r.target_id);
  const [items, projects] = await Promise.all([
    itemIds.length ? supabase.from("portfolio_items").select("id, hidden_at").in("id", itemIds) : Promise.resolve({ data: [] }),
    projectIds.length ? supabase.from("projects").select("id, hidden_at").in("id", projectIds) : Promise.resolve({ data: [] }),
  ]);
  const existing = new Map<string, boolean>([
    ...(items.data ?? []).map((i) => [i.id, Boolean(i.hidden_at)] as const),
    ...(projects.data ?? []).map((p) => [p.id, Boolean(p.hidden_at)] as const),
  ]);

  const targetHref = (type: string, id: string, username?: string) =>
    type === "portfolio_item" ? `/portfolio/${id}` : type === "project" ? `/projects/${id}` : type === "profile" && username ? `/users/${username}` : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader size="md" title={t.admin.reportsTitle} />
      <LinkTabs
        items={[
          { href: "/admin/reports", label: t.admin.statusOpen, active: tab === "open" },
          { href: "/admin/reports?status=closed", label: t.admin.statusClosed, active: tab === "closed" },
        ]}
      />
      {!reports || reports.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-10 text-center text-muted">{t.admin.reportsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map((report) => {
            const snapshot = (report.snapshot ?? {}) as Snapshot;
            const href = targetHref(report.target_type, report.target_id, snapshot.username);
            const contentExists = existing.has(report.target_id);
            const owner = report.owner;
            return (
              <li key={report.id} className="grid gap-5 rounded-xl border border-line p-5 lg:grid-cols-[1fr_280px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="dark">{t.enums.reportTarget[report.target_type]}</Badge>
                    <Badge variant="danger">{t.enums.reportReason[report.reason]}</Badge>
                    {report.status !== "open" ? <Badge>{t.enums.reportStatus[report.status]}</Badge> : null}
                    <span className="text-subtle">{formatRelative(locale, report.created_at)}</span>
                  </div>
                  {report.details ? <p className="mt-3 text-[15px] whitespace-pre-line">{report.details}</p> : null}

                  <div className="mt-4 rounded-lg bg-surface p-4">
                    <p className="mb-2 text-xs font-medium tracking-wide text-subtle uppercase">{t.admin.snapshot}</p>
                    <div className="flex gap-4">
                      {snapshot.cover_image_url ? (
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-surface-strong">
                          <SmartImage src={snapshot.cover_image_url} alt="" fill sizes="80px" className="object-cover" />
                        </div>
                      ) : null}
                      <div className="min-w-0 text-sm">
                        {snapshot.title || snapshot.display_name ? (
                          <p className="font-medium">{snapshot.title ?? snapshot.display_name}</p>
                        ) : null}
                        {snapshot.body ? <p className="whitespace-pre-line">{snapshot.body}</p> : null}
                        {snapshot.description || snapshot.bio ? (
                          <p className="mt-1 line-clamp-3 text-muted">{snapshot.description ?? snapshot.bio}</p>
                        ) : null}
                        {href ? (
                          <Link href={href} className="mt-2 inline-block font-medium underline-offset-4 hover:underline">
                            {t.admin.openTarget} →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                    {report.reporter ? (
                      <span className="flex items-center gap-2">
                        <Avatar src={report.reporter.avatar_url} name={report.reporter.display_name} size="xs" />
                        {format(t.admin.reportedBy, { name: report.reporter.display_name })}
                      </span>
                    ) : null}
                    {owner ? (
                      <Link href={`/users/${owner.username}`} className="flex items-center gap-2 hover:underline">
                        <Avatar src={owner.avatar_url} name={owner.display_name} size="xs" />
                        {t.admin.contentOwner}: {owner.display_name}
                        {owner.banned_at ? <Badge variant="danger">{t.admin.bannedStatus}</Badge> : null}
                      </Link>
                    ) : null}
                  </div>
                  {report.resolution_note ? <p className="mt-3 text-sm italic text-muted">{report.resolution_note}</p> : null}
                </div>

                <div className="flex flex-col gap-3 border-t border-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
                  {(report.target_type === "portfolio_item" || report.target_type === "project") && contentExists ? (
                    <ContentModeration type={report.target_type} id={report.target_id} hidden={existing.get(report.target_id) ?? false} />
                  ) : null}
                  {owner && owner.id !== me.id && owner.role !== "admin" ? (
                    <UserBanButton
                      userId={owner.id}
                      name={owner.display_name}
                      banned={Boolean(owner.banned_at)}
                      disabled={owner.role === "moderator" && me.profile.role !== "admin"}
                    />
                  ) : null}
                  <ReportResolution reportId={report.id} status={report.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
