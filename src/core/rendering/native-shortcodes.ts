import type { PublicShortcode } from "@/core/contracts/settings";
import type { Content } from "@/core/content/types";
import {
  parseShortcodes,
  type ShortcodeNode,
  type ShortcodeDiagnostic,
} from "@/core/shortcodes/parser";
import { shortcodeDefinitions } from "@/core/shortcodes/registry";
import { pluginRegistry } from "@/core/plugins/registry";

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

export function renderNativeShortcodes(
  source: string,
  isMarkdown: boolean,
  custom: readonly PublicShortcode[],
  format: (source: string) => string,
  media: Content["media_urls"] = {},
  preview = false,
) {
  const definitions = new Map(
    shortcodeDefinitions(custom).map((item) => [item.name, item]),
  );
  const parsed = parseShortcodes(source, [...definitions.values()], isMarkdown);
  const diagnostics: ShortcodeDiagnostic[] = [...parsed.diagnostics];
  const css = new Map<string, string>(),
    mediaURLs: Record<string, string> = {};
  let prefix = "ef-shortcode-hole";
  while (source.includes(prefix)) prefix += "x";
  let counter = 0;
  const render = (from: number, to: number, nodes: ShortcodeNode[]): string => {
    let cursor = from,
      text = "";
    const holes = new Map<string, string>();
    for (const node of nodes) {
      text += source.slice(cursor, node.from);
      cursor = node.to;
      const definition = definitions.get(node.name)!;
      try {
        if (node.error) throw new Error(node.error);
        const body =
          definition.kind === "container"
            ? render(node.bodyFrom, node.bodyTo, node.children)
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
        const key = `<!--${prefix}-${counter++}-->`;
        holes.set(
          key,
          `<div class="ef-shortcode"><div class="${definition.scope}">${html}</div></div>`,
        );
        text += key;
      } catch (error) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          message: error instanceof Error ? error.message : "短代码无法渲染",
        });
        text += source.slice(node.from, node.to);
      }
    }
    text += source.slice(cursor, to);
    let html = format(text);
    for (const [key, value] of holes)
      html = html.replaceAll(`<p>${key}</p>`, value).replaceAll(key, value);
    return html;
  };
  const html = render(0, source.length, parsed.nodes);
  return { html, css: [...css.values()].join("\n"), mediaURLs, diagnostics };
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
