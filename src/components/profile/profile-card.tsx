import { MapPinIcon } from "lucide-react";
import Link from "next/link";
import { SmartImage } from "@/components/media/smart-image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { format, plural } from "@/i18n/format";
import type { ProfileCardData } from "@/types/views";

/** Карточка участника для каталогов и главной страницы. */
export function ProfileCard({
  profile,
  categoryLabels,
  t,
  locale,
}: {
  profile: ProfileCardData;
  categoryLabels: Record<string, string>;
  t: Dictionary;
  locale: Locale;
}) {
  const previews = profile.preview.slice(0, 3);
  const specs = profile.specializations.map((slug) => categoryLabels[slug]).filter(Boolean);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-background transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-pop">
      <div className="grid aspect-[3/2] grid-cols-3 gap-0.5 bg-surface">
        {previews.length > 0
          ? [0, 1, 2].map((index) => {
              const image = previews[index];
              return (
                <div key={index} className="relative overflow-hidden bg-surface-strong/60">
                  {image ? (
                    <SmartImage
                      src={image.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 12vw, 30vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : null}
                </div>
              );
            })
          : (
            <div className="col-span-3 bg-gradient-to-br from-surface to-surface-strong" />
          )}
      </div>

      <div className="relative flex flex-1 flex-col px-5 pb-5">
        <Avatar
          src={profile.avatar_url}
          name={profile.display_name}
          size="lg"
          className="-mt-7 ring-4 ring-background"
        />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[17px] font-semibold">
              <Link href={`/users/${profile.username}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {profile.display_name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              {profile.city ? (
                <>
                  <MapPinIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{profile.city}</span>
                  <span aria-hidden>·</span>
                </>
              ) : null}
              <span className="truncate">{t.enums.profileType[profile.profile_type]}</span>
            </p>
          </div>
          {profile.availability === "available" ? (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-success" title={t.enums.availability.available} />
          ) : null}
        </div>

        {specs.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specs.slice(0, 3).map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
          </div>
        ) : null}

        {profile.bio ? <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{profile.bio}</p> : null}

        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span className="text-subtle">
            {profile.works_count > 0
              ? format(plural(locale, profile.works_count, t.catalog.works), { count: profile.works_count })
              : t.profile.noWorks}
          </span>
          <span className="font-medium transition-transform group-hover:translate-x-0.5">{t.catalog.openProfile} →</span>
        </div>
      </div>
    </article>
  );
}
