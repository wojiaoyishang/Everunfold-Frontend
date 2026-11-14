import type { PublicShortcode } from "@/core/contracts/settings";
import type { CustomPageDefinition } from "@/core/pages/registration";
import { collectCustomPages } from "@/core/pages/registration";
import type { FontDefinition } from "@/core/fonts/types";
import { createFontRegistry, defineFont } from "@/core/fonts/registry";
import { defineBuilderComponent } from "@/core/builder/registry";
import type { BuilderComponentDefinition } from "@/core/builder/types";
import { adminNavigationGroups } from "@/core/admin/navigation";
import { validPluginAdminEntryId } from "./admin-routes";
import type {
  PluginAdminMenuGroup,
  PluginAdminPage,
  RegisteredPluginAdminMenuGroup,
  RegisteredPluginAdminPage,
} from "./admin-page-types";
import type {
  AdminFormFieldHook,
  RegisteredAdminFormFieldHook,
} from "@/core/forms/admin-field-types";
import {
  compareAdminFormFieldHooks,
  validateAdminFormFieldHook,
} from "@/core/forms/admin-field-hooks";
import type {
  FrontendPlugin,
  PluginShortcode,
  RegisteredPluginShortcode,
} from "./types";

const identity = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const version = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;
const hostMenuGroups = new Set(adminNavigationGroups.map((group) => group.id));

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
  const builderComponents = new Map<string, BuilderComponentDefinition>();
  const adminFormFieldHooks: RegisteredAdminFormFieldHook[] = [];
  const adminPages: RegisteredPluginAdminPage[] = [];
  const adminMenuGroups: RegisteredPluginAdminMenuGroup[] = [];
  for (const plugin of plugins) {
    if (
      !identity.test(plugin.id) ||
      !version.test(plugin.version) ||
      (plugin.surface !== undefined && plugin.surface !== "admin") ||
      typeof plugin.setup !== "function" ||
      pluginIds.has(plugin.id)
    )
      throw new Error(`Invalid or duplicate frontend plugin: ${plugin.id}`);
    pluginIds.add(plugin.id);
    let collecting = true;
    const assertPublicContribution = () => {
      if (plugin.surface === "admin")
        throw new Error(
          `Admin-only plugins cannot register public contributions: ${plugin.id}`,
        );
    };
    const ownBuilderComponents: BuilderComponentDefinition[] = [];
    const ownFieldHooks = new Map<string, RegisteredAdminFormFieldHook>();
    const ownAdminPages = new Map<string, RegisteredPluginAdminPage>();
    const ownAdminGroups = new Map<string, RegisteredPluginAdminMenuGroup>();
    const assertAdminRegistration = (
      item: PluginAdminPage | PluginAdminMenuGroup,
      entries: ReadonlyMap<string, unknown>,
    ) => {
      if (!collecting)
        throw new Error(`Plugin setup has finished: ${plugin.id}`);
      if (
        plugin.surface !== "admin" ||
        typeof item?.id !== "string" ||
        !validPluginAdminEntryId(item.id) ||
        typeof item.label !== "string" ||
        !item.label.trim() ||
        item.label.length > 120 ||
        entries.has(item.id)
      )
        throw new Error(`Invalid or duplicate admin navigation: ${plugin.id}`);
    };
    const register = (shortcode: PluginShortcode) => {
      if (!collecting)
        throw new Error(`Plugin setup has finished: ${plugin.id}`);
      assertPublicContribution();
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
          adminPages: Object.freeze({
            register(page: PluginAdminPage) {
              assertAdminRegistration(page, ownAdminPages);
              if (
                typeof page.component !== "string" ||
                typeof page.permission !== "string" ||
                !/^[a-z][a-z_-]*:[a-z][a-z_-]*$/.test(page.permission) ||
                (page.menu &&
                  page.menu.order !== undefined &&
                  !Number.isSafeInteger(page.menu.order))
              )
                throw new Error(`Invalid admin page: ${plugin.id}.${page.id}`);
              ownAdminPages.set(
                page.id,
                Object.freeze({
                  ...page,
                  menu: page.menu ? Object.freeze({ ...page.menu }) : page.menu,
                  pluginId: plugin.id,
                }),
              );
            },
            registerGroup(group: PluginAdminMenuGroup) {
              assertAdminRegistration(group, ownAdminGroups);
              if (
                (group.order !== undefined &&
                  !Number.isSafeInteger(group.order)) ||
                (group.parent !== undefined &&
                  !hostMenuGroups.has(group.parent))
              )
                throw new Error(
                  `Invalid admin menu group: ${plugin.id}.${group.id}`,
                );
              ownAdminGroups.set(
                group.id,
                Object.freeze({ ...group, pluginId: plugin.id }),
              );
            },
          }),
          formFields: Object.freeze({
            register(hook: AdminFormFieldHook) {
              if (!collecting)
                throw new Error(`Plugin setup has finished: ${plugin.id}`);
              validateAdminFormFieldHook(hook);
              if (plugin.surface !== "admin" || ownFieldHooks.has(hook.id))
                throw new Error(
                  `Invalid or duplicate admin field hook: ${plugin.id}.${hook.id}`,
                );
              ownFieldHooks.set(
                hook.id,
                Object.freeze({
                  ...hook,
                  pluginId: plugin.id,
                  priority: hook.priority ?? 100,
                }),
              );
            },
          }),
          builder: Object.freeze({
            register(definition: BuilderComponentDefinition) {
              if (!collecting)
                throw new Error(`Plugin setup has finished: ${plugin.id}`);
              assertPublicContribution();
              if (
                !definition.type.startsWith(plugin.id + ".") ||
                builderComponents.has(definition.type) ||
                Boolean(definition.component) === Boolean(definition.shortcode)
              )
                throw new Error(
                  `Invalid plugin builder component: ${definition.type}`,
                );
              const registered = defineBuilderComponent(definition);
              builderComponents.set(registered.type, registered);
              ownBuilderComponents.push(registered);
            },
          }),
          fonts: Object.freeze({
            register(font: FontDefinition) {
              if (!collecting)
                throw new Error(`Plugin setup has finished: ${plugin.id}`);
              assertPublicContribution();
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
              assertPublicContribution();
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
    for (const hook of ownFieldHooks.values()) {
      if (
        hook.stage === "render" &&
        components.get(hook.component) !== plugin.id
      )
        throw new Error(
          `Field hook renderer must be registered by its plugin: ${hook.id}`,
        );
      adminFormFieldHooks.push(hook);
    }
    for (const page of ownAdminPages.values()) {
      if (components.get(page.component) !== plugin.id)
        throw new Error(
          `Admin page renderer must be registered by its plugin: ${page.id}`,
        );
      const group = page.menu ? page.menu.group : undefined;
      if (
        group !== undefined &&
        !ownAdminGroups.has(group) &&
        !hostMenuGroups.has(group)
      )
        throw new Error(`Unknown admin page group: ${plugin.id}.${page.id}`);
      adminPages.push(page);
    }
    adminMenuGroups.push(...ownAdminGroups.values());
    for (const definition of ownBuilderComponents) {
      if (
        definition.component &&
        components.get(definition.component) !== plugin.id
      )
        throw new Error(
          `Builder renderer must be registered by its plugin: ${definition.type}`,
        );
      if (
        definition.shortcode &&
        !contributions.some(
          (item) =>
            item.pluginId === plugin.id &&
            item.definition.name === definition.shortcode,
        )
      )
        throw new Error(
          `Builder shortcode must be registered by its plugin: ${definition.type}`,
        );
    }
  }
  const shortcodes = Object.freeze(contributions);
  collectCustomPages(pages);
  const byName = new Map(
    shortcodes.map((item) => [item.definition.name, item]),
  );
  return Object.freeze({
    fonts: createFontRegistry(fonts).all,
    builderComponents: Object.freeze([...builderComponents.values()]),
    adminFormFieldHooks: Object.freeze(
      adminFormFieldHooks.sort(compareAdminFormFieldHooks),
    ),
    adminPages: Object.freeze(adminPages),
    adminMenuGroups: Object.freeze(adminMenuGroups),
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
