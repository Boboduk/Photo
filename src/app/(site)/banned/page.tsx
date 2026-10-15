import { BanIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { brand } from "@/config/brand";
import { format } from "@/i18n/format";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export default async function BannedPage() {
  const user = await getCurrentUser();
  if (!user?.profile.banned_at) redirect("/");
  const t = await getT();
  return (
    <div className="container-page flex max-w-xl flex-1 flex-col items-center justify-center py-24 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <BanIcon className="size-6" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.pages.bannedTitle}</h1>
      <p className="mt-3 text-muted">{format(t.pages.bannedText, { email: brand.supportEmail })}</p>
      {user.profile.ban_reason ? (
        <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm">{format(t.pages.bannedReason, { reason: user.profile.ban_reason })}</p>
      ) : null}
    </div>
  );
}
