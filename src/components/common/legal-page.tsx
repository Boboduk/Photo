import type { LegalDocument } from "@/content/legal";
import { format, formatDay } from "@/i18n/format";
import { getI18n } from "@/i18n/server";

export async function LegalPage({ doc }: { doc: LegalDocument }) {
  const { t, locale } = await getI18n();
  return (
    <article className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted">{format(t.legal.updated, { date: formatDay(locale, doc.updated) })}</p>
      <p className="mt-6 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">{t.legal.draftNote}</p>
      <p className="mt-8 text-lg leading-relaxed">{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index} className="mt-3 leading-relaxed text-foreground/85">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
