import { BookmarkIcon, HeartIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PhotoMasonry } from "@/components/media/photo-card";
import { ProfileCard } from "@/components/profile/profile-card";
import { LinkTabs } from "@/components/ui/tabs";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getCategoryLabels } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils";
import type { PortfolioCardData, ProfileCardData } from "@/types/views";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.favorites.title };
}

const ITEM_FIELDS = `id, title, category_slug, cover_image_url, cover_width, cover_height, images_count, likes_count, created_at,
  is_published, hidden_at, owner:profiles!portfolio_items_owner_id_fkey(id, username, display_name, avatar_url, profile_type)`;

type ItemRow = {
  id: string;
  title: string;
  category_slug: string | null;
  cover_image_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  images_count: number;
  likes_count: number;
  created_at: string;
  is_published: boolean;
  hidden_at: string | null;
  owner: { id: string; username: string; display_name: string; avatar_url: string | null; profile_type: ProfileCardData["profile_type"] } | null;
};

function toCard(item: ItemRow, liked: boolean, saved: boolean): PortfolioCardData | null {
  if (!item.owner || !item.cover_image_url || !item.is_published || item.hidden_at) return null;
  return {
    id: item.id,
    title: item.title,
    category_slug: item.category_slug,
    cover_image_url: item.cover_image_url,
    cover_width: item.cover_width,
    cover_height: item.cover_height,
    images_count: item.images_count,
    likes_count: item.likes_count,
    created_at: item.created_at,
    owner_id: item.owner.id,
    owner_username: item.owner.username,
    owner_display_name: item.owner.display_name,
    owner_avatar_url: item.owner.avatar_url,
    owner_profile_type: item.owner.profile_type,
    liked,
    saved,
  };
}

export default async function FavoritesPage(props: PageProps<"/dashboard/favorites">) {
  const user = await requireUser("/dashboard/favorites");
  const { t, locale } = await getI18n();
  const tab = firstParam((await props.searchParams).tab);
  const active = tab === "people" || tab === "liked" ? tab : "works";
  const supabase = await createClient();
  const labels = await getCategoryLabels(locale);

  const [{ data: savedRows }, { data: likedRows }, { data: peopleRows }] = await Promise.all([
    supabase.from("favorites").select(`item:portfolio_items(${ITEM_FIELDS})`).eq("user_id", user.id).not("item_id", "is", null).order("created_at", { ascending: false }).limit(200),
    supabase.from("likes").select(`item:portfolio_items(${ITEM_FIELDS})`).eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    supabase
      .from("favorites")
      .select("profile:profiles!favorites_profile_id_fkey(*)")
      .eq("user_id", user.id)
      .not("profile_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const likedIds = new Set((likedRows ?? []).map((row) => (row.item as ItemRow | null)?.id));
  const savedIds = new Set((savedRows ?? []).map((row) => (row.item as ItemRow | null)?.id));
  const saved = (savedRows ?? []).map((row) => row.item && toCard(row.item as ItemRow, likedIds.has(row.item.id), true)).filter((v): v is PortfolioCardData => Boolean(v));
  const liked = (likedRows ?? []).map((row) => row.item && toCard(row.item as ItemRow, true, savedIds.has(row.item.id))).filter((v): v is PortfolioCardData => Boolean(v));
  const profiles = (peopleRows ?? []).flatMap((row) => (row.profile ? [row.profile] : []));
  const { data: works } = profiles.length
    ? await supabase
        .from("portfolio_items")
        .select("id, owner_id, cover_image_url, cover_width, cover_height")
        .in("owner_id", profiles.map((p) => p.id))
        .eq("is_published", true)
        .is("hidden_at", null)
        .order("created_at", { ascending: false })
        .limit(1000)
    : { data: [] };
  const people: ProfileCardData[] = profiles.map((profile) => {
    const own = (works ?? []).filter((w) => w.owner_id === profile.id && w.cover_image_url);
    return {
      ...profile,
      works_count: own.length,
      preview: own.slice(0, 3).map((w) => ({ id: w.id, url: w.cover_image_url!, width: w.cover_width, height: w.cover_height })),
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader size="md" title={t.favorites.title} subtitle={t.favorites.subtitle} />
      <LinkTabs
        items={[
          { href: "/dashboard/favorites", label: t.favorites.tabs.works, active: active === "works", count: saved.length },
          { href: "/dashboard/favorites?tab=people", label: t.favorites.tabs.people, active: active === "people", count: people.length },
          { href: "/dashboard/favorites?tab=liked", label: t.favorites.tabs.liked, active: active === "liked", count: liked.length },
        ]}
      />
      {active === "works" ? (
        saved.length > 0 ? (
          <PhotoMasonry items={saved} categoryLabels={labels} isAuthenticated />
        ) : (
          <EmptyState icon={BookmarkIcon} title={t.favorites.tabs.works} text={t.favorites.emptyWorks} />
        )
      ) : null}
      {active === "liked" ? (
        liked.length > 0 ? (
          <PhotoMasonry items={liked} categoryLabels={labels} isAuthenticated />
        ) : (
          <EmptyState icon={HeartIcon} title={t.favorites.tabs.liked} text={t.favorites.emptyLiked} />
        )
      ) : null}
      {active === "people" ? (
        people.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} categoryLabels={labels} t={t} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState icon={UsersIcon} title={t.favorites.tabs.people} text={t.favorites.emptyPeople} />
        )
      ) : null}
    </div>
  );
}
