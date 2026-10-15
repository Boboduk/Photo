import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Проверка на сервере (proxy.ts — только первая линия защиты).
  await requireUser("/dashboard");
  return (
    <AppShell footer={false}>
      <div className="container-page flex flex-1 flex-col gap-6 py-6 lg:flex-row lg:gap-10 lg:py-10">
        <DashboardNav />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AppShell>
  );
}
