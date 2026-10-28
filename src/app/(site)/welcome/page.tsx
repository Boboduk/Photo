import type { Metadata } from "next";
import { OnboardingForm } from "@/components/dashboard/onboarding-form";
import { ProfileImageUpload } from "@/components/media/profile-image-upload";
import { brand } from "@/config/brand";
import { format } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";
import { getProfileTypes } from "@/lib/queries/profile-types";
import { firstParam, safeNextPath } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: format(t.welcome.title, { brand: brand.name }) };
}

/** Первый вход: предлагаем загрузить фото и коротко заполнить профиль. */
export default async function WelcomePage(props: PageProps<"/welcome">) {
  const user = await requireUser("/welcome");
  const { t, locale } = await getI18n();
  const next = safeNextPath(firstParam((await props.searchParams).next));
  const [categories, profileTypes] = await Promise.all([getCategories(), getProfileTypes()]);
  const type = user.profile.profile_type;
  const profileTypeData = profileTypes.find((pt) => pt.slug === type);
  const profileTypeName = profileTypeData?.name ?? type;
  const options = categories
    .filter((c) => {
      if (profileTypeData?.shows_in_photographer_catalog && profileTypeData?.shows_in_model_catalog) return c.for_photographers || c.for_models;
      if (profileTypeData?.shows_in_photographer_catalog) return c.for_photographers;
      if (profileTypeData?.shows_in_model_catalog) return c.for_models;
      return c.for_photographers || c.for_models;
    })
    .map((c) => ({ value: c.slug, label: categoryName(c, locale) }));

  return (
    <div className="container-page max-w-2xl py-12 sm:py-16">
      <p className="text-sm font-medium text-brand">{profileTypeName}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{format(t.welcome.title, { brand: brand.name })}</h1>
      <p className="mt-3 text-lg text-muted">{t.welcome.subtitle}</p>

      <section className="mt-10 rounded-xl border border-line p-6">
        <h2 className="font-semibold">{t.welcome.avatarTitle}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">{t.welcome.avatarText}</p>
        <ProfileImageUpload kind="avatar" userId={user.id} name={user.profile.display_name} initialUrl={user.profile.avatar_url} />
      </section>

      <div className="mt-8">
        <OnboardingForm
          next={next}
          specializationOptions={options}
          specializationLabel={profileTypeData?.shows_in_model_catalog && !profileTypeData?.shows_in_photographer_catalog ? t.profileForm.specializationsModel : t.profileForm.specializationsPhotographer}
        />
      </div>
    </div>
  );
}
