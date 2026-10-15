import "server-only";

import { PAGE_SIZE } from "@/config/site";
import {
  AVAILABILITY_STATUSES,
  COLLAB_FORMATS,
  EXPERIENCE_LEVELS,
  PROFILE_TYPES,
  PROJECT_STATUSES,
  TEAM_ROLES,
  isOneOf,
  type AvailabilityStatus,
  type CollabFormat,
  type ExperienceLevel,
  type ProfileType,
  type ProjectStatus,
  type TeamRole,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { firstParam, listParam } from "@/lib/utils";
import type { Paged, PortfolioCardData, ProfileCardData, ProjectCardData } from "@/types/views";

type SearchParams = Record<string, string | string[] | undefined>;

function paged<T extends { total_count?: number }>(rows: T[] | null, offset: number, limit: number): Paged<Omit<T, "total_count">> {
  const items = (rows ?? []).map(({ total_count: _total, ...rest }) => rest);
  const total = Number(rows?.[0]?.total_count ?? 0);
  const nextOffset = offset + items.length < total && items.length === limit ? offset + limit : null;
  return { items, total, nextOffset };
}

const cleanText = (value: string | undefined, max = 100) => value?.trim().slice(0, max) || undefined;

// --- Участники ------------------------------------------------------------------

export type ProfileFilters = {
  kind?: "photographer" | "model";
  q?: string;
  city?: string;
  types: ProfileType[];
  specializations: string[];
  category?: string;
  experience: ExperienceLevel[];
  availability: AvailabilityStatus[];
  formats: CollabFormat[];
  tags: string[];
  sort: "relevance" | "newest" | "active";
};

export function parseProfileFilters(kind: ProfileFilters["kind"], params: SearchParams): ProfileFilters {
  const sort = firstParam(params.sort);
  return {
    kind,
    q: cleanText(firstParam(params.q)),
    city: cleanText(firstParam(params.city), 80),
    types: listParam(params.type).filter((v) => isOneOf(PROFILE_TYPES, v)) as ProfileType[],
    specializations: listParam(params.spec).slice(0, 12),
    category: cleanText(firstParam(params.category), 40),
    experience: listParam(params.exp).filter((v) => isOneOf(EXPERIENCE_LEVELS, v)) as ExperienceLevel[],
    availability: listParam(params.avail).filter((v) => isOneOf(AVAILABILITY_STATUSES, v)) as AvailabilityStatus[],
    formats: listParam(params.format).filter((v) => isOneOf(COLLAB_FORMATS, v)) as CollabFormat[],
    tags: listParam(params.tags)
      .map((tag) => tag.toLowerCase().replace(/^#/, "").slice(0, 32))
      .filter(Boolean)
      .slice(0, 10),
    sort: sort === "newest" || sort === "active" ? sort : "relevance",
  };
}

export async function searchProfiles(filters: ProfileFilters, offset = 0, limit = PAGE_SIZE): Promise<Paged<ProfileCardData>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_profiles", {
    p_kind: filters.kind,
    p_query: filters.q,
    p_city: filters.city,
    p_types: filters.types.length ? filters.types : undefined,
    p_specializations: filters.specializations.length ? filters.specializations : undefined,
    p_category: filters.category,
    p_experience: filters.experience.length ? filters.experience : undefined,
    p_availability: filters.availability.length ? filters.availability : undefined,
    p_formats: filters.formats.length ? filters.formats : undefined,
    p_tags: filters.tags.length ? filters.tags : undefined,
    p_sort: filters.sort,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return paged(data as unknown as (ProfileCardData & { total_count: number })[], offset, limit);
}

// --- Работы ---------------------------------------------------------------------

export type PortfolioFilters = {
  q?: string;
  category?: string;
  tag?: string;
  owner?: string;
  sort: "newest" | "popular";
};

export function parsePortfolioFilters(params: SearchParams): PortfolioFilters {
  return {
    q: cleanText(firstParam(params.q)),
    category: cleanText(firstParam(params.category), 40),
    tag: cleanText(firstParam(params.tag), 32),
    sort: firstParam(params.sort) === "popular" ? "popular" : "newest",
  };
}

export async function searchPortfolio(filters: PortfolioFilters, offset = 0, limit = PAGE_SIZE): Promise<Paged<PortfolioCardData>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_portfolio", {
    p_query: filters.q,
    p_category: filters.category,
    p_tag: filters.tag,
    p_owner: filters.owner,
    p_sort: filters.sort,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return paged(data as unknown as (PortfolioCardData & { total_count: number })[], offset, limit);
}

// --- Проекты --------------------------------------------------------------------

export type ProjectFilters = {
  q?: string;
  city?: string;
  category?: string;
  format?: CollabFormat;
  role?: TeamRole;
  statuses: ProjectStatus[];
  author?: string;
  sort: "newest" | "soon";
};

export function parseProjectFilters(params: SearchParams): ProjectFilters {
  const format = firstParam(params.format);
  const role = firstParam(params.role);
  const status = firstParam(params.status);
  return {
    q: cleanText(firstParam(params.q)),
    city: cleanText(firstParam(params.city), 80),
    category: cleanText(firstParam(params.category), 40),
    format: isOneOf(COLLAB_FORMATS, format) ? format : undefined,
    role: isOneOf(TEAM_ROLES, role) ? role : undefined,
    statuses: status === "all" ? [...PROJECT_STATUSES] : ["open"],
    sort: firstParam(params.sort) === "soon" ? "soon" : "newest",
  };
}

export async function searchProjects(filters: ProjectFilters, offset = 0, limit = PAGE_SIZE): Promise<Paged<ProjectCardData>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_projects", {
    p_query: filters.q,
    p_city: filters.city,
    p_category: filters.category,
    p_format: filters.format,
    p_looking_for: filters.role,
    p_statuses: filters.statuses,
    p_author: filters.author,
    p_sort: filters.sort,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return paged(data as unknown as (ProjectCardData & { total_count: number })[], offset, limit);
}
