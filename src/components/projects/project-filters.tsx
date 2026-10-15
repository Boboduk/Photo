"use client";

import { SearchIcon, XIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { COLLAB_FORMATS, TEAM_ROLES } from "@/lib/constants";
import type { ProjectFilters as Filters } from "@/lib/queries/search";

export function ProjectFilters({
  filters,
  categoryOptions,
  hasFilters,
}: {
  filters: Filters;
  categoryOptions: { value: string; label: string }[];
  hasFilters: boolean;
}) {
  const t = useT();
  const onChange = (event: React.FormEvent<HTMLFormElement>) => {
    if ((event.target as HTMLElement).tagName === "SELECT") event.currentTarget.requestSubmit();
  };

  return (
    <Form action="/projects" scroll={false} onChange={onChange} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-subtle" />
          <Input
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder={t.projects.searchPlaceholder}
            aria-label={t.common.search}
            className="h-12 rounded-full pl-11"
          />
        </div>
        <Input
          name="city"
          defaultValue={filters.city ?? ""}
          placeholder={t.catalog.cityPlaceholder}
          aria-label={t.catalog.city}
          className="h-12 rounded-full px-5 sm:w-56"
        />
        <Button type="submit" className="h-12 px-6">
          {t.common.search}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <NativeSelect name="role" defaultValue={filters.role ?? ""} aria-label={t.projects.lookingFor} className="rounded-full text-sm">
          <option value="">{t.projects.anyRole}</option>
          {TEAM_ROLES.map((role) => (
            <option key={role} value={role}>
              {t.projects.lookingFor}: {t.enums.teamRole[role].toLowerCase()}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="format" defaultValue={filters.format ?? ""} aria-label={t.projects.format} className="rounded-full text-sm">
          <option value="">{t.projects.allFormats}</option>
          {COLLAB_FORMATS.map((format) => (
            <option key={format} value={format}>
              {t.enums.collabFormat[format]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="category" defaultValue={filters.category ?? ""} aria-label={t.catalog.category} className="rounded-full text-sm">
          <option value="">{t.catalog.anyCategory}</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          name="status"
          defaultValue={filters.statuses.length > 1 ? "all" : ""}
          aria-label={t.projects.status}
          className="rounded-full text-sm"
        >
          <option value="">{t.projects.onlyOpen}</option>
          <option value="all">{t.projects.allStatuses}</option>
        </NativeSelect>
        <NativeSelect name="sort" defaultValue={filters.sort === "soon" ? "soon" : ""} aria-label={t.catalog.sort} className="rounded-full text-sm">
          <option value="">{t.projects.sortNewest}</option>
          <option value="soon">{t.projects.sortSoon}</option>
        </NativeSelect>
      </div>
      {hasFilters ? (
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects" scroll={false}>
              <XIcon />
              {t.catalog.resetFilters}
            </Link>
          </Button>
        </div>
      ) : null}
    </Form>
  );
}
