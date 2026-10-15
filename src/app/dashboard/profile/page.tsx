import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { ProfileImageUpload } from "@/components/media/profile-image-upload";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.profileForm.title };
}

export default async function DashboardProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const [{ data: privateData }, categories] = await Promise.all([
    supabase.from("profile_private").select("*").eq("id", user.id).maybeSingle(),
    getCategories(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        size="md"
        title={t.profileForm.title}
        subtitle={t.profileForm.subtitle}
        actions={
          <Button asChild variant="outline">
            <Link href={`/users/${user.profile.username}`}>{t.dashboard.quick.viewProfile}</Link>
          </Button>
        }
      />
      <section className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-10">
        <h2 className="font-semibold">{t.profileForm.sections.photos}</h2>
        <div className="flex flex-col gap-8">
          <ProfileImageUpload kind="avatar" userId={user.id} name={user.profile.display_name} initialUrl={user.profile.avatar_url} />
          <div>
            <p className="mb-3 text-sm font-medium">{t.profileForm.cover}</p>
            <ProfileImageUpload kind="cover" userId={user.id} name={user.profile.display_name} initialUrl={user.profile.cover_url} />
          </div>
        </div>
      </section>
      <ProfileForm
        profile={user.profile}
        privateData={privateData}
        categories={categories
          .filter((c) => c.for_photographers || c.for_models)
          .map((c) => ({
            slug: c.slug,
            label: categoryName(c, locale),
            for_photographers: c.for_photographers,
            for_models: c.for_models,
          }))}
      />
    </div>
  );
}
