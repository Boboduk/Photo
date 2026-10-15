import { LockIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { getI18n } from "@/i18n/server";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const GROUPS = [
  ["users_total", "users_new_7d", "photographers", "models", "banned"],
  ["portfolio_items", "portfolio_published", "portfolio_hidden", "projects_total", "projects_active", "applications_total"],
  ["conversations_total", "messages_total", "messages_7d", "reports_open"],
] as const;

export default async function AdminOverviewPage() {
  await requireModerator();
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stats");
  const stats = (data ?? {}) as Record<string, number>;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader size="md" title={t.admin.title} />
      {GROUPS.map((group, index) => (
        <dl key={index} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {group.map((key) => (
            <div key={key} className="rounded-xl border border-line p-5">
              <dd className="text-3xl font-semibold tabular-nums">{Number(stats[key] ?? 0).toLocaleString("ru-RU")}</dd>
              <dt className="mt-1 text-sm text-muted">{t.admin.stats[key]}</dt>
            </div>
          ))}
        </dl>
      ))}
      <p className="flex items-start gap-2.5 rounded-lg bg-surface px-4 py-3 text-sm text-muted">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        {t.admin.privacyNote}
      </p>
      {Number(stats.reports_open ?? 0) > 0 ? (
        <Link href="/admin/reports" className="self-start text-sm font-medium underline-offset-4 hover:underline">
          {t.admin.reportsTitle} →
        </Link>
      ) : null}
    </div>
  );
}
