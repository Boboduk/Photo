import { ArrowRightIcon, FolderPlusIcon, ImagePlusIcon, SearchIcon, UserIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { NotificationList } from "@/components/dashboard/notification-list";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format, formatChatTime } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries/notifications";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboard.title };
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const profile = user.profile;

  const [works, projects, applications, counts, conversations, notifications] = await Promise.all([
    supabase.from("portfolio_items").select("likes_count").eq("owner_id", user.id),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("author_id", user.id).in("status", ["open", "in_progress"]),
    supabase
      .from("project_applications")
      .select("id, project:projects!inner(author_id)", { count: "exact", head: true })
      .eq("project.author_id", user.id)
      .eq("status", "pending"),
    supabase.rpc("unread_counts"),
    supabase.rpc("list_conversations", { p_limit: 4 }),
    getNotifications(user.id, 5),
  ]);

  const likes = (works.data ?? []).reduce((sum, w) => sum + w.likes_count, 0);
  const unread = Number((counts.data as Record<string, number> | null)?.messages ?? 0);
  const stats = [
    { label: t.dashboard.stats.works, value: works.data?.length ?? 0, href: "/dashboard/portfolio" },
    { label: t.dashboard.stats.likes, value: likes, href: "/dashboard/portfolio" },
    { label: t.dashboard.stats.projects, value: projects.count ?? 0, href: "/dashboard/projects" },
    { label: t.dashboard.stats.applications, value: applications.count ?? 0, href: "/dashboard/projects" },
    { label: t.dashboard.stats.unread, value: unread, href: "/dashboard/messages" },
  ];

  const incomplete = !profile.avatar_url || !profile.city || profile.specializations.length === 0 || !profile.bio;

  const quick = [
    { href: "/dashboard/portfolio/new", label: t.dashboard.quick.addWork, icon: ImagePlusIcon },
    { href: "/dashboard/projects/new", label: t.dashboard.quick.newProject, icon: FolderPlusIcon },
    { href: profile.profile_type === "model" ? "/photographers" : "/models", label: t.dashboard.quick.findPeople, icon: SearchIcon },
    { href: `/users/${profile.username}`, label: t.dashboard.quick.viewProfile, icon: UserIcon },
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader size="md" title={format(t.dashboard.greeting, { name: profile.display_name })} subtitle={t.dashboard.overviewSubtitle} />

      {incomplete ? (
        <div className="flex flex-col gap-4 rounded-xl bg-foreground p-6 text-background sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t.dashboard.completeProfile}</p>
            <p className="mt-1 text-sm text-background/70">{t.dashboard.completeProfileText}</p>
          </div>
          <Button asChild variant="brand">
            <Link href="/dashboard/profile">
              {t.dashboard.completeProfile}
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-xl border border-line p-5 transition-colors hover:border-line-strong">
            <dd className="text-3xl font-semibold tabular-nums">{stat.value}</dd>
            <dt className="mt-1 text-sm text-muted">{stat.label}</dt>
          </Link>
        ))}
      </dl>

      <section>
        <h2 className="mb-4 text-lg font-semibold">{t.dashboard.quick.title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quick.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl bg-surface p-4 text-[15px] font-medium transition-colors hover:bg-surface-strong"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-background">
                <item.icon className="size-5" />
              </span>
              {item.label}
              <ArrowRightIcon className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.dashboard.recentMessages}</h2>
            <Link href="/dashboard/messages" className="text-sm font-medium hover:underline">
              {t.common.seeAll}
            </Link>
          </div>
          {conversations.data && conversations.data.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
              {conversations.data.map((c) => (
                <li key={c.id}>
                  <Link href={`/dashboard/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-surface/60">
                    <Avatar src={c.other_avatar_url} name={c.other_display_name ?? t.messages.deletedUser} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{c.other_display_name ?? t.messages.deletedUser}</span>
                        {c.last_message_at ? (
                          <span className="shrink-0 text-xs text-subtle">{formatChatTime(locale, c.last_message_at)}</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-sm text-muted">{c.last_message_body ?? ""}</span>
                        {c.unread_count > 0 ? (
                          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                            {c.unread_count}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-muted">{t.messages.emptyText}</p>
          )}
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.dashboard.recentNotifications}</h2>
            <Link href="/dashboard/notifications" className="text-sm font-medium hover:underline">
              {t.notifications.viewAll}
            </Link>
          </div>
          <NotificationList userId={user.id} items={notifications} compact />
        </section>
      </div>
    </div>
  );
}
