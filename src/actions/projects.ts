"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { format } from "@/i18n/format";
import { getT } from "@/i18n/server";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { errorMessage, type ActionResult } from "@/lib/errors";
import { BUCKETS, isOwnStoragePath, publicStorageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { translateIssues } from "@/lib/validation/common";
import { applySchema, projectSchema, projectStatusSchema, type ProjectInput } from "@/lib/validation/project";

const id = z.uuid();

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateProjects(projectId?: string) {
  revalidatePath("/projects");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/applications");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
  }
}

function coverFields(userId: string, path: string | null | undefined) {
  if (!path) return { cover_path: null, cover_url: null };
  if (!isOwnStoragePath(userId, path)) return null;
  return { cover_path: path, cover_url: publicStorageUrl(BUCKETS.media, path) };
}

export async function createProjectAction(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  const t = await getT();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.generic, fieldErrors: translateIssues(t, parsed.error) };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { cover_path, ...fields } = parsed.data;
  const cover = coverFields(user.id, cover_path);
  if (!cover) return { ok: false, error: t.errors.forbidden };

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...fields, ...cover })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: errorMessage(t, error) };

  revalidateProjects(data.id);
  return { ok: true, data: { id: data.id }, message: t.dashboardProjects.created };
}

export async function updateProjectAction(projectId: string, input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  const t = await getT();
  if (!id.safeParse(projectId).success) return { ok: false, error: t.errors.not_found };
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.generic, fieldErrors: translateIssues(t, parsed.error) };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data: existing } = await supabase
    .from("projects")
    .select("author_id, cover_path")
    .eq("id", projectId)
    .maybeSingle();
  if (!existing || existing.author_id !== user.id) return { ok: false, error: t.errors.forbidden };

  const { cover_path, ...fields } = parsed.data;
  const cover = coverFields(user.id, cover_path);
  if (!cover) return { ok: false, error: t.errors.forbidden };

  const { error } = await supabase.from("projects").update({ ...fields, ...cover }).eq("id", projectId);
  if (error) return { ok: false, error: errorMessage(t, error) };

  if (existing.cover_path && existing.cover_path !== cover.cover_path) {
    await supabase.storage.from(BUCKETS.media).remove([existing.cover_path]);
  }

  revalidateProjects(projectId);
  return { ok: true, data: { id: projectId }, message: t.dashboardProjects.updated };
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  const t = await getT();
  if (!id.safeParse(projectId).success) return { ok: false, error: t.errors.not_found };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("author_id", user.id)
    .select("cover_path");
  if (error) return { ok: false, error: errorMessage(t, error) };
  if (!data?.length) return { ok: false, error: t.errors.not_found };
  if (data[0].cover_path) await supabase.storage.from(BUCKETS.media).remove([data[0].cover_path]);

  revalidateProjects(projectId);
  return { ok: true, message: t.dashboardProjects.deleted };
}

export async function setProjectStatusAction(projectId: string, status: string): Promise<ActionResult> {
  const t = await getT();
  const parsedStatus = projectStatusSchema.safeParse(status);
  if (!id.safeParse(projectId).success || !parsedStatus.success) return { ok: false, error: t.errors.invalid_status };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data, error } = await supabase
    .from("projects")
    .update({ status: parsedStatus.data })
    .eq("id", projectId)
    .eq("author_id", user.id)
    .select("id");
  if (error) return { ok: false, error: errorMessage(t, error) };
  if (!data?.length) return { ok: false, error: t.errors.forbidden };

  revalidateProjects(projectId);
  return { ok: true, message: t.dashboardProjects.statusUpdated };
}

/** Отклик: заявка + диалог с автором + первое сообщение (одна транзакция в БД). */
export async function applyToProjectAction(input: z.input<typeof applySchema>): Promise<ActionResult<{ conversationId: string }>> {
  const t = await getT();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.generic, fieldErrors: translateIssues(t, parsed.error) };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { data: project } = await supabase.from("projects").select("title").eq("id", parsed.data.projectId).maybeSingle();
  if (!project) return { ok: false, error: t.errors.project_not_found };

  const { data, error } = await supabase.rpc("apply_to_project", {
    p_project: parsed.data.projectId,
    p_role: parsed.data.role,
    p_message: parsed.data.message,
    p_chat_text: format(t.projects.chatMessageTemplate, { title: project.title, message: parsed.data.message }),
  });
  if (error || !data) return { ok: false, error: errorMessage(t, error) };

  revalidateProjects(parsed.data.projectId);
  const result = data as { conversation_id: string };
  return { ok: true, data: { conversationId: result.conversation_id }, message: t.projects.applied };
}

/** Автор принимает/отклоняет отклик, откликнувшийся — отзывает. Права проверяет БД. */
export async function setApplicationStatusAction(applicationId: string, status: string): Promise<ActionResult> {
  const t = await getT();
  const parsedStatus = z.enum(APPLICATION_STATUSES).safeParse(status);
  if (!id.safeParse(applicationId).success || !parsedStatus.success) return { ok: false, error: t.errors.invalid_status };
  const { supabase, user } = await authed();
  if (!user) return { ok: false, error: t.errors.not_authenticated };

  const { error } = await supabase.rpc("set_application_status", {
    p_application: applicationId,
    p_status: parsedStatus.data,
  });
  if (error) return { ok: false, error: errorMessage(t, error) };

  revalidateProjects();
  revalidatePath("/dashboard/projects/[id]", "page");
  const message =
    parsedStatus.data === "accepted"
      ? t.dashboardProjects.accepted
      : parsedStatus.data === "declined"
        ? t.dashboardProjects.declined
        : parsedStatus.data === "withdrawn"
          ? t.applications.withdrawn
          : t.common.saved;
  return { ok: true, message };
}
