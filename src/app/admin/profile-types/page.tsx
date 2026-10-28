import { ProfileTypeRow } from "@/components/admin/profile-type-editor";
import { PageHeader } from "@/components/common/page-header";
import { getI18n } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProfileTypesPage() {
  await requireAdmin();
  const { t } = await getI18n();
  const supabase = await createClient();
  const { data: profileTypes } = await supabase
    .from("profile_types")
    .select("*")
    .order("sort_order")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader size="md" title={t.admin.profileTypesTitle} subtitle={t.admin.profileTypesText} />
      <ProfileTypeRow isNew />
      <div className="flex flex-col gap-3">
        {(profileTypes ?? []).map((pt) => (
          <ProfileTypeRow
            key={pt.slug}
            initial={{
              slug: pt.slug,
              name: pt.name,
              name_en: ((pt.translations ?? {}) as Record<string, string>).en ?? "",
              sort_order: pt.sort_order,
              shows_in_photographer_catalog: pt.shows_in_photographer_catalog,
              shows_in_model_catalog: pt.shows_in_model_catalog,
              is_active: pt.is_active,
            }}
          />
        ))}
      </div>
    </div>
  );
}
