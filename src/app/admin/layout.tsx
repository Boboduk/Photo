import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { AppShell } from "@/components/layout/app-shell";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Администрирование",
  robots: { index: false, follow: false },
};

/**
 * Админка доступна только модераторам и администраторам. Проверка выполняется
 * на сервере при каждом запросе; остальные получают 404.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireModerator();
  const supabase = await createClient();
  const { count } = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");
  return (
    <AppShell footer={false}>
      <div className="container-page flex flex-1 flex-col gap-6 py-6 lg:flex-row lg:gap-10 lg:py-10">
        <AdminNav isAdmin={user.profile.role === "admin"} openReports={count ?? 0} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AppShell>
  );
}
