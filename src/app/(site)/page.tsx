import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PhotoMasonry } from "@/components/media/photo-card";
import { SmartImage } from "@/components/media/smart-image";
import { ProfileCard } from "@/components/profile/profile-card";
import { ProjectCard } from "@/components/projects/project-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { heroFallbackImages } from "@/config/hero";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { getCategories, getCategoryLabels } from "@/lib/categories";
import { searchPortfolio, searchProfiles, searchProjects } from "@/lib/queries/search";
import { createClient } from "@/lib/supabase/server";

async function getStats() {
  const supabase = await createClient();
  const [members, works, projects] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("portfolio_items")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .is("hidden_at", null),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "open").is("hidden_at", null),
  ]);
  return { members: members.count ?? 0, works: works.count ?? 0, projects: projects.count ?? 0 };
}

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const [user, labels, categories, works, popular, members, projects, stats] = await Promise.all([
    getCurrentUser(),
    getCategoryLabels(locale),
    getCategories(),
    searchPortfolio({ sort: "newest" }, 0, 12),
    searchPortfolio({ sort: "popular" }, 0, 3),
    searchProfiles({ types: [], specializations: [], experience: [], availability: [], formats: [], tags: [], sort: "active" }, 0, 8),
    searchProjects({ statuses: ["open"], sort: "newest" }, 0, 6),
    getStats(),
  ]);

  const heroImages =
    popular.items.length >= 3
      ? popular.items.map((item) => ({
          url: item.cover_image_url,
          width: item.cover_width ?? 1200,
          height: item.cover_height ?? 1500,
          alt: item.title,
          author: item.owner_display_name,
          avatar: item.owner_avatar_url,
          href: `/portfolio/${item.id}`,
        }))
      : heroFallbackImages.map((image) => ({ ...image, author: null, avatar: null, href: null }));

  const workCategories = categories.filter((category) => category.for_works).slice(0, 8);
  const membersWithWorks = members.items.filter((member) => member.works_count > 0).slice(0, 4);
  const shownMembers = membersWithWorks.length >= 4 ? membersWithWorks : members.items.slice(0, 4);

  return (
    <>
      {/* Главный экран */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-12 pt-10 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              {t.home.eyebrow}
            </p>
            <h1 className="mt-6 text-[44px] leading-[1.02] font-semibold tracking-[-0.03em] text-balance sm:text-6xl lg:text-[72px]">
              {t.home.heroTitleLine1}
              <br />
              <span className="font-serif font-normal tracking-[-0.02em] italic">{t.home.heroTitleLine2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t.home.heroSubtitle}</p>
            <div className="mt-9 flex flex-wrap gap-2.5">
              <Button asChild size="lg">
                <Link href="/models">{t.home.findModel}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/photographers">{t.home.findPhotographer}</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="group">
                <Link href={user ? "/dashboard/portfolio/new" : "/register"}>
                  {t.home.createPortfolio}
                  <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
            <dl className="mt-12 flex gap-10 border-t border-line pt-6">
              {[
                { value: stats.members, label: t.home.statsMembers },
                { value: stats.works, label: t.home.statsWorks },
                { value: stats.projects, label: t.home.statsProjects },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">{stat.value.toLocaleString("ru-RU")}</dd>
                  <dt className="mt-1 text-sm text-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative grid h-[440px] grid-cols-3 gap-3 sm:h-[540px] lg:h-[600px]" aria-hidden={false}>
            {heroImages.slice(0, 3).map((image, index) => {
              const offsets = ["mt-10", "mt-0", "mt-20"];
              const content = (
                <>
                  <SmartImage
                    src={image.url}
                    alt={image.alt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 16vw, 33vw"
                    className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                  />
                  {image.author ? (
                    <span className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-full bg-white/90 py-1 pr-3 pl-1 text-xs font-medium backdrop-blur">
                      <Avatar src={image.avatar} name={image.author} size="xs" />
                      <span className="truncate">{image.author}</span>
                    </span>
                  ) : null}
                </>
              );
              return (
                <div
                  key={image.url}
                  className={`group relative ${offsets[index]} h-[calc(100%-5rem)] overflow-hidden rounded-xl bg-surface animate-rise`}
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                >
                  {image.href ? (
                    <Link href={image.href} className="absolute inset-0" aria-label={image.alt}>
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Свежие работы */}
      <section className="container-page" aria-labelledby="gallery-title">
        <SectionHeading
          id="gallery-title"
          title={t.home.galleryTitle}
          subtitle={t.home.gallerySubtitle}
          href="/portfolio"
          linkLabel={t.home.galleryAll}
        />
        <div className="scrollbar-none -mx-1 mb-6 flex gap-2 overflow-x-auto px-1">
          {workCategories.map((category) => (
            <Link
              key={category.slug}
              href={`/portfolio?category=${category.slug}`}
              className="inline-flex h-9 shrink-0 items-center rounded-full border border-line px-4 text-sm font-medium transition-colors hover:border-foreground"
            >
              {labels[category.slug]}
            </Link>
          ))}
        </div>
        {works.items.length > 0 ? (
          <PhotoMasonry items={works.items} categoryLabels={labels} isAuthenticated={Boolean(user)} />
        ) : (
          <EmptyState title={t.home.galleryTitle} text={t.home.emptyGallery} />
        )}
      </section>

      {/* Популярные участники */}
      <section className="container-page mt-24" aria-labelledby="members-title">
        <SectionHeading
          id="members-title"
          title={t.home.membersTitle}
          subtitle={t.home.membersSubtitle}
          href="/models"
          linkLabel={t.nav.models}
          secondaryHref="/photographers"
          secondaryLabel={t.nav.photographers}
        />
        {shownMembers.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shownMembers.map((member) => (
              <ProfileCard key={member.id} profile={member} categoryLabels={labels} t={t} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState title={t.home.membersTitle} text={t.home.emptyMembers} />
        )}
      </section>

      {/* Новые проекты */}
      <section className="container-page mt-24" aria-labelledby="projects-title">
        <SectionHeading
          id="projects-title"
          title={t.home.projectsTitle}
          subtitle={t.home.projectsSubtitle}
          href="/projects"
          linkLabel={t.home.projectsAll}
        />
        {projects.items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.items.map((project) => (
              <ProjectCard key={project.id} project={project} categoryLabels={labels} t={t} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t.home.projectsTitle}
            text={t.home.emptyProjects}
            action={
              <Button asChild>
                <Link href="/dashboard/projects/new">{t.projects.create}</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Как это работает */}
      <section className="container-page mt-24" aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.home.howTitle}
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {t.home.howSteps.map((step, index) => (
            <li key={step.title} className="rounded-xl bg-surface p-6 sm:p-7">
              <span className="font-serif text-3xl text-brand italic">0{index + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {!user ? (
        <section className="container-page mt-24">
          <div className="relative overflow-hidden rounded-2xl bg-foreground px-6 py-14 text-background sm:px-12 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t.home.ctaTitle}</h2>
              <p className="mt-4 text-lg text-background/70">{t.home.ctaText}</p>
              <Button asChild size="lg" variant="brand" className="mt-8">
                <Link href="/register">{t.home.ctaButton}</Link>
              </Button>
            </div>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-16 -bottom-24 size-80 rounded-full border-[28px] border-background/5"
            />
          </div>
        </section>
      ) : null}
    </>
  );
}

function SectionHeading({
  id,
  title,
  subtitle,
  href,
  linkLabel,
  secondaryHref,
  secondaryLabel,
}: {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  linkLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
      </div>
      <div className="flex gap-4">
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="group inline-flex items-center gap-1 text-sm font-medium hover:underline">
            {secondaryLabel}
            <ArrowUpRightIcon className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ) : null}
        <Link href={href} className="group inline-flex items-center gap-1 text-sm font-medium hover:underline">
          {linkLabel}
          <ArrowUpRightIcon className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
