import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { WorkEditor } from "@/components/portfolio/work-editor";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboardPortfolio.newTitle };
}

export default async function NewWorkPage() {
  const user = await requireUser("/dashboard/portfolio/new");
  const { t, locale } = await getI18n();
  const categories = await getCategories();
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader size="md" title={t.dashboardPortfolio.newTitle} />
      <WorkEditor
        userId={user.id}
        categories={categories.filter((c) => c.for_works).map((c) => ({ value: c.slug, label: categoryName(c, locale) }))}
      />
    </div>
  );
}
