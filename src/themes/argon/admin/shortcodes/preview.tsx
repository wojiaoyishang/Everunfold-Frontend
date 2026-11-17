import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { useMemo } from "react";
import { UiText } from "@/core/i18n/provider";
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
  source,
  values = {},
  compact = false,
  format = "markdown",
  media = {},
  definitions = [],
  maxDepth,
}: {
  definition: PublicShortcode;
  body?: string;
  source?: string;
  values?: Record<string, string>;
  compact?: boolean;
  format?: "markdown" | "html";
  media?: Record<string, MediaURL>;
  definitions?: readonly PublicShortcode[];
  maxDepth?: number;
}) {
  const runtime = usePluginRuntime();
  const call = source ?? shortcodeCall(definition, values, body);
  const rendered = useMemo(() => {
    // The render registry is replaced atomically when a runtime package changes.
    void runtime.catalog?.revision;
    return renderContent(
      {
        id: "shortcode-preview",
        content: [
          {
            id: "sample",
            type: format,
            content: call,
          },
        ],
        media_urls: media,
      },
      {
        definitions: previewShortcodeDefinitions(definition, definitions),
        maxDepth,
      },
      { shortcodePreview: source === undefined, videoPreview: true },
    );
  }, [
    definition,
    call,
    source,
    format,
    media,
    maxDepth,
    definitions,
    runtime.catalog?.revision,
  ]);
  return (
    <div className={styles.preview} data-compact={compact}>
      <ContentMarkup
        html={rendered.html.replace(/ id="heading-[^"]*"/g, "")}
        features={rendered.features}
        shortcodes={{ definitions, maxDepth }}
      />
      {!compact &&
        rendered.diagnostics.map((issue, index) => (
          <p role="status" key={index} className={styles.hint}>
            <UiText
              text="第 {line} 行 · {message}"
              values={{
                line: call.slice(0, issue.from).split(/\r\n?|\n/).length,
                message: issue.message,
              }}
            />
          </p>
        ))}
    </div>
  );
}
