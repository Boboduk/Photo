import { SearchXIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { format, plural } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { categoryName, getCategories } from "@/lib/categories";
import { getProfileTypes } from "@/lib/queries/profile-types";
import { parseProfileFilters, searchProfiles } from "@/lib/queries/search";
import { toQueryString } from "@/lib/utils";
import { CatalogFilters } from "./catalog-filters";
import { ProfileResults } from "./profile-results";

type SearchParams = Record<string, string | string[] | undefined>;

/** Каталог фотографов или моделей: поиск по реальным профилям из базы. */
export async function CatalogPage({ kind, searchParams }: { kind: "photographer" | "model"; searchParams: SearchParams }) {
  const { t, locale } = await getI18n();
  const filters = parseProfileFilters(kind, searchParams);
  const [categories, profileTypes, results] = await Promise.all([
    getCategories(),
    getProfileTypes(),
    searchProfiles(filters),
  ]);

  const labels = Object.fromEntries(categories.map((c) => [c.slug, categoryName(c, locale)]));
  const profileTypeLabels = Object.fromEntries(profileTypes.map((pt) => [pt.slug, pt.name]));
  const specializationOptions = categories
    .filter((c) => (kind === "photographer" ? c.for_photographers : c.for_models))
    .map((c) => ({ value: c.slug, label: labels[c.slug] }));
  const categoryOptions = categories.filter((c) => c.for_works).map((c) => ({ value: c.slug, label: labels[c.slug] }));
  const typeOptions = profileTypes
    .filter((pt) => (kind === "photographer" ? pt.shows_in_photographer_catalog : pt.shows_in_model_catalog))
    .map((pt) => ({ value: pt.slug, label: pt.name }));

  const activeCount =
    (filters.city ? 1 : 0) +
    filters.types.length +
    filters.specializations.length +
    (filters.category ? 1 : 0) +
    filters.experience.length +
    filters.availability.length +
    filters.formats.length +
    filters.tags.length;

  const action = kind === "photographer" ? "/photographers" : "/models";
  const query = toQueryString(searchParams);

  return (
    <div className="container-page pt-10 pb-4 sm:pt-14">
      <PageHeader
        title={kind === "photographer" ? t.catalog.photographersTitle : t.catalog.modelsTitle}
        subtitle={kind === "photographer" ? t.catalog.photographersSubtitle : t.catalog.modelsSubtitle}
        className="mb-8"
      />
      <CatalogFilters
        action={action}
        kind={kind}
        filters={filters}
        typeOptions={typeOptions}
        specializationOptions={specializationOptions}
        categoryOptions={categoryOptions}
        activeCount={activeCount}
      >
        <p className="mb-5 text-sm text-muted" aria-live="polite">
          {format(plural(locale, results.total, t.catalog.found), { count: results.total })}
        </p>
        {results.items.length > 0 ? (
          <ProfileResults kind={kind} query={query} initial={results} categoryLabels={labels} profileTypeLabels={profileTypeLabels} />
        ) : (
          <EmptyState
            icon={SearchXIcon}
            title={t.catalog.emptyTitle}
            text={t.catalog.emptyText}
            action={
              <Button asChild variant="outline">
                <Link href={action}>{t.catalog.resetFilters}</Link>
              </Button>
            }
          />
        )}
      </CatalogFilters>
    </div>
  );
}
