import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { TryOnStudio } from "@/components/tryon/tryon-studio";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { isModelProfileType } from "@/lib/queries/profile-types";
import { createClient } from "@/lib/supabase/server";
import { isTryOnConfigured } from "@/lib/tryon/provider";
import { getTryOnStudio } from "@/lib/tryon/service";
import { firstParam } from "@/lib/utils";

// Генерация образа в server action занимает до минуты.
export const maxDuration = 120;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.tryon.title };
}

export default async function TryOnPage(props: PageProps<"/dashboard/tryon">) {
  const user = await requireUser("/dashboard/tryon");
  const t = await getT();
  const supabase = await createClient();
  // ?model=<id> — переход с профиля модели: она сразу выбрана.
  const searchParams = await props.searchParams;
  const initialModelId = firstParam(searchParams.model) ?? null;
  const [studio, canShare] = await Promise.all([getTryOnStudio(supabase, user.id), isModelProfileType(user.profile.profile_type)]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader size="md" title={t.tryon.title} subtitle={t.tryon.subtitle} />
      <TryOnStudio
        userId={user.id}
        configured={isTryOnConfigured()}
        canShare={canShare}
        initialModelId={initialModelId}
        focusRequests={firstParam(searchParams.requests) === "1"}
        {...studio}
      />
    </div>
  );
}
