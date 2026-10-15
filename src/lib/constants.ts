import { Constants, type Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export type ProfileType = Enums["profile_type"];
export type ExperienceLevel = Enums["experience_level"];
export type AvailabilityStatus = Enums["availability_status"];
export type CollabFormat = Enums["collab_format"];
export type TeamRole = Enums["team_role"];
export type ProjectStatus = Enums["project_status"];
export type ApplicationStatus = Enums["application_status"];
export type ContactsVisibility = Enums["contacts_visibility"];
export type ReportReason = Enums["report_reason"];
export type ReportTarget = Enums["report_target"];
export type ReportStatus = Enums["report_status"];
export type AppRole = Enums["app_role"];
export type NotificationType = Enums["notification_type"];

const E = Constants.public.Enums;

export const PROFILE_TYPES = E.profile_type;
export const EXPERIENCE_LEVELS = E.experience_level;
export const AVAILABILITY_STATUSES = E.availability_status;
export const COLLAB_FORMATS = E.collab_format;
export const TEAM_ROLES = E.team_role;
export const PROJECT_STATUSES = E.project_status;
export const APPLICATION_STATUSES = E.application_status;
export const CONTACTS_VISIBILITY = E.contacts_visibility;
export const REPORT_REASONS = E.report_reason;
export const REPORT_TARGETS = E.report_target;
export const REPORT_STATUSES = E.report_status;
export const APP_ROLES = E.app_role;

export const SOCIAL_NETWORKS = ["instagram", "telegram", "vk", "behance", "website"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
