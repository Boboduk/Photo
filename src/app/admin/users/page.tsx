import { SearchIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { UserBanButton, UserRoleSelect } from "@/components/admin/user-actions";
import { PageHeader } from "@/components/common/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkTabs } from "@/components/ui/tabs";
import { format, formatDate, formatRelative } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireModerator } from "@/lib/auth";
import type { AppRole, ProfileType } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { clampInt, firstParam, toQueryString } from "@/lib/utils";

const PAGE = 30;

type Row = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  profile_type: ProfileType;
  role: AppRole;
  city: string | null;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
  last_active_at: string;
  email: string | null;
  works_count: number;
  projects_count: number;
  reports_count: number;
  total_count: number;
};

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const me = await requireModerator();
  const { t, locale } = await getI18n();
  const searchParams = await props.searchParams;
  const q = firstParam(searchParams.q)?.slice(0, 100) ?? "";
  const filterParam = firstParam(searchParams.filter);
  const filter = filterParam === "banned" || filterParam === "staff" ? filterParam : "all";
  const page = clampInt(firstParam(searchParams.page), 1, 1000, 1);
  const isAdmin = me.profile.role === "admin";

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_users", {
    p_query: q || undefined,
    p_filter: filter,
    p_limit: PAGE,
    p_offset: (page - 1) * PAGE,
  });
  const rows = (data ?? []) as Row[];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (changes: Record<string, string | undefined>) => {
    const query = toQueryString({ ...searchParams, ...changes });
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader size="md" title={t.admin.nav.users} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Form action="/admin/users" className="relative w-full max-w-md">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={isAdmin ? t.admin.usersSearch : t.admin.usersSearchModerator}
            aria-label={t.common.search}
            className="pl-10"
          />
        </Form>
        <LinkTabs
          items={[
            { href: link({ filter: undefined, page: undefined }), label: t.admin.filterAll, active: filter === "all" },
            { href: link({ filter: "banned", page: undefined }), label: t.admin.filterBanned, active: filter === "banned" },
            { href: link({ filter: "staff", page: undefined }), label: t.admin.filterStaff, active: filter === "staff" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong p-10 text-center text-muted">{t.admin.noUsers}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
          {rows.map((row) => {
            const isSelf = row.id === me.id;
            const protectedRow = isSelf || row.role === "admin" || (row.role === "moderator" && !isAdmin);
            return (
              <li key={row.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <Link href={`/users/${row.username}`} className="flex min-w-0 items-center gap-3 lg:w-72">
                  <Avatar src={row.avatar_url} name={row.display_name} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium hover:underline">{row.display_name}</span>
                    <span className="block truncate text-sm text-muted">
                      @{row.username}
                      {row.email ? ` · ${row.email}` : ""}
                    </span>
                  </span>
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{t.enums.profileType[row.profile_type]}</Badge>
                    {row.role !== "user" ? <Badge variant="dark">{t.enums.role[row.role]}</Badge> : null}
                    {row.banned_at ? <Badge variant="danger">{t.admin.bannedStatus}</Badge> : null}
                  </span>
                  <span>
                    {t.admin.columns.registered}: {formatDate(locale, row.created_at, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {t.admin.columns.activity}: {formatRelative(locale, row.last_active_at)}
                  </span>
                  <span>
                    {format(t.admin.contentCounts, { works: row.works_count, projects: row.projects_count, reports: row.reports_count })}
                  </span>
                  {row.ban_reason ? <span className="text-danger">{row.ban_reason}</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin ? <UserRoleSelect userId={row.id} role={row.role} disabled={isSelf} /> : null}
                  <UserBanButton userId={row.id} name={row.display_name} banned={Boolean(row.banned_at)} disabled={protectedRow} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="flex items-center justify-center gap-2" aria-label={t.common.pagination}>
          <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
            <Link href={link({ page: String(page - 1) })} aria-label={t.common.previousPage}>
              ←
            </Link>
          </Button>
          <span className="text-sm text-muted tabular-nums">
            {page} / {pages}
          </span>
          <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-40" : ""}>
            <Link href={link({ page: String(page + 1) })} aria-label={t.common.nextPage}>
              →
            </Link>
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
