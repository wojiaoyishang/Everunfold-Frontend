"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Site } from "@/core/content/types";
import { resourceUrl } from "@/core/content/urls";

import { SiteHeader, Sidebar } from "./sidebar";
import { BackToTop } from "./controls";
import { NavigationProvider } from "./navigation-state";
import { BackgroundVideo } from "./background-video";
import {
  NavigationProgress,
  RouteContent,
  RouteStateProvider,
  useRouteState,
} from "./route-state";

export function BlogShell({
  site,
  children,
}: {
  site: Site;
  children: ReactNode;
}) {
  return (
    <NavigationProvider>
      <RouteStateProvider site={site}>
        <ShellFrame>{children}</ShellFrame>
      </RouteStateProvider>
    </NavigationProvider>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const { site, toc, presentationId } = useRouteState();
  const background =
    resourceUrl(site.hero_url) ?? "/reference/campfire-background.webp";
  return (
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
      <BackgroundVideo poster={background} />
      <NavigationProgress />
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
        <Sidebar site={site} toc={toc} contentKey={presentationId} />
        <main id="main-content" className="main-column">
          <RouteContent>{children}</RouteContent>
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
  );
}
