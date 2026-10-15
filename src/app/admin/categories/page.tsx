import { CategoryRow } from "@/components/admin/category-editor";
import { PageHeader } from "@/components/common/page-header";
import { getI18n } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("sort_order").order("name");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader size="md" title={t.admin.categoriesTitle} subtitle={t.admin.categoriesText} />
      <CategoryRow isNew />
      <div className="flex flex-col gap-3">
        {(categories ?? []).map((category) => (
          <CategoryRow
            key={category.slug}
            initial={{
              slug: category.slug,
              name: category.name,
              name_en: ((category.translations ?? {}) as Record<string, string>).en ?? "",
              sort_order: category.sort_order,
              for_photographers: category.for_photographers,
              for_models: category.for_models,
              for_works: category.for_works,
              is_active: category.is_active,
            }}
          />
        ))}
      </div>
    </div>
  );
}
