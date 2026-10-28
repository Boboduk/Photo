"use client";

import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, NativeSelect } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import {
  AVAILABILITY_STATUSES,
  COLLAB_FORMATS,
  EXPERIENCE_LEVELS,
} from "@/lib/constants";
import type { ProfileFilters } from "@/lib/queries/search";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export function CatalogFilters({
  action,
  kind,
  filters,
  typeOptions,
  specializationOptions,
  categoryOptions,
  activeCount,
  children,
}: {
  action: string;
  kind: "photographer" | "model";
  filters: ProfileFilters;
  typeOptions: Option[];
  specializationOptions: Option[];
  categoryOptions: Option[];
  activeCount: number;
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  // Фильтры применяются сразу при изменении — без лишних нажатий.
  const autoSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target as unknown as HTMLInputElement;
    if (target.type === "checkbox" || target.tagName === "SELECT") {
      event.currentTarget.requestSubmit();
    }
  };

  return (
    <Form action={action} onChange={autoSubmit} scroll={false} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-subtle" />
          <Input
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder={t.catalog.searchPlaceholder}
            aria-label={t.common.search}
            className="h-12 rounded-full pl-11"
          />
        </div>
        <div className="flex gap-2.5">
          <NativeSelect
            name="sort"
            defaultValue={filters.sort}
            aria-label={t.catalog.sort}
            className="h-12 w-auto rounded-full pr-10 pl-4 text-sm"
          >
            <option value="relevance">{t.catalog.sortRelevance}</option>
            <option value="active">{t.catalog.sortActive}</option>
            <option value="newest">{t.catalog.sortNewest}</option>
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            className="h-12 lg:hidden"
            aria-expanded={open}
            aria-controls="catalog-filters"
            onClick={() => setOpen((v) => !v)}
          >
            <SlidersHorizontalIcon />
            {t.catalog.showFilters}
            {activeCount > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                {activeCount}
              </span>
            ) : null}
          </Button>
          <Button type="submit" className="h-12 px-6">
            {t.common.search}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
        <aside
          id="catalog-filters"
          aria-label={t.catalog.filters}
          className={cn("flex-col gap-7 lg:flex", open ? "flex rounded-xl border border-line p-5 lg:border-0 lg:p-0" : "hidden")}
        >
          <FilterGroup title={t.catalog.city}>
            <Input name="city" defaultValue={filters.city ?? ""} placeholder={t.catalog.cityPlaceholder} />
          </FilterGroup>

          <FilterGroup title={t.catalog.type}>
            {typeOptions.map((option) => (
              <CheckOption
                key={option.value}
                name="type"
                value={option.value}
                label={option.label}
                checked={filters.types.includes(option.value)}
              />
            ))}
          </FilterGroup>

          {specializationOptions.length > 0 ? (
            <FilterGroup title={kind === "photographer" ? t.catalog.specialization : t.catalog.direction}>
              {specializationOptions.map((option) => (
                <CheckOption
                  key={option.value}
                  name="spec"
                  value={option.value}
                  label={option.label}
                  checked={filters.specializations.includes(option.value)}
                />
              ))}
            </FilterGroup>
          ) : null}

          <FilterGroup title={t.catalog.category}>
            <NativeSelect name="category" defaultValue={filters.category ?? ""}>
              <option value="">{t.catalog.anyCategory}</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FilterGroup>

          <FilterGroup title={t.catalog.experience}>
            {EXPERIENCE_LEVELS.map((level) => (
              <CheckOption
                key={level}
                name="exp"
                value={level}
                label={t.enums.experience[level]}
                checked={filters.experience.includes(level)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title={t.catalog.availability}>
            {AVAILABILITY_STATUSES.map((status) => (
              <CheckOption
                key={status}
                name="avail"
                value={status}
                label={t.enums.availability[status]}
                checked={filters.availability.includes(status)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title={t.catalog.format}>
            {COLLAB_FORMATS.map((format) => (
              <CheckOption
                key={format}
                name="format"
                value={format}
                label={t.enums.collabFormat[format]}
                checked={filters.formats.includes(format)}
              />
            ))}
          </FilterGroup>

          <FilterGroup title={t.catalog.tags}>
            <Input name="tags" defaultValue={filters.tags.join(", ")} placeholder={t.catalog.tagsPlaceholder} />
          </FilterGroup>

          <div className="flex flex-col gap-2">
            <Button type="submit" onClick={() => setOpen(false)}>
              {t.catalog.applyFilters}
            </Button>
            {activeCount > 0 || filters.q ? (
              <Button asChild variant="ghost">
                <Link href={action} scroll={false}>
                  <XIcon />
                  {t.catalog.resetFilters}
                </Link>
              </Button>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </Form>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckOption({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground/90">
      <Checkbox name={name} value={value} defaultChecked={checked} />
      {label}
    </label>
  );
}
