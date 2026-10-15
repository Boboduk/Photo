import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { WorkEditor } from "@/components/portfolio/work-editor";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";
import { getPortfolioItem } from "@/lib/queries/portfolio";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboardPortfolio.editTitle };
}

export default async function EditWorkPage(props: PageProps<"/dashboard/portfolio/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireUser(`/dashboard/portfolio/${id}/edit`);
  const { t, locale } = await getI18n();
  const [item, categories] = await Promise.all([getPortfolioItem(id), getCategories()]);
  // Редактировать можно только собственные работы.
  if (!item || item.owner_id !== user.id) notFound();

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader size="md" title={t.dashboardPortfolio.editTitle} />
      <WorkEditor
        userId={user.id}
        categories={categories.filter((c) => c.for_works).map((c) => ({ value: c.slug, label: categoryName(c, locale) }))}
        initial={{
          id: item.id,
          title: item.title,
          description: item.description,
          category_slug: item.category_slug,
          shot_on: item.shot_on,
          is_published: item.is_published,
          tags: item.tags.map((tag) => tag.tag),
          images: item.images.map((image) => ({ id: image.id, url: image.url })),
          credits: item.credits.map((credit) => ({
            key: credit.id,
            profile_id: credit.profile?.id ?? null,
            name: credit.profile ? null : credit.name,
            role: credit.role,
            display: credit.profile
              ? { display_name: credit.profile.display_name, username: credit.profile.username, avatar_url: credit.profile.avatar_url }
              : undefined,
          })),
        }}
      />
    </div>
  );
}
