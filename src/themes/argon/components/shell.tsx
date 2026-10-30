import type { CSSProperties, ReactNode } from "react";
import type { Site } from "@/core/content/types";
import type { TableOfContentsItem } from "@/core/rendering/content";
import { resourceUrl } from "@/core/content/urls";

import { SiteHeader, Sidebar } from "./sidebar";
import { BackToTop } from "./controls";
import { NavigationProvider } from "./navigation-state";

export function BlogShell({
  site,
  children,
  toc,
  sidebarKey,
}: {
  site: Site;
  children: ReactNode;
  toc?: TableOfContentsItem[];
  sidebarKey?: string;
}) {
  const background =
    resourceUrl(site.hero_url) ?? "/reference/campfire-background.webp";
  return (
    <NavigationProvider>
      <div
        className="blog-shell"
        style={
          {
            "--site-background": `url(${JSON.stringify(background)})`,
          } as CSSProperties
        }
      >
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <div className="page-background" aria-hidden="true" />
        <SiteHeader site={site} />
        <section className="hero" aria-label="站点横幅">
          <div className="hero-copy">
            <p className="hero-title">{site.hero_title || site.name}</p>
            <p className="hero-subtitle">
              {site.hero_subtitle || site.description}
            </p>
          </div>
        </section>
        <div className="blog-container">
          <Sidebar key={sidebarKey} site={site} toc={toc} />
          <main id="main-content" className="main-column">
            {children}
          </main>
        </div>
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
        <BackToTop />
      </div>
    </NavigationProvider>
  );
}
