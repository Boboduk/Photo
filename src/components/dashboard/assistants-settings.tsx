"use client";

import { AlertTriangleIcon, BotIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { revokeOAuthGrantAction } from "@/actions/oauth";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/client";
import { format, formatDate } from "@/i18n/format";

export type AssistantGrant = { clientId: string; name: string; uri: string; grantedAt: string };

/** Подключение ИИ-ассистентов к MCP-серверу и список выданных доступов. */
export function AssistantsSettings({ serverUrl, grants }: { serverUrl: string; grants: AssistantGrant[] | null }) {
  const t = useT();
  const locale = useLocale();
  const command = `claude mcp add --transport http frame ${serverUrl}`;
  const projectConfig = JSON.stringify({ mcpServers: { frame: { type: "http", url: serverUrl } } }, null, 2);
  // Облачные клиенты (Claude.ai, Claude Desktop) не достанут до локального адреса.
  const isLocal = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.)/.test(serverUrl);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.assistants.copied);
    } catch {
      toast.error(t.errors.generic);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t.assistants.serverUrl}</p>
        <div className="flex gap-2">
          <code className="flex h-10 min-w-0 flex-1 items-center overflow-x-auto rounded-lg bg-surface px-3.5 text-sm whitespace-nowrap">{serverUrl}</code>
          <Button variant="outline" size="icon" aria-label={t.assistants.copy} onClick={() => copy(serverUrl)}>
            <CopyIcon />
          </Button>
        </div>
      </div>

      {isLocal ? (
        <div className="flex gap-2.5 rounded-lg bg-warning-soft px-3.5 py-3 text-[13px] leading-relaxed text-warning">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">{t.assistants.localTitle}</p>
            <p>{t.assistants.localText}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 text-sm leading-relaxed">
        <p className="font-medium">{t.assistants.howTo}</p>
        {!isLocal ? <p className="text-muted">{t.assistants.howToClaude}</p> : null}
        <p className="text-muted">{t.assistants.howToVscode}</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-surface px-3.5 py-2.5 text-[13px] leading-snug">{projectConfig}</pre>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-1.5 right-1.5"
            aria-label={t.assistants.copy}
            onClick={() => copy(projectConfig)}
          >
            <CopyIcon />
          </Button>
        </div>
        <p className="text-muted">{t.assistants.howToCode}</p>
        <code className="block overflow-x-auto rounded-lg bg-surface px-3.5 py-2.5 text-[13px] whitespace-nowrap">{command}</code>
        <p className="text-muted">{t.assistants.howToOther}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{t.assistants.connected}</p>
        {grants === null ? (
          <p className="text-sm text-muted">{t.assistants.unavailable}</p>
        ) : grants.length === 0 ? (
          <p className="text-sm text-muted">{t.assistants.noConnected}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {grants.map((grant) => (
              <li key={grant.clientId} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface">
                  <BotIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{grant.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {format(t.assistants.grantedAt, { date: formatDate(locale, grant.grantedAt) })}
                  </span>
                </span>
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      {t.assistants.revoke}
                    </Button>
                  }
                  title={format(t.assistants.revokeTitle, { name: grant.name })}
                  description={t.assistants.revokeText}
                  confirmLabel={t.assistants.revoke}
                  onConfirm={async () => {
                    const result = await revokeOAuthGrantAction(grant.clientId);
                    if (result.ok) toast.success(result.message);
                    else {
                      toast.error(result.error);
                      return false;
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
