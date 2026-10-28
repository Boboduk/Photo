"use client";

import {
  AlertTriangleIcon,
  CheckIcon,
  DownloadIcon,
  GlobeIcon,
  HandIcon,
  LoaderCircleIcon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  ShirtIcon,
  SparklesIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteTryOnItemAction,
  generateTryOnAction,
  requestTryOnPhotoAction,
  setTryOnModelSharedAction,
  shareAvatarForTryOnAction,
} from "@/actions/tryon";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SmartImage } from "@/components/media/smart-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useLocale, useT } from "@/i18n/client";
import { format, formatRelative } from "@/i18n/format";
import type { GarmentCategory } from "@/lib/constants";
import { TRYON_LIMITS } from "@/lib/tryon/config";
import type {
  TryOnGarmentView,
  TryOnModelProfileView,
  TryOnModelView,
  TryOnPlatformModelView,
  TryOnResultView,
  TryOnStudioData,
} from "@/lib/tryon/service";
import { cn } from "@/lib/utils";
import { TryOnUploadDialog } from "./tryon-upload-dialog";

export function TryOnStudio({
  userId,
  configured,
  canShare,
  initialModelId,
  focusRequests,
  models,
  platformModels,
  modelProfiles,
  garments,
  results,
  incomingRequests,
}: TryOnStudioData & {
  userId: string;
  configured: boolean;
  canShare: boolean;
  initialModelId: string | null;
  /** Переход из уведомления «вас просят открыть фото». */
  focusRequests: boolean;
}) {
  const t = useT();
  const preselectedPlatform = platformModels.some((m) => m.id === initialModelId);
  const [modelId, setModelId] = useState<string | null>(
    initialModelId && (preselectedPlatform || models.some((m) => m.id === initialModelId)) ? initialModelId : (models[0]?.id ?? null),
  );
  // Тем, у кого нет своих фото (и кто сам не модель), сразу показываем моделей платформы.
  const platformCount = platformModels.length + modelProfiles.length;
  const [modelTab, setModelTab] = useState<"own" | "platform">(
    !focusRequests && (preselectedPlatform || (models.length === 0 && platformCount > 0 && !canShare)) ? "platform" : "own",
  );
  const [search, setSearch] = useState("");
  const [garmentIds, setGarmentIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<GarmentCategory | "all">("all");
  const [instructions, setInstructions] = useState("");
  const [upload, setUpload] = useState<"model" | "garment" | null>(null);
  const [running, startRunning] = useTransition();

  // Выбор сбрасывается сам, если модель или наряд удалили (или модель закрыла доступ).
  const model: { id: string; url: string | null } | null =
    models.find((m) => m.id === modelId) ?? platformModels.find((m) => m.id === modelId) ?? models[0] ?? null;
  const query = search.trim().toLowerCase();
  const matches = (...values: (string | null)[]) => !query || values.some((value) => (value ?? "").toLowerCase().includes(query));
  const visiblePlatformModels = platformModels.filter((m) => matches(m.owner.display_name, m.owner.username, m.owner.city, m.name));
  const visibleModelProfiles = modelProfiles.filter((m) => matches(m.display_name, m.username, m.city));
  const showRequestsBanner = canShare && incomingRequests > 0 && !models.some((m) => m.is_shared);
  const chosen = garmentIds.flatMap((id) => garments.filter((g) => g.id === id));
  const categories = [...new Set(garments.map((g) => g.category))];
  const visibleGarments = filter === "all" ? garments : garments.filter((g) => g.category === filter);

  const toggleGarment = (id: string) => {
    if (garmentIds.includes(id)) {
      setGarmentIds(garmentIds.filter((value) => value !== id));
    } else if (chosen.length >= TRYON_LIMITS.garmentsPerLook) {
      toast.error(format(t.tryon.garments.tooMany, { max: TRYON_LIMITS.garmentsPerLook }));
    } else {
      setGarmentIds([...chosen.map((g) => g.id), id]);
    }
  };

  const generate = () => {
    if (!model || chosen.length === 0) return;
    startRunning(async () => {
      const result = await generateTryOnAction({
        model_id: model.id,
        garment_ids: chosen.map((g) => g.id),
        instructions,
      });
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  };

  const setShared = async (id: string, shared: boolean) => {
    const result = await setTryOnModelSharedAction(id, shared);
    if (result.ok) toast.success(result.message);
    else {
      toast.error(result.error);
      return false;
    }
  };

  const remove = async (kind: "model" | "garment" | "result", id: string) => {
    const result = await deleteTryOnItemAction(kind, id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {!configured ? (
        <p className="flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm leading-relaxed text-warning">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          {t.tryon.notConfigured}
        </p>
      ) : null}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-10">
          <Section step={1} title={t.tryon.steps.model}>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t.tryon.steps.model}>
              {(
                [
                  ["own", t.tryon.modelTabs.own, models.length],
                  ["platform", t.tryon.modelTabs.platform, platformCount],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={modelTab === value}
                  onClick={() => setModelTab(value)}
                  className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                >
                  {label}
                  <span className="text-xs opacity-70">{count}</span>
                </button>
              ))}
            </div>

            {modelTab === "own" ? (
              <>
                {showRequestsBanner ? <RequestsBanner count={incomingRequests} onUpload={() => setUpload("model")} /> : null}
                {models.length === 0 ? (
                  <p className="text-[15px] text-muted">
                    {t.tryon.models.empty}{" "}
                    {platformCount > 0 ? (
                      <button
                        type="button"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                        onClick={() => setModelTab("platform")}
                      >
                        {t.tryon.models.orPlatform}
                      </button>
                    ) : null}
                  </p>
                ) : null}
                {canShare && models.length > 0 && !models.some((m) => m.is_shared) ? (
                  <p className="text-sm text-muted">{t.tryon.share.hint}</p>
                ) : null}
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {models.map((item) => (
                    <li key={item.id}>
                      <Tile
                        item={item}
                        aspect="aspect-[3/4]"
                        fit="object-cover"
                        selected={model?.id === item.id}
                        label={format(t.tryon.models.select, {
                          name: item.name,
                        })}
                        badge={item.is_shared ? t.tryon.share.badge : undefined}
                        onSelect={() => setModelId(item.id)}
                        onDelete={() => remove("model", item.id)}
                        deleteTitle={t.tryon.models.deleteTitle}
                        deleteText={t.tryon.models.deleteText}
                        actions={canShare ? <ShareButton model={item} onChange={(shared) => setShared(item.id, shared)} /> : null}
                      />
                    </li>
                  ))}
                  {models.length < TRYON_LIMITS.models ? (
                    <li>
                      <AddTile aspect="aspect-[3/4]" label={t.tryon.models.add} icon={UserRoundIcon} onClick={() => setUpload("model")} />
                    </li>
                  ) : null}
                </ul>
              </>
            ) : (
              <>
                <p className="text-[15px] text-muted">{platformCount > 0 ? t.tryon.platform.hint : t.tryon.platform.empty}</p>
                {platformCount > 6 ? (
                  <div className="relative max-w-sm">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
                    <Input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t.tryon.platform.search}
                      aria-label={t.tryon.platform.search}
                      className="pl-10"
                    />
                  </div>
                ) : null}
                {query && visiblePlatformModels.length + visibleModelProfiles.length === 0 ? (
                  <p className="text-sm text-muted">{t.tryon.platform.notFound}</p>
                ) : null}
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {visiblePlatformModels.map((item) => (
                    <li key={item.id}>
                      <PlatformTile item={item} selected={model?.id === item.id} onSelect={() => setModelId(item.id)} />
                    </li>
                  ))}
                  {visibleModelProfiles.map((item) => (
                    <li key={item.id}>
                      <RequestTile item={item} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Section
            step={2}
            title={t.tryon.steps.garments}
            aside={
              garments.length > 0 ? (
                <span className="text-sm text-muted">
                  {format(t.tryon.garments.selected, {
                    count: chosen.length,
                    max: TRYON_LIMITS.garmentsPerLook,
                  })}
                </span>
              ) : null
            }
          >
            {garments.length === 0 ? <p className="text-[15px] text-muted">{t.tryon.garments.empty}</p> : null}
            {categories.length > 1 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t.tryon.garments.category}>
                {(["all", ...categories] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                    className="inline-flex h-8 items-center rounded-full border border-line-strong px-3.5 text-sm font-medium transition-colors hover:border-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                  >
                    {value === "all" ? t.common.all : t.enums.garmentCategory[value]}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {visibleGarments.map((item) => (
                <li key={item.id}>
                  <Tile
                    item={item}
                    aspect="aspect-square"
                    fit="object-contain bg-white"
                    selected={garmentIds.includes(item.id)}
                    label={format(t.tryon.garments.select, { name: item.name })}
                    caption={t.enums.garmentCategory[item.category]}
                    onSelect={() => toggleGarment(item.id)}
                    onDelete={() => remove("garment", item.id)}
                    deleteTitle={t.tryon.garments.deleteTitle}
                    deleteText={t.tryon.garments.deleteText}
                  />
                </li>
              ))}
              {garments.length < TRYON_LIMITS.garments ? (
                <li>
                  <AddTile aspect="aspect-square" label={t.tryon.garments.add} icon={ShirtIcon} onClick={() => setUpload("garment")} />
                </li>
              ) : null}
            </ul>
          </Section>
        </div>

        <aside className="flex flex-col gap-5 rounded-xl border border-line p-5 xl:sticky xl:top-24">
          <h2 className="flex items-center gap-2 font-semibold">
            <StepNumber step={3} />
            {t.tryon.steps.generate}
          </h2>
          <div className="flex gap-2">
            <Thumb url={model?.url ?? null} className="aspect-[3/4] w-20" fit="object-cover" empty={t.tryon.generate.needModel} />
            <div className="grid flex-1 grid-cols-3 content-start gap-2">
              {chosen.map((g) => (
                <Thumb key={g.id} url={g.url} className="aspect-square" fit="object-contain bg-white" />
              ))}
              {chosen.length === 0 ? (
                <p className="col-span-3 text-[13px] leading-snug text-muted">{t.tryon.generate.needGarments}</p>
              ) : null}
            </div>
          </div>
          <Field label={t.tryon.generate.instructions} htmlFor="tryon-instructions" optional={t.common.optional}>
            <Textarea
              id="tryon-instructions"
              className="min-h-20"
              value={instructions}
              maxLength={TRYON_LIMITS.instructionsMax}
              placeholder={t.tryon.generate.instructionsPlaceholder}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={running}
            />
          </Field>
          <Button size="lg" onClick={generate} disabled={!configured || running || !model || chosen.length === 0}>
            {running ? <LoaderCircleIcon className="animate-spin" /> : <SparklesIcon />}
            {running ? t.tryon.generate.running : t.tryon.generate.submit}
          </Button>
          {running ? (
            <p className="text-[13px] text-muted" role="status">
              {t.tryon.generate.runningHint}
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-[13px] text-subtle">
            <LockIcon className="size-3.5 shrink-0" />
            {t.tryon.privacyNote}
          </p>
        </aside>
      </div>

      <section className="flex flex-col gap-4 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">{t.tryon.results.title}</h2>
        {results.length === 0 && !running ? <p className="text-[15px] text-muted">{t.tryon.results.empty}</p> : null}
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {running ? (
            <li className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl bg-surface text-sm text-muted">
              <LoaderCircleIcon className="size-6 animate-spin" />
              {t.tryon.generate.running}
            </li>
          ) : null}
          {results.map((result) => (
            <li key={result.id}>
              <ResultCard result={result} onDelete={() => remove("result", result.id)} />
            </li>
          ))}
        </ul>
      </section>

      {upload ? <TryOnUploadDialog kind={upload} userId={userId} open onOpenChange={(open) => !open && setUpload(null)} /> : null}
    </div>
  );
}

function StepNumber({ step }: { step: number }) {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
      {step}
    </span>
  );
}

function Section({ step, title, aside, children }: { step: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <StepNumber step={step} />
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Thumb({ url, className, fit, empty }: { url: string | null; className?: string; fit: string; empty?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-surface", className)}>
      {url ? (
        <SmartImage src={url} alt="" fill unoptimized sizes="96px" className={fit} />
      ) : empty ? (
        <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] leading-tight text-muted">
          {empty}
        </span>
      ) : null}
    </div>
  );
}

function Tile({
  item,
  aspect,
  fit,
  selected,
  label,
  caption,
  onSelect,
  onDelete,
  deleteTitle,
  deleteText,
  badge,
  actions,
}: {
  item: TryOnModelView | TryOnGarmentView;
  aspect: string;
  fit: string;
  selected: boolean;
  label: string;
  caption?: string;
  onSelect: () => void;
  onDelete: () => Promise<boolean | void>;
  deleteTitle: string;
  deleteText: string;
  badge?: string;
  actions?: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="group relative flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={label}
        className={cn(
          "relative overflow-hidden rounded-xl bg-surface outline-none ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:ring-foreground",
          aspect,
          selected && "ring-2 ring-foreground",
        )}
      >
        {item.url ? <SmartImage src={item.url} alt="" fill unoptimized sizes="(min-width: 1024px) 160px, 30vw" className={fit} /> : null}
        {selected ? (
          <span className="absolute top-2 left-2 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-background">
            <CheckIcon className="size-3.5" />
          </span>
        ) : null}
        {badge ? (
          <Badge variant="overlay" className="absolute bottom-2 left-2">
            <GlobeIcon />
            {badge}
          </Badge>
        ) : null}
      </button>
      <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <ConfirmDialog
          title={deleteTitle}
          description={deleteText}
          confirmLabel={t.common.delete}
          onConfirm={onDelete}
          trigger={
            <Button variant="overlay" size="icon-sm" aria-label={`${t.common.delete}: ${item.name}`}>
              <Trash2Icon />
            </Button>
          }
        />
        {actions}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="truncate text-sm font-medium">{item.name}</p>
        {caption ? <p className="truncate text-xs text-muted">{caption}</p> : null}
      </div>
    </div>
  );
}

/** Открыть своё фото для примерки другим участникам (только для профилей моделей). */
function ShareButton({ model, onChange }: { model: TryOnModelView; onChange: (shared: boolean) => Promise<boolean | void> }) {
  const t = useT();
  const [consent, setConsent] = useState(false);
  const label = model.is_shared ? t.tryon.share.disable : t.tryon.share.enable;
  return (
    <ConfirmDialog
      title={model.is_shared ? t.tryon.share.disableTitle : t.tryon.share.enableTitle}
      description={model.is_shared ? t.tryon.share.disableText : t.tryon.share.enableText}
      confirmLabel={label}
      confirmVariant={model.is_shared ? "danger" : "primary"}
      confirmDisabled={!model.is_shared && !consent}
      onConfirm={async () => {
        const result = await onChange(!model.is_shared);
        setConsent(false);
        return result;
      }}
      trigger={
        <Button variant="overlay" size="icon-sm" aria-label={`${label}: ${model.name}`} aria-pressed={model.is_shared}>
          <GlobeIcon className={model.is_shared ? "text-brand" : undefined} />
        </Button>
      }
    >
      {!model.is_shared ? (
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <Checkbox className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {t.tryon.share.consent}
        </label>
      ) : null}
    </ConfirmDialog>
  );
}

function PlatformTile({ item, selected, onSelect }: { item: TryOnPlatformModelView; selected: boolean; onSelect: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={format(t.tryon.models.select, {
          name: item.owner.display_name,
        })}
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-xl bg-surface outline-none ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:ring-foreground",
          selected && "ring-2 ring-foreground",
        )}
      >
        {item.url ? (
          <SmartImage src={item.url} alt="" fill unoptimized sizes="(min-width: 1024px) 160px, 30vw" className="object-cover" />
        ) : null}
        {selected ? (
          <span className="absolute top-2 left-2 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-background">
            <CheckIcon className="size-3.5" />
          </span>
        ) : null}
      </button>
      <div className="flex min-w-0 items-center gap-2 px-0.5">
        <Avatar src={item.owner.avatar_url} name={item.owner.display_name} size="xs" />
        <div className="min-w-0">
          <Link
            href={`/users/${item.owner.username}`}
            className="block truncate text-sm font-medium hover:underline"
            title={item.owner.display_name}
            aria-label={format(t.tryon.platform.profile, {
              name: item.owner.display_name,
            })}
          >
            {item.owner.display_name}
          </Link>
          {item.owner.city ? <p className="truncate text-xs text-muted">{item.owner.city}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** Модель платформы без открытого фото: её можно попросить открыть примерку. */
function RequestTile({ item }: { item: TryOnModelProfileView }) {
  const t = useT();
  const [requested, setRequested] = useState(item.requested_at !== null);
  const [pending, startPending] = useTransition();
  const request = () =>
    startPending(async () => {
      const result = await requestTryOnPhotoAction(item.id);
      if (result.ok) {
        setRequested(true);
        toast.success(result.message);
      } else toast.error(result.error);
    });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex aspect-[3/4] flex-col items-center justify-end overflow-hidden rounded-xl bg-surface p-2">
        {item.avatar_url ? (
          <SmartImage
            src={item.avatar_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 160px, 30vw"
            className="object-cover opacity-50 grayscale"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <Avatar src={null} name={item.display_name} size="xl" />
          </span>
        )}
        <Badge variant="overlay" className="absolute top-2 left-2">
          <LockIcon />
          {t.tryon.platform.noPhoto}
        </Badge>
        <Button
          size="sm"
          variant={requested ? "overlay" : "primary"}
          className="relative w-full"
          disabled={requested || pending}
          onClick={request}
        >
          {pending ? <LoaderCircleIcon className="animate-spin" /> : requested ? <CheckIcon /> : <HandIcon />}
          {requested ? t.tryon.platform.requested : t.tryon.platform.request}
        </Button>
      </div>
      <div className="flex min-w-0 items-center gap-2 px-0.5">
        <Avatar src={item.avatar_url} name={item.display_name} size="xs" />
        <div className="min-w-0">
          <Link
            href={`/users/${item.username}`}
            className="block truncate text-sm font-medium hover:underline"
            title={item.display_name}
            aria-label={format(t.tryon.platform.profile, {
              name: item.display_name,
            })}
          >
            {item.display_name}
          </Link>
          {item.city ? <p className="truncate text-xs text-muted">{item.city}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** Модели пришли запросы открыть фото: открыть аватар одним нажатием или загрузить фото. */
function RequestsBanner({ count, onUpload }: { count: number; onUpload: () => void }) {
  const t = useT();
  const [consent, setConsent] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-4">
      <p className="flex items-center gap-2 font-semibold">
        <HandIcon className="size-4 shrink-0" />
        {format(t.tryon.requests.title, { count })}
      </p>
      <p className="text-sm leading-relaxed text-muted">{t.tryon.requests.text}</p>
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog
          title={t.tryon.share.enableTitle}
          description={t.tryon.share.enableText}
          confirmLabel={t.tryon.requests.useAvatar}
          confirmDisabled={!consent}
          onConfirm={async () => {
            const result = await shareAvatarForTryOnAction(consent);
            setConsent(false);
            if (result.ok) toast.success(result.message);
            else {
              toast.error(result.error);
              return false;
            }
          }}
          trigger={
            <Button size="sm">
              <GlobeIcon />
              {t.tryon.requests.useAvatar}
            </Button>
          }
        >
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <Checkbox className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {t.tryon.share.consent}
          </label>
        </ConfirmDialog>
        <Button size="sm" variant="secondary" onClick={onUpload}>
          <UserRoundIcon />
          {t.tryon.requests.uploadPhoto}
        </Button>
      </div>
    </div>
  );
}

function AddTile({
  aspect,
  label,
  icon: Icon,
  onClick,
}: {
  aspect: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-2 text-center text-sm font-medium text-muted transition-colors hover:border-foreground hover:text-foreground",
        aspect,
      )}
    >
      <span className="relative">
        <Icon className="size-6" />
        <PlusIcon className="absolute -right-2 -bottom-1 size-3.5 rounded-full bg-background" />
      </span>
      {label}
    </button>
  );
}

function ResultCard({ result, onDelete }: { result: TryOnResultView; onDelete: () => Promise<boolean | void> }) {
  const t = useT();
  const locale = useLocale();
  const ratio = result.width && result.height ? `${result.width}/${result.height}` : "3/4";

  return (
    <div className="group relative flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl bg-surface" style={{ aspectRatio: ratio }}>
        {result.status === "succeeded" && result.url ? (
          <a href={result.url} target="_blank" rel="noreferrer" aria-label={t.tryon.results.open} className="absolute inset-0 block">
            <SmartImage src={result.url} alt="" fill unoptimized sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
          </a>
        ) : result.status === "processing" ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted">
            <LoaderCircleIcon className="size-5 animate-spin" />
            {t.tryon.results.processing}
          </span>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-danger">
            <AlertTriangleIcon className="size-5" />
            {t.tryon.results.failed}
            {result.error && result.error in t.tryon.errors ? (
              <span className="text-xs text-muted">{t.tryon.errors[result.error as keyof typeof t.tryon.errors]}</span>
            ) : null}
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          {result.status === "succeeded" && result.url ? (
            <Button asChild variant="overlay" size="icon-sm">
              <a href={`${result.url}&download=frame-look-${result.id.slice(0, 8)}.webp`} aria-label={t.tryon.results.download}>
                <DownloadIcon />
              </a>
            </Button>
          ) : null}
          {result.status !== "processing" ? (
            <ConfirmDialog
              title={t.tryon.results.deleteTitle}
              description={t.tryon.results.deleteText}
              confirmLabel={t.common.delete}
              onConfirm={onDelete}
              trigger={
                <Button variant="overlay" size="icon-sm" aria-label={t.common.delete}>
                  <Trash2Icon />
                </Button>
              }
            />
          ) : null}
        </div>
      </div>
      <p className="line-clamp-2 px-0.5 text-xs text-muted">
        {formatRelative(locale, result.created_at)}
        {result.instructions ? ` · ${result.instructions}` : ""}
      </p>
    </div>
  );
}
