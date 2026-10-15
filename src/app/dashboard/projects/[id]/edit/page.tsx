import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { ProjectEditor } from "@/components/projects/project-editor";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { categoryName, getCategories } from "@/lib/categories";
import { getProject } from "@/lib/queries/projects";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.dashboardProjects.editTitle };
}

export default async function EditProjectPage(props: PageProps<"/dashboard/projects/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireUser(`/dashboard/projects/${id}/edit`);
  const { t, locale } = await getI18n();
  const [project, categories] = await Promise.all([getProject(id), getCategories()]);
  if (!project || project.author_id !== user.id) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader size="md" title={t.dashboardProjects.editTitle} />
      <ProjectEditor
        userId={user.id}
        categories={categories.filter((c) => c.for_works).map((c) => ({ value: c.slug, label: categoryName(c, locale) }))}
        initial={{
          id: project.id,
          title: project.title,
          description: project.description,
          city: project.city,
          location: project.location,
          shoot_date: project.shoot_date,
          category_slug: project.category_slug,
          looking_for: project.looking_for,
          collab_format: project.collab_format,
          terms: project.terms,
          usage_rights: project.usage_rights,
          requirements: project.requirements,
          spots: project.spots,
          cover_url: project.cover_url,
          cover_path: project.cover_path,
        }}
      />
    </div>
  );
}
