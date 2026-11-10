"use client";
import { UiText } from "@/core/i18n/provider";

import { TextLink } from "@/themes/argon/components/ui/primitives";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { Site } from "@/core/content/types";
import { setSiteAppearance } from "@/core/browser/appearance";
import { resourceUrl } from "@/core/content/urls";
import { fontFace, fontFamily } from "@/core/fonts/media";

import { NavigationProvider } from "./navigation-state";
import { BackgroundVideoProvider } from "./background-video";
import { ReadingStateProvider } from "./reading-state";
import { RouteContent } from "./route-content";
import { RouteStateProvider, useRouteState } from "./route-state";
import { HomeFeedPreference } from "./home-feed-settings";
import { ReaderDataProvider } from "./reader-data";
import { FeedbackProvider } from "./ui/feedback";
import { CodePreferencesProvider } from "./code-preferences";
import { ExtensionComponent } from "@/core/extensions/components";
import { ThemeSlot } from "@/core/themes/presentation";
import { themeProfile } from "@/core/settings/theme-options";
import { GlossaryHooks } from "./glossary-hooks";

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
              <ExtensionComponent name="public.shell">
                {children}
              </ExtensionComponent>
            </FeedbackProvider>
          </ReaderDataProvider>
        </ReadingStateProvider>
      </RouteStateProvider>
    </NavigationProvider>
  );
}

export function ShellFrame({ children }: { children: ReactNode }) {
  const { site, toc, presentationId } = useRouteState();
  const theme = themeProfile(site.settings);
  useEffect(() => {
    setSiteAppearance({
      mode: theme?.mode ?? "system",
      accent: theme?.accent ?? "#673bb7",
    });
  }, [theme?.mode, theme?.accent]);
  const background =
    resourceUrl(site.hero_url) ?? "/reference/campfire-background.webp";
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
        data-paper-tone={theme?.paper_tone ?? "ivory"}
        style={
          {
            "--site-background": `url(${JSON.stringify(background)})`,
            ...(themeFont
              ? {
                  fontFamily: `"${fontFamily(theme?.font_media_id ?? "")}", -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`,
                  "--theme-heading-font": `"${fontFamily(theme?.font_media_id ?? "")}", -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`,
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
          key={theme?.background_video_url}
          poster={background}
          source={theme?.background_video_url}
          defaultPlay={theme?.background_play}
        >
          <HomeFeedPreference />
          <TextLink className="skip-link" href="#main-content">
            <UiText text="跳到正文" />
          </TextLink>
          <ThemeSlot name="shell.header.before" context={{ site }} />
          <ExtensionComponent name="public.header" site={site} />
          <ThemeSlot name="shell.header.after" context={{ site }} />
          <ThemeSlot name="shell.hero.before" context={{ site }} />
          <ExtensionComponent name="public.hero" site={site} />
          <ThemeSlot name="shell.hero.after" context={{ site }} />
          <div className="blog-container">
            <ExtensionComponent
              name="public.sidebar"
              site={site}
              toc={toc}
              contentKey={presentationId}
            />
            <main id="main-content" className="main-column" tabIndex={-1}>
              <ThemeSlot name="shell.content.before" context={{ site }} />
              <RouteContent>{children}</RouteContent>
              <ThemeSlot name="shell.content.after" context={{ site }} />
            </main>
          </div>
          <ThemeSlot name="shell.footer.before" context={{ site }} />
          <ExtensionComponent name="public.footer" site={site} />
          <ThemeSlot name="shell.footer.after" context={{ site }} />
          <ExtensionComponent name="public.tools" />
          <GlossaryHooks />
        </BackgroundVideoProvider>
      </div>
    </CodePreferencesProvider>
  );
}
