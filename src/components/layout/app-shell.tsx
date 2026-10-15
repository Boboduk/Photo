import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/i18n/server";
import { FlashToast } from "./flash-toast";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { UnreadCountsProvider, type UnreadCounts } from "./unread-counts";

/** Общая оболочка страниц: шапка, счётчики непрочитанного, подвал. */
export async function AppShell({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);

  let counts: UnreadCounts | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unread_counts");
    const value = (data ?? {}) as Record<string, number>;
    counts = { messages: Number(value.messages ?? 0), notifications: Number(value.notifications ?? 0) };
  }

  return (
    <UnreadCountsProvider userId={user?.id ?? null} initial={counts}>
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-foreground px-4 py-2 text-sm text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.nav.skipToContent}
      </a>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader
          user={
            user
              ? {
                  id: user.id,
                  username: user.profile.username,
                  displayName: user.profile.display_name,
                  avatarUrl: user.profile.avatar_url,
                  isStaff: isStaff(user.profile),
                }
              : null
          }
        />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        {footer ? <SiteFooter /> : null}
      </div>
      <Suspense>
        <FlashToast />
      </Suspense>
    </UnreadCountsProvider>
  );
}
