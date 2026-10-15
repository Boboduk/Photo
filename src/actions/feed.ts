"use server";

import {
  parsePortfolioFilters,
  parseProfileFilters,
  parseProjectFilters,
  searchPortfolio,
  searchProfiles,
  searchProjects,
} from "@/lib/queries/search";
import { clampInt } from "@/lib/utils";
import { z } from "zod";

// Подгрузка следующих страниц для кнопки «Загрузить ещё».
// Клиент передаёт строку запроса страницы; параметры заново проверяются здесь.

const uuidOrUndefined = z.uuid().optional().catch(undefined);

function toParams(query: string) {
  const params: Record<string, string | string[]> = {};
  const search = new URLSearchParams(typeof query === "string" ? query.slice(0, 2000) : "");
  for (const key of new Set(search.keys())) {
    const values = search.getAll(key);
    params[key] = values.length > 1 ? values : values[0];
  }
  return params;
}

export async function loadMorePortfolio(query: string, offset: number, owner?: string) {
  const filters = parsePortfolioFilters(toParams(query));
  return searchPortfolio({ ...filters, owner: uuidOrUndefined.parse(owner) }, clampInt(offset, 0, 10_000, 0));
}

export async function loadMoreProfiles(kind: "photographer" | "model", query: string, offset: number) {
  const filters = parseProfileFilters(kind === "model" ? "model" : "photographer", toParams(query));
  return searchProfiles(filters, clampInt(offset, 0, 10_000, 0));
}

export async function loadMoreProjects(query: string, offset: number, author?: string) {
  const filters = parseProjectFilters(toParams(query));
  return searchProjects({ ...filters, author: uuidOrUndefined.parse(author) }, clampInt(offset, 0, 10_000, 0));
}
