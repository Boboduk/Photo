import type { Dictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/format";
import type { Tables } from "@/types/database";

export type NotificationRow = Pick<Tables<"notifications">, "id" | "type" | "data" | "read_at" | "created_at"> & {
  actor: { username: string; display_name: string; avatar_url: string | null } | null;
};

type Data = {
  conversation_id?: string;
  preview?: string;
  actor_name?: string;
  project_id?: string;
  project_title?: string;
  item_id?: string;
  item_title?: string;
  status?: string;
  count?: number;
};

export function notificationText(t: Dictionary, n: NotificationRow): string {
  const data = (n.data ?? {}) as Data;
  const actor = n.actor?.display_name ?? data.actor_name ?? t.notifications.someone;
  const count = Number(data.count ?? 1);
  switch (n.type) {
    case "message":
      return count > 1
        ? format(t.notifications.messageMany, { actor, count })
        : format(t.notifications.message, { actor });
    case "application":
      return format(t.notifications.application, { actor, project: data.project_title ?? "" });
    case "application_status":
      return format(data.status === "accepted" ? t.notifications.applicationAccepted : t.notifications.applicationDeclined, {
        actor,
        project: data.project_title ?? "",
      });
    case "project_status":
      return format(t.notifications.projectStatus, {
        project: data.project_title ?? "",
        status: (t.enums.projectStatus as Record<string, string>)[data.status ?? ""] ?? data.status ?? "",
      });
    case "like":
      return count > 1
        ? format(t.notifications.likeMany, { actor, others: count - 1, item: data.item_title ?? "" })
        : format(t.notifications.like, { actor, item: data.item_title ?? "" });
    case "mention":
      return format(t.notifications.mention, { actor, item: data.item_title ?? "" });
    case "tryon_request":
      return count > 1
        ? format(t.notifications.tryonRequestMany, { actor, others: count - 1 })
        : format(t.notifications.tryonRequest, { actor });
    default:
      return "";
  }
}

export function notificationPreview(n: NotificationRow): string | null {
  const data = (n.data ?? {}) as Data;
  return n.type === "message" ? (data.preview ?? null) : null;
}

export function notificationHref(n: NotificationRow): string {
  const data = (n.data ?? {}) as Data;
  switch (n.type) {
    case "message":
      return data.conversation_id ? `/dashboard/messages/${data.conversation_id}` : "/dashboard/messages";
    case "application":
      return data.project_id ? `/dashboard/projects/${data.project_id}` : "/dashboard/projects";
    case "application_status":
    case "project_status":
      return data.project_id ? `/projects/${data.project_id}` : "/dashboard/applications";
    case "like":
    case "mention":
      return data.item_id ? `/portfolio/${data.item_id}` : "/dashboard/portfolio";
    case "tryon_request":
      return "/dashboard/tryon?requests=1";
    default:
      return "/dashboard/notifications";
  }
}
