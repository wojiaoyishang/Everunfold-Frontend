"use client";
import { TextLink } from "@/themes/argon/components/ui/primitives";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { Site } from "@/core/content/types";
import { setSiteAppearance } from "@/core/browser/appearance";
import { resourceUrl } from "@/core/content/urls";
import { fontFace, fontFamily } from "@/core/rendering/fonts";

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
import { CodePreferencesProvider } from "./code-preferences";

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
  useEffect(() => {
    setSiteAppearance({
      mode: site.settings?.theme.mode ?? "system",
      accent: site.settings?.theme.accent ?? "#673bb7",
    });
  }, [site.settings?.theme.mode, site.settings?.theme.accent]);
  const background =
    resourceUrl(site.hero_url) ?? "/reference/campfire-background.webp";
  const theme = site.settings?.theme;
  const themeFont =
    theme?.font_media_id && theme.font_url && theme.font_info
      ? fontFace(theme.font_media_id, {
          original: theme.font_url,
          font: theme.font_info,
        })
      : "";
  return (
    <CodePreferencesProvider value={theme?.code}>
      <div
        className="blog-shell"
        data-surface="public"
        style={
          {
            "--site-background": `url(${JSON.stringify(background)})`,
            ...(themeFont
              ? {
                  fontFamily: `"${fontFamily(theme?.font_media_id ?? "")}", -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`,
                }
              : {}),
          } as CSSProperties
        }
      >
        {themeFont && (
          <style
            data-theme-font
            dangerouslySetInnerHTML={{ __html: themeFont }}
          />
        )}
        <BackgroundVideoProvider
          key={site.settings?.theme.background_video_url}
          poster={background}
          source={site.settings?.theme.background_video_url}
          defaultPlay={site.settings?.theme.background_play}
        >
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
    </CodePreferencesProvider>
  );
}
