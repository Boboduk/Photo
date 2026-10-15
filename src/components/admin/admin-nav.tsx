"use client";

import { FlagIcon, FolderTreeIcon, LayoutGridIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function AdminNav({ isAdmin, openReports }: { isAdmin: boolean; openReports: number }) {
  const t = useT();
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: t.admin.nav.overview, icon: LayoutGridIcon, exact: true },
    { href: "/admin/users", label: t.admin.nav.users, icon: UsersIcon },
    { href: "/admin/reports", label: t.admin.nav.reports, icon: FlagIcon, count: openReports },
    { href: "/admin/content", label: t.admin.nav.content, icon: ShieldCheckIcon },
    ...(isAdmin ? [{ href: "/admin/categories", label: t.admin.nav.categories, icon: FolderTreeIcon }] : []),
  ];
  return (
    <nav aria-label={t.admin.title} className="lg:w-56 lg:shrink-0">
      <p className="mb-3 hidden text-xs font-semibold tracking-wide text-subtle uppercase lg:block">{t.admin.title}</p>
      <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:px-0">
        {items.map((item) => {
          const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
                {"count" in item && item.count ? (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
