import type { Site } from "@/core/content/types";

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
  return (
    <footer className="site-footer">
      <p>
        © {new Date().getFullYear()} {site.author} ·{" "}
        {site.hero_title || site.name}
      </p>
      <p>
        Every story is still unfolding.{" "}
        <span className="footer-separator">·</span> Powered by Everunfold
      </p>
    </footer>
  );
}
