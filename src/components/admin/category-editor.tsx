"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export type CategoryDraft = {
  slug: string;
  name: string;
  name_en: string;
  sort_order: number;
  for_photographers: boolean;
  for_models: boolean;
  for_works: boolean;
  is_active: boolean;
};

const EMPTY: CategoryDraft = {
  slug: "",
  name: "",
  name_en: "",
  sort_order: 200,
  for_photographers: true,
  for_models: false,
  for_works: true,
  is_active: true,
};

export function CategoryRow({ initial, isNew = false }: { initial?: CategoryDraft; isNew?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState<CategoryDraft>(initial ?? EMPTY);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof CategoryDraft>(key: K, v: CategoryDraft[K]) => setValue((current) => ({ ...current, [key]: v }));

  const save = () =>
    startTransition(async () => {
      const result = await saveCategoryAction(value, isNew);
      if (result.ok) {
        toast.success(result.message);
        if (isNew) setValue(EMPTY);
        router.refresh();
      } else toast.error(result.error);
    });

  const flags = [
    ["for_photographers", t.admin.forPhotographers],
    ["for_models", t.admin.forModels],
    ["for_works", t.admin.forWorks],
    ["is_active", t.admin.activeCategory],
  ] as const;

  return (
    <div className="grid gap-3 rounded-xl border border-line p-4 lg:grid-cols-[140px_1fr_1fr_80px] lg:items-end">
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t.admin.categorySlug}
        <Input value={value.slug} onChange={(e) => set("slug", e.target.value)} disabled={!isNew} className="h-9 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t.admin.categoryName}
        <Input value={value.name} onChange={(e) => set("name", e.target.value)} className="h-9 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        English
        <Input value={value.name_en} onChange={(e) => set("name_en", e.target.value)} className="h-9 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        {t.admin.categoryOrder}
        <Input type="number" value={value.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className="h-9 text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm lg:col-span-4">
        {flags.map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={value[key]} onChange={(e) => set(key, e.target.checked)} />
            {label}
          </label>
        ))}
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={save} disabled={pending || !value.slug || !value.name}>
            {isNew ? <PlusIcon /> : null}
            {isNew ? t.admin.addCategory : t.common.save}
          </Button>
          {!isNew ? (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" aria-label={t.common.delete}>
                  <Trash2Icon />
                </Button>
              }
              title={t.admin.deleteCategoryTitle}
              description={t.admin.deleteCategoryText}
              confirmLabel={t.common.delete}
              onConfirm={async () => {
                const result = await deleteCategoryAction(value.slug);
                if (!result.ok) {
                  toast.error(result.error);
                  return false;
                }
                toast.success(result.message);
                router.refresh();
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
