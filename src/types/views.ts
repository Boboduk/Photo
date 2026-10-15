import type {
  AvailabilityStatus,
  CollabFormat,
  ExperienceLevel,
  ProfileType,
  ProjectStatus,
  TeamRole,
} from "@/lib/constants";

/** Карточка работы в ленте. */
export type PortfolioCardData = {
  id: string;
  title: string;
  category_slug: string | null;
  cover_image_url: string;
  cover_width: number | null;
  cover_height: number | null;
  images_count: number;
  likes_count: number;
  created_at: string;
  owner_id: string;
  owner_username: string;
  owner_display_name: string;
  owner_avatar_url: string | null;
  owner_profile_type: ProfileType;
  liked: boolean;
  saved: boolean;
};

export type PreviewImage = { id: string; url: string; width: number | null; height: number | null };

/** Карточка участника в каталоге. */
export type ProfileCardData = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  bio: string | null;
  profile_type: ProfileType;
  specializations: string[];
  experience: ExperienceLevel | null;
  availability: AvailabilityStatus;
  collab_formats: CollabFormat[];
  created_at: string;
  last_active_at: string;
  works_count: number;
  preview: PreviewImage[];
};

/** Карточка проекта. */
export type ProjectCardData = {
  id: string;
  title: string;
  description: string;
  city: string | null;
  location: string | null;
  shoot_date: string | null;
  category_slug: string | null;
  looking_for: TeamRole[];
  collab_format: CollabFormat;
  spots: number;
  cover_url: string | null;
  status: ProjectStatus;
  applications_count: number;
  created_at: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
};

export type Paged<T> = { items: T[]; total: number; nextOffset: number | null };
