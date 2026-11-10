import type { Site } from "@/core/content/types";
import { publicHref } from "@/core/content/urls";
import { AppLink } from "./navigation-link";

export function SiteHero({ site }: { site: Site }) {
  return (
    <section className="hero" aria-label="站点横幅">
      <div className="hero-copy">
        <p className="hero-title">{site.hero_title || site.name}</p>
        <p className="hero-subtitle">
          {site.hero_subtitle || site.description}
        </p>
      </div>
    </section>
  );
}

export function SiteFooter({ site }: { site: Site }) {
  const footer = site.settings?.site.footer;
  const links = (footer?.links ?? []).filter(
    (link) => link.label.trim() && publicHref(link.href),
  );
  return (
    <footer className="site-footer">
      <p>
        {footer?.copyright ||
          `© ${new Date().getFullYear()} ${site.author} · ${site.hero_title || site.name}`}
      </p>
      {links.length > 0 && (
        <p className="footer-links">
          {links.map((link, index) => (
            <span key={link.id}>
              {index > 0 && <span className="footer-separator">·</span>}
              <AppLink href={link.href}>{link.label}</AppLink>
            </span>
          ))}
        </p>
      )}
      <p>
        Every story is still unfolding.{" "}
        <span className="footer-separator">·</span> Powered by Everunfold
      </p>
    </footer>
  );
}
