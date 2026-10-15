import type { Locale } from "../config";
import { ru, type Dictionary } from "./ru";

export type { Dictionary };

/** Новый язык: создайте словарь с типом Dictionary и добавьте его сюда. */
export const dictionaries: Record<Locale, Dictionary> = {
  ru,
};
