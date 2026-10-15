import { SearchIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { ContentModeration } from "@/components/admin/content-actions";
import { PageHeader } from "@/components/common/page-header";
import { SmartImage } from "@/components/media/smart-image";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LinkTabs } from "@/components/ui/tabs";
import { formatRelative } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstParam, toQueryString } from "@/lib/utils";

/** Модерация работ и объявлений. Модераторы видят весь контент (RLS: is_moderator). */
export default async function AdminContentPage(props: PageProps<"/admin/content">) {
  await requireModerator();
  const { t, locale } = await getI18n();
  const searchParams = await props.searchParams;
  const type = firstParam(searchParams.type) === "projects" ? "projects" : "works";
  const onlyHidden = firstParam(searchParams.filter) === "hidden";
  const q = firstParam(searchParams.q)?.trim().slice(0, 100) ?? "";
  const supabase = await createClient();
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const link = (changes: Record<string, string | undefined>) => {
    const query = toQueryString({ ...searchParams, ...changes });
    return query ? `/admin/content?${query}` : "/admin/content";
  };

  type Row = {
    id: string;
    title: string;
    image: string | null;
    hidden_at: string | null;
    hidden_reason: string | null;
    created_at: string;
    owner: { username: string; display_name: string } | null;
    extra?: string;
  };
  let rows: Row[] = [];

  if (type === "works") {
    let query = supabase
      .from("portfolio_items")
      .select("id, title, cover_image_url, hidden_at, hidden_reason, created_at, is_published, owner:profiles!portfolio_items_owner_id_fkey(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (onlyHidden) query = query.not("hidden_at", "is", null);
    if (q) query = query.ilike("title", pattern);
    const { data } = await query;
    rows = (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      image: item.cover_image_url,
      hidden_at: item.hidden_at,
      hidden_reason: item.hidden_reason,
      created_at: item.created_at,
      owner: item.owner,
      extra: item.is_published ? undefined : t.dashboardPortfolio.draft,
    }));
  } else {
    let query = supabase
      .from("projects")
      .select("id, title, cover_url, hidden_at, hidden_reason, created_at, status, author:profiles!projects_author_id_fkey(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (onlyHidden) query = query.not("hidden_at", "is", null);
    if (q) query = query.ilike("title", pattern);
    const { data } = await query;
    rows = (data ?? []).map((project) => ({
      id: project.id,
      title: project.title,
      image: project.cover_url,
      hidden_at: project.hidden_at,
      hidden_reason: project.hidden_reason,
      created_at: project.created_at,
      owner: project.author,
      extra: t.enums.projectStatus[project.status],
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader size="md" title={t.admin.contentTitle} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LinkTabs
          items={[
            { href: link({ type: undefined }), label: t.admin.contentWorks, active: type === "works" },
            { href: link({ type: "projects" }), label: t.admin.contentProjects, active: type === "projects" },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <LinkTabs
            items={[
              { href: link({ filter: undefined }), label: t.admin.contentFilterAll, active: !onlyHidden },
              { href: link({ filter: "hidden" }), label: t.admin.contentFilterHidden, active: onlyHidden },
            ]}
          />
          <Form action="/admin/content" className="relative sm:w-64">
            {type === "projects" ? <input type="hidden" name="type" value="projects" /> : null}
            {onlyHidden ? <input type="hidden" name="filter" value="hidden" /> : null}
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
            <Input name="q" type="search" defaultValue={q} placeholder={t.common.search} aria-label={t.common.search} className="h-10 pl-10" />
          </Form>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-10 text-center text-muted">{t.admin.noContent}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                {row.image ? <SmartImage src={row.image} alt="" fill sizes="64px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={type === "works" ? `/portfolio/${row.id}` : `/projects/${row.id}`} className="font-medium hover:underline">
                  {row.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {row.owner ? (
                    <Link href={`/users/${row.owner.username}`} className="hover:underline">
                      {row.owner.display_name}
                    </Link>
                  ) : null}{" "}
                  · {formatRelative(locale, row.created_at)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {row.hidden_at ? <Badge variant="danger">{t.dashboardPortfolio.hiddenByModerator}</Badge> : null}
                  {row.extra ? <Badge>{row.extra}</Badge> : null}
                  {row.hidden_reason ? <span className="text-xs text-muted">{row.hidden_reason}</span> : null}
                </div>
              </div>
              <ContentModeration type={type === "works" ? "portfolio_item" : "project"} id={row.id} hidden={Boolean(row.hidden_at)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
