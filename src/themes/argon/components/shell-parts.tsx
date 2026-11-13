import type { CSSProperties } from "react";
import { themeProfile } from "@/core/settings/theme-options";
import type { Site } from "@/core/content/types";
import { publicHref } from "@/core/content/urls";
import { AppLink } from "./navigation-link";
import { TextLink } from "./ui/primitives";
import { UiText } from "@/core/i18n/provider";

export function SiteHero({ site }: { site: Site }) {
  const theme = themeProfile(site.settings);
  const title = site.hero_title || site.name;
  const subtitle =
    theme?.hero_show_subtitle !== false
      ? site.hero_subtitle || site.description
      : "";
  const motion = theme?.hero_animation ?? "rise";
  const typing = motion === "typewriter";
  const glyphs = typing
    ? Array.from(
        new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          title,
        ),
      )
    : [];
  return (
    <section
      className="hero"
      aria-label="站点横幅"
      data-hero-animation={motion}
    >
      <div className="hero-copy">
        <p className="hero-title">
          {typing ? (
            <>
              <span className="sr-only">{title}</span>
              <span aria-hidden="true">
                {glyphs.map(({ index, segment }, order) => (
                  <span
                    key={index}
                    className="hero-glyph"
                    style={
                      {
                        "--hero-typing-delay": `${order * (theme?.hero_typing_ms ?? 30)}ms`,
                      } as CSSProperties
                    }
                  >
                    {segment}
                  </span>
                ))}
              </span>
            </>
          ) : (
            title
          )}
        </p>
        {subtitle && <p className="hero-subtitle">{subtitle}</p>}
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
