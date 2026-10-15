import type { Metadata } from "next";
import { CatalogPage } from "@/components/profile/catalog-page";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.catalog.photographersTitle, description: t.catalog.photographersSubtitle };
}

export default async function PhotographersPage(props: PageProps<"/photographers">) {
  return <CatalogPage kind="photographer" searchParams={await props.searchParams} />;
}
