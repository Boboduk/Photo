import { FolderSearchIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectResults } from "@/components/projects/project-results";
import { Button } from "@/components/ui/button";
import { getI18n, getT } from "@/i18n/server";
import { categoryName, getCategories } from "@/lib/categories";
import { parseProjectFilters, searchProjects } from "@/lib/queries/search";
import { toQueryString } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.projects.title, description: t.projects.subtitle };
}

export default async function ProjectsPage(props: PageProps<"/projects">) {
  const searchParams = await props.searchParams;
  const { t, locale } = await getI18n();
  const filters = parseProjectFilters(searchParams);
  const [categories, results] = await Promise.all([getCategories(), searchProjects(filters)]);
  const labels = Object.fromEntries(categories.map((c) => [c.slug, categoryName(c, locale)]));
  const query = toQueryString(searchParams);

  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader
        title={t.projects.title}
        subtitle={t.projects.subtitle}
        className="mb-8"
        actions={
          <Button asChild size="lg">
            <Link href="/dashboard/projects/new">
              <PlusIcon />
              {t.projects.create}
            </Link>
          </Button>
        }
      />
      <ProjectFilters
        filters={filters}
        categoryOptions={categories.filter((c) => c.for_works).map((c) => ({ value: c.slug, label: labels[c.slug] }))}
        hasFilters={query.length > 0}
      />
      <div className="mt-8">
        {results.items.length > 0 ? (
          <ProjectResults query={query} initial={results} categoryLabels={labels} />
        ) : (
          <EmptyState
            icon={FolderSearchIcon}
            title={t.projects.emptyTitle}
            text={t.projects.emptyText}
            action={
              <Button asChild>
                <Link href="/dashboard/projects/new">{t.projects.create}</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
