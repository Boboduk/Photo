import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { NotificationList } from "@/components/dashboard/notification-list";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries/notifications";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.notifications.title };
}

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const { t } = await getI18n();
  const items = await getNotifications(user.id);
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader size="md" title={t.notifications.title} subtitle={t.notifications.subtitle} />
      <NotificationList userId={user.id} items={items} />
    </div>
  );
}
