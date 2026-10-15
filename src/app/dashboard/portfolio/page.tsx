import { ImagesIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PortfolioManager } from "@/components/portfolio/portfolio-manager";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.dashboardPortfolio.title };
}

export default async function DashboardPortfolioPage() {
  const user = await requireUser("/dashboard/portfolio");
  const t = await getT();
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("portfolio_items")
    .select("id, title, cover_image_url, is_published, is_cover, hidden_at, likes_count, images_count")
    .eq("owner_id", user.id)
    .order("position")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        size="md"
        title={t.dashboardPortfolio.title}
        subtitle={t.dashboardPortfolio.subtitle}
        actions={
          <Button asChild>
            <Link href="/dashboard/portfolio/new">
              <PlusIcon />
              {t.dashboardPortfolio.newWork}
            </Link>
          </Button>
        }
      />
      {items && items.length > 0 ? (
        <PortfolioManager initialItems={items} />
      ) : (
        <EmptyState
          icon={ImagesIcon}
          title={t.dashboardPortfolio.emptyTitle}
          text={t.dashboardPortfolio.emptyText}
          action={
            <Button asChild>
              <Link href="/dashboard/portfolio/new">{t.dashboardPortfolio.newWork}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
