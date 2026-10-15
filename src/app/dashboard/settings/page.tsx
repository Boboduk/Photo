import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import {
  BlockedUsers,
  ContactsForm,
  DeleteAccount,
  EmailForm,
  NotificationSettingsForm,
  PasswordForm,
  ProfileTypeForm,
} from "@/components/dashboard/settings-forms";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.settings.title };
}

export default async function SettingsPage() {
  const user = await requireUser("/dashboard/settings");
  const { t } = await getI18n();
  const supabase = await createClient();
  const [{ data: privateData }, { data: blocks }] = await Promise.all([
    supabase.from("profile_private").select("*").eq("id", user.id).single(),
    supabase
      .from("user_blocks")
      .select("blocked:profiles!user_blocks_blocked_id_fkey(id, username, display_name, avatar_url)")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false }),
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
      content: <ProfileTypeForm value={user.profile.profile_type} />,
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
