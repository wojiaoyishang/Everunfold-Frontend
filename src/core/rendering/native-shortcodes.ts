import type { PublicShortcode } from "@/core/contracts/settings";
import type { Content } from "@/core/content/types";
import {
  parseShortcodes,
  type ShortcodeNode,
  type ShortcodeDiagnostic,
} from "@/core/shortcodes/parser";
import {
  regionKind,
  shortcodeDefinitions,
  shortcodeSyntax,
} from "@/core/shortcodes/registry";
import { pluginRegistry } from "@/core/plugins/registry";
import {
  glossaryPopupAttribute,
  glossaryPopupName,
  glossaryShortcode,
  glossaryTriggerMarkup,
  validGlossarySlug,
  type GlossaryPopup,
} from "@/core/shortcodes/glossary";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
function safeURL(value: string) {
  if (/[\u0000-\u001f\\]/.test(value) || value.startsWith("//")) return false;
  if (/^site:\/\/media\/[0-9a-f-]{36}$/.test(value)) return true;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:", "mailto:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function values(
  definition: PublicShortcode,
  attributes: Record<string, string>,
) {
  const names = new Set(
    definition.parameters.map((parameter) => parameter.name),
  );
  if (Object.keys(attributes).some((name) => !names.has(name)))
    throw new Error("存在未定义的参数");
  const result: Record<string, string> = {};
  for (const parameter of definition.parameters) {
    const value = attributes[parameter.name] ?? parameter.default ?? "";
    if (value.length > 1000 || (parameter.required && !value.trim()))
      throw new Error(`请填写${parameter.label}`);
    if (parameter.type === "select" && !parameter.options?.includes(value))
      throw new Error(`${parameter.label}不在可选范围`);
    if (parameter.type === "boolean" && !["true", "false"].includes(value))
      throw new Error(`${parameter.label}需要 true 或 false`);
    if (
      parameter.type === "number" &&
      (!value.trim() || !Number.isFinite(Number(value)))
    )
      throw new Error(`${parameter.label}需要有限数字`);
    if (parameter.type === "url" && value && !safeURL(value))
      throw new Error(`${parameter.label}需要有效的链接`);
    result[parameter.name] = value;
  }
  return result;
}

function visibleShortcodeSource(source: string, root: ShortcodeNode) {
  const pending = [root];
  const omitted: [number, number][] = [];
  while (pending.length) {
    const node = pending.pop()!;
    if (regionKind(node.name) || node.name === glossaryPopupName)
      omitted.push([node.from, node.to]);
    else {
      omitted.push([node.from, node.bodyFrom], [node.bodyTo, node.to]);
      for (const child of node.children) pending.push(child);
    }
  }
  let at = root.from;
  let text = "";
  for (const [from, to] of omitted.sort(([left], [right]) => left - right)) {
    text += source.slice(at, from);
    at = to;
  }
  return text + source.slice(at, root.to);
}

export function renderNativeShortcodes(
  source: string,
  isMarkdown: boolean,
  custom: readonly PublicShortcode[],
  format: (source: string) => string,
  media: Content["media_urls"] = {},
  preview = false,
  instancePrefix = "ef-shortcode-hole",
  options: {
    maxDepth?: number;
    formatMarkdown?: (source: string) => string;
  } = {},
) {
  const definitions = new Map(
    shortcodeDefinitions(custom).map((item) => [item.name, item]),
  );
  // Recognize the saved marker protocol even with an older replicated settings snapshot.
  const parsed = parseShortcodes(
    source,
    shortcodeSyntax([...definitions.values()]),
    isMarkdown,
    options.maxDepth,
  );
  const diagnostics: ShortcodeDiagnostic[] = [...parsed.diagnostics];
  const css = new Map<string, string>(),
    mediaURLs: Record<string, string> = {};
  const scripts = new Map<
    string,
    { javascript: string; title: string; css: string }
  >();
  const popups = new Map<string, GlossaryPopup>();
  let prefix = instancePrefix;
  while (source.includes(prefix)) prefix += "x";
  let counter = 0;
  const render = (
    from: number,
    to: number,
    nodes: ShortcodeNode[],
    markdown: boolean,
    omitted?: ShortcodeNode,
  ): string => {
    let cursor = from,
      text = "";
    const holes = new Map<string, { html: string; inline?: boolean }>();
    for (const node of nodes) {
      text += source.slice(cursor, node.from);
      cursor = node.to;
      if (node === omitted) continue;
      try {
        if (node.overLimit) {
          text += visibleShortcodeSource(source, node);
          continue;
        }
        if (regionKind(node.name)) {
          const id = node.attributes.region;
          const label =
            node.name === "reply-only" ? "回复可见区域" : "密码保护区域";
          const key = `<!--${prefix}-${counter++}-->`;
          const region =
            !preview &&
            /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id ?? "")
              ? ` data-shortcode-region="${id}" data-shortcode-region-kind="${node.name}"`
              : "";
          holes.set(key, {
            html: `<div class="ef-shortcode-region"${region}><p>${label}</p></div>`,
          });
          text += key;
          continue;
        }
        if (node.name === glossaryPopupName)
          throw new Error("弹窗内容区须直接放在术语弹窗中");
        const definition = definitions.get(node.name)!;
        if (node.error) throw new Error(node.error);
        if (definition.id === glossaryShortcode.id) {
          const params = values(definition, node.attributes);
          const slots = node.children.filter(
            (child) => child.name === glossaryPopupName,
          );
          const slot = slots[0];
          const slug = params.term.trim();
          const title = params.title.trim();
          const explanation = params.text.trim();
          const modeCount =
            Number(Boolean(slug)) + Number(Boolean(explanation)) + slots.length;
          if ((!preview || modeCount) && modeCount !== 1)
            throw new Error("请选择一种弹窗内容：词条、纯文本或弹窗内容区");
          if (slug && !validGlossarySlug(slug))
            throw new Error("词条路径片段无效");
          if (
            slot &&
            (slot.error ||
              Object.keys(slot.attributes).some((name) => name !== "format") ||
              (slot.attributes.format !== undefined &&
                !["html", "markdown"].includes(slot.attributes.format)))
          )
            throw new Error("弹窗内容区只支持 html 或 markdown 格式");
          if (slot && !source.slice(slot.bodyFrom, slot.bodyTo).trim())
            throw new Error("请填写弹窗内容");

          const bodyHtml = render(
            node.bodyFrom,
            node.bodyTo,
            node.children,
            markdown,
            slot,
          );
          const { content, inline } = glossaryTriggerMarkup(bodyHtml, markdown);
          if (!content.trim()) throw new Error("请填写术语触发文字");
          const instance = `${prefix}-${counter++}`;
          const key = inline
            ? `<span data-ef-shortcode-hole="${instance}"></span>`
            : `<!--${instance}-->`;
          const tag = inline ? "span" : "div";
          const enabled = !slot?.overLimit;
          if (enabled) {
            popups.set(
              instance,
              slug
                ? { kind: "term", slug }
                : slot
                  ? {
                      kind: "markup",
                      title,
                      html: render(
                        slot.bodyFrom,
                        slot.bodyTo,
                        slot.children,
                        slot.attributes.format === undefined
                          ? markdown
                          : slot.attributes.format === "markdown",
                      ),
                    }
                  : {
                      kind: "text",
                      title,
                      text: explanation || "按年份查阅已发布的日记。",
                    },
            );
          }
          holes.set(key, {
            html: enabled
              ? `<${tag} ${glossaryPopupAttribute}="${instance}">${content}</${tag}>`
              : content,
            inline,
          });
          text += key;
          continue;
        }
        const body =
          definition.kind === "container"
            ? render(node.bodyFrom, node.bodyTo, node.children, markdown)
            : "";
        const plugin = custom.some((item) => item.id === definition.id)
          ? undefined
          : pluginRegistry.shortcode(definition);
        const sample = preview
          ? plugin?.preview?.({
              parameters: node.attributes,
              body,
              media,
              escape,
            })
          : null;
        const params =
          sample == null
            ? values(definition, node.attributes)
            : node.attributes;
        const html =
          sample ??
          (plugin
            ? plugin.render({ parameters: params, body, media, escape })
            : definition.html.replace(
                /{{([a-z][a-z0-9_]*)}}/g,
                (_, name: string) =>
                  name === "content" ? body : escape(params[name] ?? ""),
              ));
        if (definition.css) css.set(definition.id, definition.css);
        Object.assign(mediaURLs, definition.media_urls);
        const instance = `${prefix}-${counter++}`;
        const key = `<!--${instance}-->`;
        const javascript = (
          definition as PublicShortcode & { javascript?: string }
        ).javascript;
        if (javascript)
          scripts.set(instance, {
            javascript,
            title: definition.title,
            css: definition.css,
          });
        holes.set(key, {
          html: `<div class="ef-shortcode"${javascript ? ` data-shortcode-instance="${instance}"` : ""}><div class="${definition.scope}">${html}</div></div>`,
        });
        text += key;
      } catch (error) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          message: error instanceof Error ? error.message : "短代码无法渲染",
        });
        text +=
          node.name === glossaryShortcode.name ||
          node.name === glossaryPopupName
            ? visibleShortcodeSource(source, node)
            : source.slice(node.from, node.to);
      }
    }
    text += source.slice(cursor, to);
    let html = markdown
      ? (options.formatMarkdown ?? format)(text)
      : isMarkdown
        ? text
        : format(text);
    for (const [key, value] of holes) {
      if (!value.inline)
        html = html.replaceAll(`<p>${key}</p>`, () => value.html);
      html = html.replaceAll(key, () => value.html);
    }
    return html;
  };
  const html = render(0, source.length, parsed.nodes, isMarkdown);
  return {
    html,
    css: [...css.values()].join("\n"),
    mediaURLs,
    diagnostics,
    scripts,
    popups,
    hasShortcodes: counter > 0,
  };
}

/** Excerpts recognize only the new delimiter; old bracketed text is ordinary authored text. */
export function shortcodeExcerpt(text: string) {
  return text
    .replace(
      /{{<\s*\/?[a-z][a-z0-9:-]*(?:\s+(?:[^"'>]|"(?:[^"\\]|\\.)*")*)?\s*>}}/g,
      "",
    )
    .trim();
}
