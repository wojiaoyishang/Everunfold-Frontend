import type { PublicShortcode } from "@/core/contracts/settings";
import type { CustomPageDefinition } from "@/core/pages/registration";
import { collectCustomPages } from "@/core/pages/registration";
import type { FontDefinition } from "@/core/fonts/types";
import { createFontRegistry, defineFont } from "@/core/fonts/registry";
import type {
  FrontendPlugin,
  PluginShortcode,
  RegisteredPluginShortcode,
} from "./types";

const identity = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const version = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;

/** Build a fresh registry atomically; setup may only contribute synchronously. */
export function createPluginRegistry(
  plugins: readonly FrontendPlugin[],
  reserved: readonly Pick<PublicShortcode, "id" | "name">[] = [],
) {
  const pluginIds = new Set<string>();
  const ids = new Set(reserved.map((item) => item.id));
  const names = new Set(reserved.map((item) => item.name));
  const contributions: RegisteredPluginShortcode[] = [];
  const pages: (CustomPageDefinition & { pluginId: string })[] = [];
  const components = new Map<string, string>();
  const fonts: FontDefinition[] = [];
  for (const plugin of plugins) {
    if (
      !identity.test(plugin.id) ||
      !version.test(plugin.version) ||
      typeof plugin.setup !== "function" ||
      pluginIds.has(plugin.id)
    )
      throw new Error(`Invalid or duplicate frontend plugin: ${plugin.id}`);
    pluginIds.add(plugin.id);
    let collecting = true;
    const register = (shortcode: PluginShortcode) => {
      if (!collecting)
        throw new Error(`Plugin setup has finished: ${plugin.id}`);
      const d = shortcode.definition;
      if (
        !uuid.test(d.id) ||
        !/^[a-z][a-z0-9-]{0,47}(?::[a-z][a-z0-9-]{0,47})?$/.test(d.name) ||
        d.name.startsWith("custom:") ||
        !["leaf", "container"].includes(d.kind) ||
        !d.title.trim() ||
        !Number.isInteger(d.revision) ||
        d.revision < 1 ||
        d.scope !== "ef-sc-" + d.id.replaceAll("-", "") ||
        typeof shortcode.render !== "function" ||
        /<\/style/i.test(d.css) ||
        ids.has(d.id) ||
        names.has(d.name)
      )
        throw new Error(`Invalid or duplicate plugin shortcode: ${d.name}`);
      const parameters = new Set(d.parameters.map((item) => item.name));
      if (
        parameters.size !== d.parameters.length ||
        d.parameters.length > 16 ||
        d.parameters.some(
          (item) => !/^[a-z][a-z0-9_]{0,31}$/.test(item.name),
        ) ||
        shortcode.classNames?.some(
          (name) => !/^[a-zA-Z_][a-zA-Z0-9_-]{0,95}$/.test(name),
        ) ||
        (shortcode.mediaPicker &&
          (!parameters.has(shortcode.mediaPicker.parameter) ||
            shortcode.mediaPicker.kind !== "image" ||
            !Number.isInteger(shortcode.mediaPicker.limit) ||
            shortcode.mediaPicker.limit < 1 ||
            shortcode.mediaPicker.limit > 24))
      )
        throw new Error(`Invalid plugin shortcode options: ${d.name}`);
      ids.add(d.id);
      names.add(d.name);
      contributions.push(
        Object.freeze({
          ...shortcode,
          definition: Object.freeze(structuredClone(d)),
          classNames: Object.freeze([...(shortcode.classNames ?? [])]),
          mediaPicker: shortcode.mediaPicker
            ? Object.freeze({ ...shortcode.mediaPicker })
            : undefined,
          pluginId: plugin.id,
          pluginVersion: plugin.version,
        }),
      );
    };
    try {
      const result: unknown = plugin.setup(
        Object.freeze({
          shortcodes: Object.freeze({ register }),
          fonts: Object.freeze({
            register(font: FontDefinition) {
              if (!collecting)
                throw new Error(`Plugin setup has finished: ${plugin.id}`);
              if (!font.id.startsWith(plugin.id + "."))
                throw new Error(
                  `Font must use its plugin namespace: ${plugin.id}`,
                );
              fonts.push(defineFont(font));
            },
          }),
          pages: Object.freeze({
            register(page: CustomPageDefinition) {
              if (!collecting)
                throw new Error(`Plugin setup has finished: ${plugin.id}`);
              if (!page.component)
                throw new Error(
                  `Page component name required: ${page.registration.id}`,
                );
              pages.push({ ...page, pluginId: plugin.id });
            },
          }),
          components: Object.freeze({
            register(name: string) {
              if (!collecting)
                throw new Error(`Plugin setup has finished: ${plugin.id}`);
              if (
                !/^[a-zA-Z][a-zA-Z0-9_.:-]{0,127}$/.test(name) ||
                components.has(name)
              )
                throw new Error(
                  `Duplicate or invalid plugin component: ${name}`,
                );
              components.set(name, plugin.id);
            },
          }),
        }),
      );
      if (result !== undefined) {
        if (result instanceof Promise) void result.catch(() => {});
        throw new Error(`Plugin setup must be synchronous: ${plugin.id}`);
      }
    } finally {
      collecting = false;
    }
  }
  const shortcodes = Object.freeze(contributions);
  collectCustomPages(pages);
  const byName = new Map(
    shortcodes.map((item) => [item.definition.name, item]),
  );
  return Object.freeze({
    fonts: createFontRegistry(fonts).all,
    shortcodes,
    pages: Object.freeze(pages),
    componentNames: Object.freeze([...components.keys()]),
    componentOwner: (name: string) => components.get(name),
    classNames: Object.freeze([
      ...new Set(shortcodes.flatMap((item) => item.classNames ?? [])),
    ]),
    shortcode: (definition: Pick<PublicShortcode, "id" | "name">) => {
      const item = byName.get(definition.name);
      return item?.definition.id === definition.id ? item : undefined;
    },
  });
}
