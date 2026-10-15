import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ProjectEditor } from "@/components/projects/project-editor";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboardProjects.newTitle };
}

export default async function NewProjectPage() {
  const user = await requireUser("/dashboard/projects/new");
  const { t, locale } = await getI18n();
  const categories = await getCategories();
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader size="md" title={t.dashboardProjects.newTitle} />
      <ProjectEditor
        userId={user.id}
        defaultCity={user.profile.city}
        categories={categories.filter((c) => c.for_works).map((c) => ({ value: c.slug, label: categoryName(c, locale) }))}
      />
    </div>
  );
}
