import { useMemo, type CSSProperties } from "react";
import { themeProfile } from "@/core/settings/theme-options";
import type { Site } from "@/core/content/types";
import { publicHref } from "@/core/content/urls";
import { renderContent } from "@/core/rendering/content";
import { AppLink } from "./navigation-link";
import { TextLink } from "./ui/primitives";
import { UiText } from "@/core/i18n/provider";
import { footerCredits } from "../footer-credits";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const typingLead = 180;
const caretHold = 320;
const typingLineGap = 240;

function TypedLine({
  glyphs,
  start,
  pace,
}: {
  glyphs: Intl.SegmentData[];
  start: number;
  pace: number;
}) {
  return (
    <>
      <span className="sr-only">
        {glyphs.map(({ segment }) => segment).join("")}
      </span>
      <span className="hero-typing-line" aria-hidden="true">
        <span
          className="hero-typing-start"
          style={
            {
              "--hero-typing-delay": `${start}ms`,
              "--hero-caret-duration": `${typingLead}ms`,
            } as CSSProperties
          }
        />
        {glyphs.map(({ index, segment }, order) => (
          <span
            key={index}
            className="hero-glyph"
            style={
              {
                "--hero-typing-delay": `${start + typingLead + order * pace}ms`,
                "--hero-caret-duration": `${order === glyphs.length - 1 ? caretHold : pace}ms`,
              } as CSSProperties
            }
          >
            {segment}
          </span>
        ))}
      </span>
    </>
  );
}

export function SiteHero({ site }: { site: Site }) {
  const theme = themeProfile(site.settings);
  const title = site.hero_title || site.name;
  const subtitle =
    theme?.hero_show_subtitle !== false
      ? site.hero_subtitle || site.description
      : "";
  const motion = theme?.hero_animation ?? "rise";
  const typing = motion === "typewriter";
  const pace = theme?.hero_typing_ms ?? 30;
  const titleGlyphs = typing ? Array.from(segmenter.segment(title)) : [];
  const subtitleStart =
    typingLead +
    Math.max(0, titleGlyphs.length - 1) * pace +
    caretHold +
    typingLineGap;
  return (
    <section
      className="hero"
      aria-label="站点横幅"
      data-hero-animation={motion}
    >
      <div className="hero-copy">
        <p className="hero-title">
          {typing ? (
            <TypedLine glyphs={titleGlyphs} start={0} pace={pace} />
          ) : (
            title
          )}
        </p>
        {subtitle && (
          <p className="hero-subtitle">
            {typing ? (
              <TypedLine
                glyphs={Array.from(segmenter.segment(subtitle))}
                start={subtitleStart}
                pace={pace}
              />
            ) : (
              subtitle
            )}
          </p>
        )}
      </div>
    </section>
  );
}

export function SiteFooter({ site }: { site: Site }) {
  const footer = site.settings?.site.footer;
  const source = footer?.html?.trim();
  const html = useMemo(
    () =>
      source
        ? renderContent(
            {
              id: "site-footer",
              content: [{ id: "footer", type: "html", content: source }],
              media_urls: {},
            },
            [],
            { disableShortcodeScripts: true, omitGlossaryPopups: true },
          ).html.trim()
        : "",
    [source],
  );
  if (source && !html) return null;
  const links = (footer?.links ?? []).filter(
    (link) => link.label.trim() && publicHref(link.href),
  );
  return (
    <footer className="site-footer" role="contentinfo">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <>
          {footer?.copyright && <p>{footer.copyright}</p>}
          {links.length > 0 && (
            <p>
              {links.map((link, index) => (
                <span key={link.id}>
                  {index > 0 && <span className="footer-separator">·</span>}
                  <AppLink href={link.href}>{link.label}</AppLink>
                </span>
              ))}
            </p>
          )}
          <p>
            {footerCredits.map(({ label, name, href }, index) => (
              <span key={name}>
                {index > 0 && <span className="footer-separator">·</span>}
                <UiText text={label} /> <TextLink href={href}>{name}</TextLink>
              </span>
            ))}
          </p>
        </>
      )}
    </footer>
  );
}
