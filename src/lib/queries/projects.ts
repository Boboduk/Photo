import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function getProject(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*, author:profiles!projects_author_id_fkey(id, username, display_name, avatar_url, city, profile_type)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export type ProjectFull = NonNullable<Awaited<ReturnType<typeof getProject>>>;

export async function getMyApplication(projectId: string, userId: string | undefined) {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_applications")
    .select("id, status, role, conversation_id, created_at")
    .eq("project_id", projectId)
    .eq("applicant_id", userId)
    .maybeSingle();
  return data;
}
