import type { Metadata } from "next";
import { CatalogPage } from "@/components/profile/catalog-page";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.catalog.modelsTitle, description: t.catalog.modelsSubtitle };
}

export default async function ModelsPage(props: PageProps<"/models">) {
  return <CatalogPage kind="model" searchParams={await props.searchParams} />;
}
