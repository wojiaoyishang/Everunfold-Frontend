"use client";
import { TextLink } from "@/themes/argon/components/ui/primitives";

import type { CSSProperties, ReactNode } from "react";
import type { Site } from "@/core/content/types";
import { resourceUrl } from "@/core/content/urls";

import { SiteHeader } from "./site-header";
import { Sidebar } from "./sidebar";
import { FloatingTools } from "./floating-tools";
import { NavigationProvider } from "./navigation-state";
import { BackgroundVideoProvider } from "./background-video";
import { ReadingStateProvider } from "./reading-state";
import { RouteContent } from "./route-content";
import { RouteStateProvider, useRouteState } from "./route-state";
import { HomeFeedPreference } from "./home-feed-settings";
import { ReaderDataProvider } from "./reader-data";
import { FeedbackProvider } from "./ui/feedback";

export function BlogShell({
  site,
  backendBaseUrl,
  children,
}: {
  site: Site;
  backendBaseUrl: string;
  children: ReactNode;
}) {
  return (
    <NavigationProvider>
      <RouteStateProvider site={site}>
        <ReadingStateProvider>
          <ReaderDataProvider baseUrl={backendBaseUrl}>
            <FeedbackProvider>
              <ShellFrame>{children}</ShellFrame>
            </FeedbackProvider>
          </ReaderDataProvider>
        </ReadingStateProvider>
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
      <BackgroundVideoProvider poster={background}>
        <HomeFeedPreference />
        <TextLink className="skip-link" href="#main-content">
          跳到正文
        </TextLink>
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
          <main id="main-content" className="main-column" tabIndex={-1}>
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
        <FloatingTools />
      </BackgroundVideoProvider>
    </div>
  );
}
