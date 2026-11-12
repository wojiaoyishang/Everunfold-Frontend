import type { Site } from "@/core/content/types";
import { publicHref } from "@/core/content/urls";
import { AppLink } from "./navigation-link";
import { TextLink } from "./ui/primitives";
import { UiText } from "@/core/i18n/provider";

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
  const sitemap = site.sitemapPreviewPath;
  const showSitemap = sitemap && !links.some((link) => link.href === sitemap);
  return (
    <footer className="site-footer">
      <p>
        {footer?.copyright ||
          `© ${new Date().getFullYear()} ${site.author} · ${site.hero_title || site.name}`}
      </p>
      {(links.length > 0 || showSitemap) && (
        <p className="footer-links">
          {links.map((link, index) => (
            <span key={link.id}>
              {index > 0 && <span className="footer-separator">·</span>}
              <AppLink href={link.href}>{link.label}</AppLink>
            </span>
          ))}
          {showSitemap && (
            <span>
              {links.length > 0 && <span className="footer-separator">·</span>}
              <TextLink href={sitemap}>
                <UiText text="站点地图" />
              </TextLink>
            </span>
          )}
        </p>
      )}
      <p>
        Every story is still unfolding.{" "}
        <span className="footer-separator">·</span> Powered by Everunfold
      </p>
    </footer>
  );
}
