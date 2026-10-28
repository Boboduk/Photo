"use client";

import {
  BellIcon,
  BookmarkIcon,
  FolderOpenIcon,
  ImagesIcon,
  LayoutGridIcon,
  MessageCircleIcon,
  SendIcon,
  SettingsIcon,
  ShirtIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CountBadge, useUnreadCounts } from "@/components/layout/unread-counts";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function DashboardNav() {
  const t = useT();
  const pathname = usePathname();
  const { counts } = useUnreadCounts();

  const items = [
    { href: "/dashboard", label: t.dashboard.nav.overview, icon: LayoutGridIcon, exact: true },
    { href: "/dashboard/profile", label: t.dashboard.nav.profile, icon: UserIcon },
    { href: "/dashboard/portfolio", label: t.dashboard.nav.portfolio, icon: ImagesIcon },
    { href: "/dashboard/projects", label: t.dashboard.nav.projects, icon: FolderOpenIcon },
    { href: "/dashboard/applications", label: t.dashboard.nav.applications, icon: SendIcon },
    { href: "/dashboard/messages", label: t.dashboard.nav.messages, icon: MessageCircleIcon, count: counts.messages },
    { href: "/dashboard/favorites", label: t.dashboard.nav.favorites, icon: BookmarkIcon },
    { href: "/dashboard/notifications", label: t.dashboard.nav.notifications, icon: BellIcon, count: counts.notifications },
    { href: "/dashboard/tryon", label: t.dashboard.nav.tryon, icon: ShirtIcon },
    { href: "/dashboard/settings", label: t.dashboard.nav.settings, icon: SettingsIcon },
  ];

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <nav aria-label={t.dashboard.title} className="lg:w-60 lg:shrink-0">
      <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-lg lg:px-3",
                  active ? "bg-foreground text-background lg:bg-surface lg:text-foreground" : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                <item.icon className="hidden size-[18px] lg:block" />
                {item.label}
                {item.count ? <CountBadge count={item.count} className="lg:ml-auto" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
