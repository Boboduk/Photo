"use client";

import {
  BellIcon,
  CameraIcon,
  FolderOpenIcon,
  HouseIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  MessageCircleIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "@/i18n/format";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { CountBadge, useUnreadCounts } from "./unread-counts";

export type HeaderUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isStaff: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const t = useT();
  const pathname = usePathname();
  const { counts } = useUnreadCounts();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/", label: t.nav.home, icon: HouseIcon },
    { href: "/photographers", label: t.nav.photographers, icon: CameraIcon },
    { href: "/models", label: t.nav.models, icon: UsersIcon },
    { href: "/portfolio", label: t.nav.portfolio, icon: ImagesIcon },
    { href: "/projects", label: t.nav.projects, icon: FolderOpenIcon },
    { href: "/dashboard/messages", label: t.nav.messages, icon: MessageCircleIcon, count: counts.messages },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="-ml-1 rounded-md px-1 py-1" aria-label="FRAME">
          <Logo />
        </Link>

        <nav aria-label={t.nav.menu} className="ml-6 hidden items-center gap-0.5 xl:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "bg-surface text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {link.label}
              {link.count ? (
                <CountBadge count={link.count} />
              ) : null}
              {link.count ? (
                <span className="sr-only">{format(t.nav.unreadMessages, { count: link.count })}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link href="/dashboard/notifications" aria-label={t.nav.notifications}>
                  <BellIcon />
                  {counts.notifications > 0 ? (
                    <>
                      <CountBadge count={counts.notifications} className="absolute -top-0.5 -right-0.5" />
                      <span className="sr-only">
                        {format(t.nav.unreadNotifications, { count: counts.notifications })}
                      </span>
                    </>
                  ) : null}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="relative xl:hidden">
                <Link href="/dashboard/messages" aria-label={t.nav.messages}>
                  <MessageCircleIcon />
                  <CountBadge count={counts.messages} className="absolute -top-0.5 -right-0.5" />
                </Link>
              </Button>
              <UserMenu user={user} />
            </>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button asChild variant="ghost">
                <Link href={`/login${pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""}`}>{t.nav.login}</Link>
              </Button>
              <Button asChild>
                <Link href="/register">{t.nav.register}</Link>
              </Button>
            </div>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden" aria-label={t.nav.menu}>
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" closeLabel={t.common.close} aria-describedby={undefined}>
              <SheetTitle className="sr-only">{t.nav.menu}</SheetTitle>
              <Logo className="mb-4" />
              <nav aria-label={t.nav.menu} className="flex flex-col gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                      isActive(pathname, link.href) ? "bg-surface" : "hover:bg-surface",
                    )}
                  >
                    <link.icon className="size-5 text-muted" />
                    {link.label}
                    {link.count ? <CountBadge count={link.count} className="ml-auto" /> : null}
                  </Link>
                ))}
              </nav>
              {!user ? (
                <div className="mt-auto flex flex-col gap-2 pt-6">
                  <Button asChild size="lg">
                    <Link href="/register" onClick={() => setMenuOpen(false)}>
                      {t.nav.register}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      {t.nav.login}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: HeaderUser }) {
  const t = useT();
  const [, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
        aria-label={t.nav.menu}
      >
        <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3">
          <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{user.displayName}</span>
            <span className="block truncate text-xs text-muted">@{user.username}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/users/${user.username}`}>
            <UserIcon />
            {t.nav.myProfile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboardIcon />
            {t.nav.dashboard}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <SettingsIcon />
            {t.nav.settings}
          </Link>
        </DropdownMenuItem>
        {user.isStaff ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldIcon />
              {t.nav.admin}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => startTransition(() => signOutAction())}>
          <LogOutIcon />
          {t.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
