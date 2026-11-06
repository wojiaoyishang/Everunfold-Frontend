import { useMemo } from "react";
import type { PublicShortcode } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";
import { renderContent } from "@/core/rendering/content";
import { shortcodeCall } from "@/core/shortcodes/parser";
import { previewShortcodeDefinitions } from "@/core/shortcodes/registry";
import { ContentMarkup } from "../../components/content-markup";
import styles from "./shortcodes.module.css";

export function ShortcodePreview({
  definition,
  body = "这里是正文内容。",
  values = {},
  compact = false,
  format = "markdown",
  media = {},
  definitions = [],
}: {
  definition: PublicShortcode;
  body?: string;
  values?: Record<string, string>;
  compact?: boolean;
  format?: "markdown" | "html";
  media?: Record<string, MediaURL>;
  definitions?: readonly PublicShortcode[];
}) {
  const rendered = useMemo(
    () =>
      renderContent(
        {
          id: "shortcode-preview",
          content: [
            {
              id: "sample",
              type: format,
              content: shortcodeCall(definition, values, body),
            },
          ],
          media_urls: media,
        },
        previewShortcodeDefinitions(definition, definitions),
        { shortcodePreview: true },
      ),
    [definition, values, body, format, media, definitions],
  );
  return (
    <div className={styles.preview} data-compact={compact}>
      <ContentMarkup
        html={rendered.html.replace(/ id="heading-[^"]*"/g, "")}
        features={rendered.features}
      />
      {!compact &&
        rendered.diagnostics.map((issue, index) => (
          <p role="status" key={index} className={styles.hint}>
            {issue.message}
          </p>
        ))}
    </div>
  );
}
