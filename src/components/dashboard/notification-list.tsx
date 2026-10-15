"use client";

import {
  AtSignIcon,
  BellIcon,
  CheckCheckIcon,
  FolderOpenIcon,
  HeartIcon,
  MessageCircleIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { EmptyState } from "@/components/common/empty-state";
import { useUnreadCounts } from "@/components/layout/unread-counts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/i18n/format";
import { useLocale, useT } from "@/i18n/client";
import { notificationHref, notificationPreview, notificationText, type NotificationRow } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ICONS = {
  message: MessageCircleIcon,
  application: FolderOpenIcon,
  application_status: FolderOpenIcon,
  project_status: FolderOpenIcon,
  like: HeartIcon,
  mention: AtSignIcon,
} as const;

export function NotificationList({ userId, items, compact = false }: { userId: string; items: NotificationRow[]; compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { refresh } = useUnreadCounts();
  const [pending, startTransition] = useTransition();
  const hasUnread = items.some((n) => !n.read_at);

  // Новые уведомления появляются без перезагрузки страницы.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-list:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () =>
        router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  if (items.length === 0) {
    return <EmptyState icon={BellIcon} title={t.notifications.emptyTitle} text={compact ? undefined : t.notifications.emptyText} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {!compact && hasUnread ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await markAllNotificationsReadAction();
                if (result.ok) {
                  toast.success(result.message);
                  refresh();
                  router.refresh();
                } else toast.error(result.error);
              })
            }
          >
            <CheckCheckIcon />
            {t.notifications.markAllRead}
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
        {items.map((n) => {
          const Icon = ICONS[n.type];
          const preview = notificationPreview(n);
          return (
            <li key={n.id} className={cn("group relative flex gap-4 p-4 transition-colors hover:bg-surface/60", !n.read_at && "bg-brand-soft/40")}>
              <span className="relative shrink-0">
                <Avatar src={n.actor?.avatar_url} name={n.actor?.display_name ?? t.notifications.someone} size="md" />
                <span className="absolute -right-1 -bottom-1 inline-flex size-5 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-line">
                  <Icon className="size-3" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={notificationHref(n)}
                  className="text-[15px] leading-snug after:absolute after:inset-0"
                  onClick={() => {
                    if (!n.read_at) {
                      void markNotificationReadAction(n.id).then(() => refresh());
                    }
                  }}
                >
                  {notificationText(t, n)}
                </Link>
                {preview ? <p className="mt-1 line-clamp-1 text-sm text-muted">{preview}</p> : null}
                <p className="mt-1 text-xs text-subtle">{formatRelative(locale, n.created_at)}</p>
              </div>
              {!n.read_at ? <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="new" /> : null}
              {!compact ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  aria-label={t.notifications.deleteOne}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteNotificationAction(n.id);
                      refresh();
                      router.refresh();
                    })
                  }
                >
                  <XIcon />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
