import { SearchIcon, SearchXIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PortfolioResults } from "@/components/portfolio/portfolio-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getI18n, getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";
import { parsePortfolioFilters, searchPortfolio } from "@/lib/queries/search";
import { cn, toQueryString } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.portfolio.feedTitle, description: t.portfolio.feedSubtitle };
}

export default async function PortfolioFeedPage(props: PageProps<"/portfolio">) {
  const searchParams = await props.searchParams;
  const { t, locale } = await getI18n();
  const filters = parsePortfolioFilters(searchParams);
  const [user, categories, results] = await Promise.all([getCurrentUser(), getCategories(), searchPortfolio(filters)]);
  const labels = Object.fromEntries(categories.map((c) => [c.slug, categoryName(c, locale)]));

  const link = (changes: Record<string, string | undefined>) => {
    const query = toQueryString({ ...searchParams, ...changes });
    return query ? `/portfolio?${query}` : "/portfolio";
  };

  return (
    <div className="container-page pt-10 sm:pt-14">
      <PageHeader title={t.portfolio.feedTitle} subtitle={t.portfolio.feedSubtitle} className="mb-8" />

      <Form action="/portfolio" scroll={false} className="relative mb-5 max-w-xl">
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        {filters.sort !== "newest" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-subtle" />
        <Input
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder={t.portfolio.searchPlaceholder}
          aria-label={t.common.search}
          className="h-12 rounded-full pl-11"
        />
      </Form>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t.portfolio.category} className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          <Chip href={link({ category: undefined })} active={!filters.category}>
            {t.portfolio.allCategories}
          </Chip>
          {categories
            .filter((c) => c.for_works)
            .map((c) => (
              <Chip key={c.slug} href={link({ category: c.slug })} active={filters.category === c.slug}>
                {labels[c.slug]}
              </Chip>
            ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface p-1 text-sm">
          {(["newest", "popular"] as const).map((sort) => (
            <Link
              key={sort}
              href={link({ sort: sort === "newest" ? undefined : sort })}
              scroll={false}
              aria-current={filters.sort === sort ? "true" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition-colors",
                filters.sort === sort ? "bg-background shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {sort === "newest" ? t.portfolio.sortNewest : t.portfolio.sortPopular}
            </Link>
          ))}
        </div>
      </div>

      {filters.tag ? (
        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="text-muted">{t.portfolio.tags}:</span>
          <Link
            href={link({ tag: undefined })}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 font-medium text-background"
          >
            #{filters.tag}
            <XIcon className="size-3.5" />
          </Link>
        </div>
      ) : null}

      {results.items.length > 0 ? (
        <PortfolioResults
          query={toQueryString(searchParams)}
          initial={results}
          categoryLabels={labels}
          isAuthenticated={Boolean(user)}
        />
      ) : (
        <EmptyState
          icon={SearchXIcon}
          title={t.portfolio.emptyTitle}
          text={t.portfolio.emptyText}
          action={
            <Button asChild variant="outline">
              <Link href="/portfolio">{t.catalog.resetFilters}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors",
        active ? "bg-foreground text-background" : "border border-line hover:border-foreground",
      )}
    >
      {children}
    </Link>
  );
}
