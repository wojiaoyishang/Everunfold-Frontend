"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import type {
  BuilderComponentDefinition,
  BuilderDocument,
  BuilderNode,
  BuilderValues,
} from "@/core/builder/types";
import { builderEntries, resolvedBuilderProps } from "@/core/builder/document";
import { builderStyle } from "@/core/builder/layout";
import { coreBuilderComponents } from "@/core/builder/registry";
import type { PublicShortcode } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { RuntimeComponent } from "@/core/plugins/runtime/view";
import { pluginRegistry } from "@/core/plugins/registry";
import { renderContent } from "@/core/rendering/content";
import { shortcodeCall } from "@/core/shortcodes/parser";
import { parseSiteMediaReference } from "@/core/media/references";
import { publicHref, resourceUrl } from "@/core/content/urls";
import { useLocale, UiText } from "@/core/i18n/provider";
import { ContentMarkup } from "../components/content-markup";
import { ContentMarkupView } from "../components/content-markup-view";
import { TextLink } from "../components/ui/primitives";
import { ShortcodeRegionBoundary } from "../components/shortcode-regions";
import { Icon, isBuiltinIcon, type IconName } from "../components/icon";
import styles from "./content.module.css";

export type BuilderRenderContext = {
  contentId?: string;
  contentRevision?: string;
  readReceipt?: string;
  media?: Record<string, MediaURL>;
  shortcodes?: readonly PublicShortcode[];
  glossary?: GlossaryRuntimeOptions;
  comments?: ReactNode;
};

const coreIcons: Record<string, IconName> = {
  "core.container": "grid",
  "core.heading": "type",
  "core.markdown": "book",
  "core.html": "code",
  "core.shortcode": "shortcode",
  "core.image": "image",
  "core.button": "link",
  "core.icon": "star",
  "core.banner": "image",
  "core.comment": "comment",
  "core.comments": "comment",
  "core.divider": "minus",
  "core.spacer": "wrap",
};

export function builderIcon(
  definition: Pick<BuilderComponentDefinition, "type" | "group">,
): IconName {
  return (
    coreIcons[definition.type] ??
    (definition.group === "media" ? "image" : "puzzle")
  );
}

export function useBuilderComponents() {
  const { catalog } = usePluginRuntime();
  return useMemo(
    () =>
      new Map(
        [
          ...coreBuilderComponents,
          ...(catalog?.plugins
            .filter((plugin) => !catalog.disabled.includes(plugin.id))
            .flatMap((plugin) => plugin.builderComponents ?? []) ?? []),
        ].map((definition) => [definition.type, definition]),
      ),
    [catalog],
  );
}

const stringProp = (props: BuilderValues, key: string) =>
  typeof props[key] === "string" ? props[key] : "";

function imageUrl(value: string, context?: BuilderRenderContext) {
  const id = parseSiteMediaReference(value);
  return id
    ? (resourceUrl(context?.media?.[id]?.webp) ??
        resourceUrl(context?.media?.[id]?.original))
    : resourceUrl(value);
}

function EmptyElement({ label, icon }: { label: string; icon: IconName }) {
  return (
    <span className={styles.placeholder}>
      <Icon name={icon} />
      <UiText text={label} />
    </span>
  );
}

function Source({
  id,
  source,
  format,
  context,
  preview,
}: {
  id: string;
  source: string;
  format: "markdown" | "html";
  context?: BuilderRenderContext;
  preview?: boolean;
}) {
  usePluginRuntime();
  const shortcodes = context?.shortcodes;
  const media = context?.media;
  const contentId = context?.contentId;
  const rendered = renderContent(
    {
      id: `${contentId ?? "components"}-${id}`,
      content: [{ id, type: format, content: source }],
      media_urls: media ?? {},
    },
    shortcodes,
    { shortcodePreview: preview, disableShortcodeScripts: preview },
  );
  if (preview)
    return (
      <ContentMarkupView
        html={rendered.html}
        features={rendered.features}
        className={`article-content ${styles.source}`}
        codeTools={false}
        preview
      />
    );
  const markup = (
    <ContentMarkup
      html={rendered.html}
      features={rendered.features}
      className={`article-content ${styles.source}`}
      contentId={contentId}
      contentRevision={context?.contentRevision}
      glossary={context?.glossary}
    />
  );
  return context?.readReceipt && contentId ? (
    <ShortcodeRegionBoundary
      target={contentId}
      readReceipt={context.readReceipt}
    >
      {markup}
    </ShortcodeRegionBoundary>
  ) : (
    markup
  );
}

function Action({
  label,
  href,
  preview,
}: {
  label: string;
  href: string;
  preview?: boolean;
}) {
  const url = publicHref(href);
  if (!label || (!url && !preview)) return null;
  return preview ? (
    <span className={styles.action}>{label}</span>
  ) : (
    <TextLink className={styles.action} href={url!}>
      {label}
    </TextLink>
  );
}

export function BuilderElement({
  node,
  definition,
  parameters,
  context,
  preview,
  children,
}: {
  node: BuilderNode;
  definition?: BuilderComponentDefinition;
  parameters?: BuilderValues;
  context?: BuilderRenderContext;
  preview?: boolean;
  children?: ReactNode;
}) {
  const { locale } = useLocale();
  const props = resolvedBuilderProps(node, parameters);
  const text = (key: string) => stringProp(props, key);
  const empty = (label: string, icon: IconName) =>
    preview ? <EmptyElement label={label} icon={icon} /> : null;
  let body: ReactNode;
  switch (node.type) {
    case "core.container":
      body = (
        <div className={styles.container} data-builder-container>
          {children}
        </div>
      );
      break;
    case "core.heading": {
      const levels = { "3": "h3", "4": "h4", "5": "h5", "6": "h6" } as const;
      const level = text("level");
      const Tag = levels[level as keyof typeof levels] ?? "h2";
      body = text("text") ? (
        <Tag className={styles.heading}>{text("text")}</Tag>
      ) : (
        empty("添加标题", "type")
      );
      break;
    }
    case "core.markdown":
    case "core.html":
    case "core.shortcode": {
      const source = text("source");
      body = source ? (
        <Source
          id={node.id}
          source={source}
          format={node.type === "core.html" ? "html" : "markdown"}
          context={context}
          preview={preview}
        />
      ) : (
        empty(definition?.label ?? "正文", builderIcon(node))
      );
      break;
    }
    case "core.image": {
      const url = imageUrl(text("source"), context);
      body = url ? (
        <figure className={styles.figure}>
          {/* Media URLs may belong to a different node; the original reader also uses native media. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={text("alt")} loading="lazy" decoding="async" />
          {text("caption") && <figcaption>{text("caption")}</figcaption>}
        </figure>
      ) : (
        empty("选择图片", "image")
      );
      break;
    }
    case "core.button":
      body = (
        <Action label={text("label")} href={text("href")} preview={preview} />
      );
      break;
    case "core.icon": {
      const name = text("name");
      body = (
        <span
          className={styles.icon}
          aria-label={text("label") || undefined}
          role={text("label") ? "img" : undefined}
        >
          <Icon name={isBuiltinIcon(name) ? (name as IconName) : "star"} />
        </span>
      );
      break;
    }
    case "core.banner": {
      const url = imageUrl(text("image"), context);
      body = (
        <section className={styles.banner} data-image={Boolean(url)}>
          {url /* eslint-disable-next-line @next/next/no-img-element */ && (
            <img
              className={styles.bannerImage}
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
          <div className={styles.bannerBody}>
            {text("title") && <h2>{text("title")}</h2>}
            {text("text") && <p>{text("text")}</p>}
            <Action
              label={text("label")}
              href={text("href")}
              preview={preview}
            />
          </div>
        </section>
      );
      break;
    }
    case "core.comment":
      if (!preview) return null;
      body = (
        <div className={styles.comment}>
          <Icon name="comment" />
          {text("text") || <UiText text="编辑注释" />}
        </div>
      );
      break;
    case "core.comments":
      body = preview ? empty("读者评论", "comment") : context?.comments;
      break;
    case "core.divider":
      body = <hr className={styles.divider} />;
      break;
    case "core.spacer": {
      const height = props.height;
      body = (
        <div
          aria-hidden="true"
          style={{
            height:
              typeof height === "number"
                ? Math.max(4, Math.min(240, height))
                : 32,
          }}
        />
      );
      break;
    }
    default: {
      const registered =
        definition?.shortcode &&
        (pluginRegistry.shortcodes.find(
          (item) => item.definition.name === definition.shortcode,
        )?.definition ??
          context?.shortcodes?.find(
            (item) => item.name === definition.shortcode,
          ));
      if (registered) {
        const values = Object.fromEntries(
          registered.parameters.map((field) => [
            field.name,
            String(props[field.name] ?? field.default ?? ""),
          ]),
        );
        body = (
          <Source
            id={node.id}
            source={shortcodeCall(registered, values, text("body"))}
            format="markdown"
            context={context}
            preview={preview}
          />
        );
      } else if (definition?.component) {
        body = (
          <RuntimeComponent
            name={definition.component}
            nodeId={node.id}
            values={props}
            locale={locale}
            media={context?.media ?? {}}
            preview={Boolean(preview)}
          >
            {children}
          </RuntimeComponent>
        );
      } else {
        body = (
          <>
            {empty("组件当前不可用", "puzzle")}
            {children}
          </>
        );
      }
    }
  }
  return (
    <div
      className={styles.element}
      data-builder-node={node.type}
      style={builderStyle(props)}
    >
      {body}
    </div>
  );
}

export function BuilderContent({
  document,
  parameters,
  context,
  onReady,
  preview = false,
}: {
  document: BuilderDocument;
  parameters?: BuilderValues;
  context?: BuilderRenderContext;
  onReady?: () => void;
  preview?: boolean;
}) {
  const definitions = useBuilderComponents();
  const { loading } = usePluginRuntime();
  useEffect(() => {
    if (!loading) onReady?.();
  }, [loading, onReady]);
  const commentsId = builderEntries(document.nodes).find(
    (node) => node.type === "core.comments",
  )?.id;
  function render(nodes: BuilderNode[]): ReactNode {
    return nodes.map((node) => {
      if (node.type === "core.comments") {
        if (node.id !== commentsId || (!context?.comments && !preview))
          return null;
      }
      return (
        <BuilderElement
          key={node.id}
          node={node}
          definition={definitions.get(node.type)}
          parameters={parameters}
          context={context}
          preview={preview}
        >
          {node.children?.length ? render(node.children) : undefined}
        </BuilderElement>
      );
    });
  }
  return <div className={styles.content}>{render(document.nodes)}</div>;
}
