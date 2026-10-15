import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/config/brand";
import { getT } from "@/i18n/server";

export async function SiteFooter() {
  const t = await getT();
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t.footer.platform,
      links: [
        { href: "/photographers", label: t.nav.photographers },
        { href: "/models", label: t.nav.models },
        { href: "/portfolio", label: t.nav.portfolio },
        { href: "/projects", label: t.nav.projects },
      ],
    },
    {
      title: t.footer.community,
      links: [
        { href: "/register", label: t.nav.register },
        { href: "/dashboard/portfolio/new", label: t.dashboard.quick.addWork },
        { href: "/dashboard/projects/new", label: t.dashboard.quick.newProject },
        { href: "/rules", label: t.footer.rules },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { href: "/terms", label: t.footer.terms },
        { href: "/privacy", label: t.footer.privacy },
        { href: "/consent", label: t.footer.consent },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">{t.footer.about}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-xs text-subtle sm:flex-row sm:justify-between">
        <span>
          © {year} {brand.name}. {t.footer.rights}
        </span>
        <a href={`mailto:${brand.supportEmail}`} className="hover:text-foreground">
          {brand.supportEmail}
        </a>
      </div>
    </footer>
  );
}
