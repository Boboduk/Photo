import { AtSignIcon, GlobeIcon, ImagesIcon, MailIcon, MapPinIcon, PencilIcon, PhoneIcon, SendIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/empty-state";
import { SmartImage } from "@/components/media/smart-image";
import { PortfolioResults } from "@/components/portfolio/portfolio-results";
import { ProfileActions } from "@/components/profile/profile-actions";
import { StartChatButton } from "@/components/profile/start-chat-button";
import { ProjectResults } from "@/components/projects/project-results";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/tabs";
import { format, formatDate, plural } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryLabels } from "@/lib/categories";
import { PROJECT_STATUSES, SOCIAL_NETWORKS } from "@/lib/constants";
import { getCreditedWorks, getProfileByUsername, getProfileDetails, getViewerProfileState } from "@/lib/queries/profiles";
import { searchPortfolio, searchProjects } from "@/lib/queries/search";
import { socialLabel, socialUrl } from "@/lib/social";
import { firstParam } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/users/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const profile = await getProfileByUsername(username);
  if (!profile) return {};
  return {
    title: profile.display_name,
    description: profile.bio?.slice(0, 160) ?? undefined,
    openGraph: profile.avatar_url ? { images: [{ url: profile.avatar_url }] } : undefined,
  };
}

export default async function ProfilePage(props: PageProps<"/users/[username]">) {
  const { username } = await props.params;
  const searchParams = await props.searchParams;
  const { t, locale } = await getI18n();
  const [profile, user, labels] = await Promise.all([getProfileByUsername(username), getCurrentUser(), getCategoryLabels(locale)]);
  if (!profile) notFound();

  const isOwn = user?.id === profile.id;
  const tab = firstParam(searchParams.tab);
  const activeTab = tab === "projects" || tab === "credited" ? tab : "works";

  const [details, viewer, works, projects, credited] = await Promise.all([
    getProfileDetails(profile.id),
    getViewerProfileState(profile.id, user?.id),
    searchPortfolio({ owner: profile.id, sort: "newest" }),
    searchProjects({ author: profile.id, statuses: [...PROJECT_STATUSES], sort: "newest" }),
    getCreditedWorks(profile.id),
  ]);

  const socials = SOCIAL_NETWORKS.flatMap((network) => {
    const raw = (profile.social_links as Record<string, string> | null)?.[network];
    const href = socialUrl(network, raw);
    return href && raw ? [{ network, href, label: socialLabel(network, raw) }] : [];
  });
  const specLabel =
    profile.profile_type === "model" ? t.profile.directions : t.profile.specializations;

  const paramRows = details.params
    ? ([
        ["height_cm", t.profile.height, details.params.height_cm ? format(t.profile.heightValue, { value: details.params.height_cm }) : null],
        ["clothing_size", t.profile.clothingSize, details.params.clothing_size],
        ["shoe_size", t.profile.shoeSize, details.params.shoe_size],
        ["hair_color", t.profile.hairColor, details.params.hair_color],
        ["eye_color", t.profile.eyeColor, details.params.eye_color],
      ] as const).filter(([, , value]) => value)
    : [];

  return (
    <div>
      {/* Обложка */}
      <div className="relative h-44 bg-gradient-to-br from-surface via-surface-strong to-surface sm:h-64 lg:h-72">
        {profile.cover_url ? (
          <SmartImage src={profile.cover_url} alt="" fill priority sizes="100vw" className="object-cover" />
        ) : works.items[0] ? (
          <SmartImage src={works.items[0].cover_image_url} alt="" fill priority sizes="100vw" className="object-cover opacity-90 blur-[2px]" />
        ) : null}
      </div>

      <div className="container-page">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="2xl"
              className="-mt-16 ring-[5px] ring-background"
            />
            <div className="sm:pt-5">
              <h1 className="text-3xl font-semibold tracking-tight">{profile.display_name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted">
                <span>@{profile.username}</span>
                <span aria-hidden>·</span>
                <span>{t.enums.profileType[profile.profile_type]}</span>
                {profile.city ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-4" />
                      {profile.city}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:pt-5">
            {isOwn ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/profile">
                  <PencilIcon />
                  {t.profile.editProfile}
                </Link>
              </Button>
            ) : (
              <>
                {!viewer.blocked ? <StartChatButton userId={profile.id} isAuthenticated={Boolean(user)} /> : null}
                <ProfileActions
                  profileId={profile.id}
                  isAuthenticated={Boolean(user)}
                  favorite={viewer.favorite}
                  blocked={viewer.blocked}
                />
              </>
            )}
          </div>
        </div>

        {profile.banned_at ? (
          <p className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{t.profile.bannedNotice}</p>
        ) : null}
        {viewer.blocked ? (
          <p className="mt-6 rounded-lg bg-surface px-4 py-3 text-sm text-muted">{t.profile.youBlocked}</p>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
          {/* О пользователе */}
          <aside className="flex flex-col gap-8 text-[15px]">
            {profile.bio ? (
              <section>
                <h2 className="text-sm font-semibold">{t.profile.about}</h2>
                <p className="mt-2 leading-relaxed whitespace-pre-line text-foreground/85">{profile.bio}</p>
              </section>
            ) : null}

            <dl className="grid gap-4">
              <div>
                <dt className="text-sm text-muted">{t.profile.availability}</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium">
                  <span
                    className={
                      "size-2 rounded-full " +
                      (profile.availability === "available"
                        ? "bg-success"
                        : profile.availability === "limited"
                          ? "bg-warning"
                          : "bg-subtle")
                    }
                  />
                  {t.enums.availability[profile.availability]}
                </dd>
              </div>
              {profile.experience ? (
                <div>
                  <dt className="text-sm text-muted">{t.profile.experience}</dt>
                  <dd className="mt-1 font-medium">{t.enums.experience[profile.experience]}</dd>
                </div>
              ) : null}
              {details.age ? (
                <div>
                  <dt className="text-sm text-muted">{t.profile.age}</dt>
                  <dd className="mt-1 font-medium">{format(plural(locale, details.age, t.profile.ageValue), { count: details.age })}</dd>
                </div>
              ) : null}
              {profile.specializations.length > 0 ? (
                <div>
                  <dt className="text-sm text-muted">{specLabel}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {profile.specializations.map((slug) => (labels[slug] ? <Badge key={slug}>{labels[slug]}</Badge> : null))}
                  </dd>
                </div>
              ) : null}
              {profile.collab_formats.length > 0 ? (
                <div>
                  <dt className="text-sm text-muted">{t.profile.formats}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {profile.collab_formats.map((formatValue) => (
                      <Badge key={formatValue} variant="outline" title={t.enums.collabFormatHint[formatValue]}>
                        {t.enums.collabFormat[formatValue]}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            {paramRows.length > 0 ? (
              <section>
                <h2 className="text-sm font-semibold">{t.profile.params}</h2>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {paramRows.map(([key, label, value]) => (
                    <div key={key}>
                      <dt className="text-muted">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {details.contacts && Object.keys(details.contacts).length > 0 && !isOwn ? (
              <section>
                <h2 className="text-sm font-semibold">{t.profile.contacts}</h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {details.contacts.email ? (
                    <li className="flex items-center gap-2">
                      <MailIcon className="size-4 text-muted" />
                      <a href={`mailto:${details.contacts.email}`} className="hover:underline">
                        {details.contacts.email}
                      </a>
                    </li>
                  ) : null}
                  {details.contacts.phone ? (
                    <li className="flex items-center gap-2">
                      <PhoneIcon className="size-4 text-muted" />
                      <a href={`tel:${details.contacts.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                        {details.contacts.phone}
                      </a>
                    </li>
                  ) : null}
                  {details.contacts.telegram ? (
                    <li className="flex items-center gap-2">
                      <SendIcon className="size-4 text-muted" />
                      {socialUrl("telegram", details.contacts.telegram) ? (
                        <a
                          href={socialUrl("telegram", details.contacts.telegram)!}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="hover:underline"
                        >
                          {socialLabel("telegram", details.contacts.telegram)}
                        </a>
                      ) : (
                        <span>{details.contacts.telegram}</span>
                      )}
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}

            {socials.length > 0 ? (
              <section>
                <h2 className="text-sm font-semibold">{t.profile.social}</h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {socials.map((social) => (
                    <li key={social.network} className="flex items-center gap-2">
                      {social.network === "website" ? (
                        <GlobeIcon className="size-4 text-muted" />
                      ) : (
                        <AtSignIcon className="size-4 text-muted" />
                      )}
                      <span className="text-muted">{t.profile.socialLabels[social.network]}:</span>
                      <a href={social.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="truncate hover:underline">
                        {social.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="text-sm text-subtle">
              {format(t.profile.memberSince, { date: formatDate(locale, profile.created_at, { month: "long", year: "numeric" }) })}
            </p>
          </aside>

          {/* Работы и проекты */}
          <div className="min-w-0">
            <LinkTabs
              className="mb-6"
              items={[
                { href: `/users/${profile.username}`, label: t.profile.works, active: activeTab === "works", count: works.total },
                {
                  href: `/users/${profile.username}?tab=projects`,
                  label: t.profile.projects,
                  active: activeTab === "projects",
                  count: projects.total,
                },
                {
                  href: `/users/${profile.username}?tab=credited`,
                  label: t.profile.credited,
                  active: activeTab === "credited",
                  count: credited.length,
                },
              ]}
            />

            {activeTab === "works" ? (
              works.items.length > 0 ? (
                <PortfolioResults
                  query=""
                  owner={profile.id}
                  initial={works}
                  categoryLabels={labels}
                  isAuthenticated={Boolean(user)}
                  showAuthor={false}
                />
              ) : (
                <EmptyState
                  icon={ImagesIcon}
                  title={t.profile.noWorks}
                  action={
                    isOwn ? (
                      <Button asChild>
                        <Link href="/dashboard/portfolio/new">{t.dashboardPortfolio.newWork}</Link>
                      </Button>
                    ) : undefined
                  }
                />
              )
            ) : null}

            {activeTab === "projects" ? (
              projects.items.length > 0 ? (
                <ProjectResults query="status=all" author={profile.id} initial={projects} categoryLabels={labels} />
              ) : (
                <EmptyState title={t.profile.noProjects} />
              )
            ) : null}

            {activeTab === "credited" ? (
              credited.length > 0 ? (
                <div className="masonry">
                  {credited.map(({ item, role }) => (
                    <Link key={item.id} href={`/portfolio/${item.id}`} className="group block">
                      <div className="overflow-hidden rounded-lg bg-surface">
                        <SmartImage
                          src={item.cover_image_url!}
                          alt={item.title}
                          width={item.cover_width ?? 1200}
                          height={item.cover_height ?? 1500}
                          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 31vw, 48vw"
                          className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted">
                        {item.owner?.display_name} · {t.enums.teamRole[role]}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title={t.profile.credited} />
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
