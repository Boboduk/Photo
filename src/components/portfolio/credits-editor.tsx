"use client";

import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { searchPeopleAction } from "@/actions/portfolio";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { TEAM_ROLES, type TeamRole } from "@/lib/constants";

export type CreditDraft = {
  key: string;
  profile_id: string | null;
  name: string | null;
  role: TeamRole;
  display?: { display_name: string; username: string; avatar_url: string | null };
};

type Person = { id: string; username: string; display_name: string; avatar_url: string | null };

/** Отметка участников съёмки: поиск пользователя или произвольное имя. */
export function CreditsEditor({
  credits,
  onChange,
  excludeUserId,
}: {
  credits: CreditDraft[];
  onChange: (credits: CreditDraft[]) => void;
  excludeUserId: string;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<TeamRole>("model");
  const [results, setResults] = useState<Person[]>([]);
  const [, startSearch] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => {
      startSearch(async () => {
        const people = await searchPeopleAction(value);
        setResults(people.filter((p) => p.id !== excludeUserId && !credits.some((c) => c.profile_id === p.id)));
      });
    }, 250);
  };

  const add = (credit: Omit<CreditDraft, "key">) => {
    onChange([...credits, { ...credit, key: crypto.randomUUID() }]);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="flex flex-col gap-3">
      {credits.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {credits.map((credit) => (
            <li key={credit.key} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar src={credit.display?.avatar_url} name={credit.display?.display_name ?? credit.name ?? "?"} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {credit.display?.display_name ?? credit.name}
                {credit.display ? <span className="ml-1.5 font-normal text-muted">@{credit.display.username}</span> : null}
              </span>
              <NativeSelect
                aria-label={t.dashboardPortfolio.creditRole}
                value={credit.role}
                onChange={(e) =>
                  onChange(credits.map((c) => (c.key === credit.key ? { ...c, role: e.target.value as TeamRole } : c)))
                }
                className="h-9 w-40 text-sm"
              >
                {TEAM_ROLES.map((value) => (
                  <option key={value} value={value}>
                    {t.enums.teamRole[value]}
                  </option>
                ))}
              </NativeSelect>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.common.remove}
                onClick={() => onChange(credits.filter((c) => c.key !== credit.key))}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {credits.length < 20 ? (
        <div className="relative flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t.dashboardPortfolio.creditSearch}
              aria-label={t.dashboardPortfolio.creditSearch}
              className="pl-10"
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
            {results.length > 0 ? (
              <ul role="listbox" className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border border-line bg-background shadow-pop">
                {results.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() =>
                        add({
                          profile_id: person.id,
                          name: null,
                          role,
                          display: { display_name: person.display_name, username: person.username, avatar_url: person.avatar_url },
                        })
                      }
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
                    >
                      <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
                      <span className="font-medium">{person.display_name}</span>
                      <span className="text-muted">@{person.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <NativeSelect
            aria-label={t.dashboardPortfolio.creditRole}
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            className="sm:w-40"
          >
            {TEAM_ROLES.map((value) => (
              <option key={value} value={value}>
                {t.enums.teamRole[value]}
              </option>
            ))}
          </NativeSelect>
          <Button
            variant="outline"
            disabled={query.trim().length < 1}
            onClick={() => add({ profile_id: null, name: query.trim().slice(0, 80), role })}
            title={t.dashboardPortfolio.creditName}
          >
            <PlusIcon />
            {t.dashboardPortfolio.addCredit}
          </Button>
        </div>
      ) : null}
      <p className="text-[13px] text-muted">{t.dashboardPortfolio.creditsHint}</p>
    </div>
  );
}
