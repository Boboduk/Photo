import { CalendarIcon, EyeOffIcon, MapPinIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/common/copy-link-button";
import { ReportDialog } from "@/components/common/report-dialog";
import { LikeButton } from "@/components/media/like-button";
import { SaveButton } from "@/components/media/save-button";
import { PortfolioResults } from "@/components/portfolio/portfolio-results";
import { RemoveCreditButton } from "@/components/portfolio/remove-credit-button";
import { WorkGallery } from "@/components/portfolio/work-gallery";
import { StartChatButton } from "@/components/profile/start-chat-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDate, formatDay, plural } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryLabels } from "@/lib/categories";
import { getPortfolioItem, getViewerItemState } from "@/lib/queries/portfolio";
import { searchPortfolio } from "@/lib/queries/search";

export async function generateMetadata(props: PageProps<"/portfolio/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const item = await getPortfolioItem(id);
  if (!item) return {};
  return {
    title: `${item.title} — ${item.owner?.display_name ?? ""}`,
    description: item.description?.slice(0, 160) ?? undefined,
    openGraph: item.cover_image_url ? { images: [{ url: item.cover_image_url }] } : undefined,
  };
}

export default async function PortfolioItemPage(props: PageProps<"/portfolio/[id]">) {
  const { id } = await props.params;
  const { t, locale } = await getI18n();
  const [item, user, labels] = await Promise.all([getPortfolioItem(id), getCurrentUser(), getCategoryLabels(locale)]);
  if (!item || !item.owner) notFound();

  const owner = item.owner;
  const isOwner = user?.id === item.owner_id;
  const [viewer, more] = await Promise.all([
    getViewerItemState(item.id, user?.id),
    searchPortfolio({ owner: owner.id, sort: "newest" }, 0, 9),
  ]);
  const moreItems = { ...more, items: more.items.filter((other) => other.id !== item.id).slice(0, 8), nextOffset: null };
  const myCredit = user ? item.credits.find((credit) => credit.profile?.id === user.id) : undefined;

  return (
    <div className="container-page pt-8 sm:pt-12">
      {isOwner && (!item.is_published || item.hidden_at) ? (
        <div className="mb-6 flex items-center gap-2.5 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          <EyeOffIcon className="size-4 shrink-0" />
          {item.hidden_at ? t.portfolio.hiddenNotice : t.portfolio.draftNotice}
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <WorkGallery
          title={item.title}
          images={item.images.map((image) => ({
            id: image.id,
            url: image.url,
            width: image.width,
            height: image.height,
            alt: image.alt,
          }))}
        />

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Link href={`/users/${owner.username}`} className="group flex items-center gap-3">
            <Avatar src={owner.avatar_url} name={owner.display_name} size="lg" />
            <span className="min-w-0">
              <span className="block truncate font-semibold group-hover:underline">{owner.display_name}</span>
              <span className="flex items-center gap-1 text-sm text-muted">
                {t.enums.profileType[owner.profile_type]}
                {owner.city ? (
                  <>
                    <span aria-hidden>·</span>
                    <MapPinIcon className="size-3.5" />
                    {owner.city}
                  </>
                ) : null}
              </span>
            </span>
          </Link>

          {!isOwner ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <StartChatButton userId={owner.id} isAuthenticated={Boolean(user)} label={t.portfolio.writeToAuthor} />
              <Button asChild variant="outline">
                <Link href={`/users/${owner.username}`}>{t.portfolio.openAuthor}</Link>
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href={`/dashboard/portfolio/${item.id}/edit`}>
                <PencilIcon />
                {t.common.edit}
              </Link>
            </Button>
          )}

          <div className="mt-8 border-t border-line pt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{item.title}</h1>
            {item.description ? (
              <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{item.description}</p>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <LikeButton
                itemId={item.id}
                liked={viewer.liked}
                count={item.likes_count}
                isAuthenticated={Boolean(user)}
                variant="plain"
              />
              <SaveButton itemId={item.id} saved={viewer.saved} isAuthenticated={Boolean(user)} variant="plain" withLabel />
            </div>
            <p className="sr-only">
              {format(plural(locale, item.likes_count, t.portfolio.likes), { count: item.likes_count })}
            </p>

            <dl className="mt-8 grid gap-4 text-sm">
              {item.category_slug && labels[item.category_slug] ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t.portfolio.category}</dt>
                  <dd>
                    <Link href={`/portfolio?category=${item.category_slug}`} className="font-medium hover:underline">
                      {labels[item.category_slug]}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {item.shot_on ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t.portfolio.shotOn}</dt>
                  <dd className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5 text-muted" />
                    {formatDay(locale, item.shot_on)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t.portfolio.published}</dt>
                <dd>{formatDate(locale, item.created_at)}</dd>
              </div>
            </dl>

            {item.credits.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-sm font-semibold">{t.portfolio.credits}</h2>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {item.credits.map((credit) => (
                    <li key={credit.id} className="flex items-center justify-between gap-3 text-sm">
                      {credit.profile ? (
                        <Link href={`/users/${credit.profile.username}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                          <Avatar src={credit.profile.avatar_url} name={credit.profile.display_name} size="sm" />
                          <span className="truncate font-medium">{credit.profile.display_name}</span>
                        </Link>
                      ) : (
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={credit.name ?? "?"} size="sm" />
                          <span className="truncate font-medium">{credit.name}</span>
                        </span>
                      )}
                      <span className="shrink-0 text-muted">{t.enums.teamRole[credit.role]}</span>
                    </li>
                  ))}
                </ul>
                {myCredit && !isOwner ? <RemoveCreditButton creditId={myCredit.id} /> : null}
              </div>
            ) : null}

            {item.tags.length > 0 ? (
              <div className="mt-8">
                <h2 className="sr-only">{t.portfolio.tags}</h2>
                <ul className="flex flex-wrap gap-1.5">
                  {item.tags.map(({ tag }) => (
                    <li key={tag}>
                      <Link href={`/portfolio?tag=${encodeURIComponent(tag)}`}>
                        <Badge size="md" className="hover:bg-surface-strong">
                          #{tag}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-1 border-t border-line pt-5">
              <CopyLinkButton />
              {!isOwner ? (
                <ReportDialog targetType="portfolio_item" targetId={item.id} isAuthenticated={Boolean(user)} />
              ) : null}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-subtle">{t.portfolio.copyrightNote}</p>
          </div>
        </aside>
      </div>

      {moreItems.items.length > 0 ? (
        <section className="mt-20" aria-labelledby="more-title">
          <h2 id="more-title" className="mb-6 text-xl font-semibold">
            {t.portfolio.moreFromAuthor}
          </h2>
          <PortfolioResults
            query=""
            owner={owner.id}
            initial={moreItems}
            categoryLabels={labels}
            isAuthenticated={Boolean(user)}
            showAuthor={false}
          />
        </section>
      ) : null}
    </div>
  );
}
