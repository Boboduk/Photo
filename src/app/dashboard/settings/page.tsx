import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { AssistantsSettings, type AssistantGrant } from "@/components/dashboard/assistants-settings";
import {
  BlockedUsers,
  ContactsForm,
  DeleteAccount,
  EmailForm,
  NotificationSettingsForm,
  PasswordForm,
  ProfileTypeForm,
} from "@/components/dashboard/settings-forms";
import { siteUrl } from "@/config/site";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { MCP_PATH } from "@/lib/mcp/auth";
import { getProfileTypes } from "@/lib/queries/profile-types";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.settings.title };
}

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const { t } = await getI18n();
  const supabase = await createClient();
  const [{ data: privateData }, { data: blocks }, profileTypes, grants] = await Promise.all([
    supabase.from("profile_private").select("*").eq("id", user.id).single(),
    supabase
      .from("user_blocks")
      .select("blocked:profiles!user_blocks_blocked_id_fkey(id, username, display_name, avatar_url)")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false }),
    getProfileTypes(),
    // Приложения, которым пользователь выдал доступ через OAuth (MCP-клиенты).
    supabase.auth.oauth.listGrants().then(({ data, error }): AssistantGrant[] | null =>
      error || !data
        ? null
        : data.map((grant) => ({
            clientId: grant.client.id,
            name: grant.client.name || grant.client.uri || grant.client.id,
            uri: grant.client.uri,
            grantedAt: grant.granted_at,
          })),
    ),
  ]);

  const sections = [
    {
      id: "account",
      title: t.settings.account,
      content: (
        <div className="grid gap-10 xl:grid-cols-2">
          <EmailForm email={user.email ?? ""} />
          <PasswordForm />
        </div>
      ),
    },
    {
      id: "type",
      title: t.settings.profileType,
      description: t.settings.profileTypeHint,
      content: <ProfileTypeForm value={user.profile.profile_type} profileTypes={profileTypes.map((pt) => ({ slug: pt.slug, name: pt.name }))} />,
    },
    { id: "privacy", title: t.settings.privacy, content: privateData ? <ContactsForm data={privateData} /> : null },
    {
      id: "notifications",
      title: t.settings.notifications,
      content: privateData ? <NotificationSettingsForm data={privateData} /> : null,
    },
    {
      id: "blocked",
      title: t.settings.blocked,
      content: <BlockedUsers users={(blocks ?? []).flatMap((b) => (b.blocked ? [b.blocked] : []))} />,
    },
    {
      id: "assistants",
      title: t.assistants.title,
      description: t.assistants.description,
      content: <AssistantsSettings serverUrl={`${siteUrl}${MCP_PATH}`} grants={grants} />,
    },
    {
      id: "danger",
      title: t.settings.dangerZone,
      description: t.settings.deleteText,
      content: <DeleteAccount username={user.profile.username} />,
    },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader size="md" title={t.settings.title} subtitle={t.settings.subtitle} />
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="grid gap-5 border-t border-line pt-8 lg:grid-cols-[220px_1fr] lg:gap-10">
          <div>
            <h2 className="font-semibold">{section.title}</h2>
            {section.description ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{section.description}</p> : null}
          </div>
          <div className="min-w-0">{section.content}</div>
        </section>
      ))}
    </div>
  );
}
