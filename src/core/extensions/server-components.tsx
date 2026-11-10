import { createElement, type ComponentType, type ReactNode } from "react";
import { ExtensionPlaceholder } from "@/themes/argon/components/extension-placeholder";
import { templateTargets } from "@/core/themes/targets";
import { themeModules } from "./discovered";
import { themeRegistry } from "./themes";
import type { ThemeTemplateProps, ThemeViewContext } from "./types";

type UIComponent = ComponentType<Record<string, unknown>>;
type ComponentModule = { default: Record<string, UIComponent> };

const modules = import.meta.glob<ComponentModule>(
  "/src/themes/*/components.tsx",
  { eager: true },
);

function implementation(theme: string, name: string) {
  const owner = themeRegistry.owner(theme, name);
  if (!owner) return { owner: null, component: null };
  const path = Object.entries(themeModules)
    .find(([, value]) => value.id === owner)?.[0]
    .replace(/theme\.ts$/, "components.tsx");
  const candidate = path ? modules[path]?.default[name] : undefined;
  return {
    owner,
    component:
      typeof candidate === "function" ||
      (candidate && typeof candidate === "object")
        ? candidate
        : null,
  };
}

/**
 * Resolve static public surfaces before a client boundary is created.
 * This keeps article source blocks and rendered HTML out of serialized props.
 */
export function ServerThemeComponent({
  theme,
  name,
  ...props
}: { theme: string; name: string } & Record<string, unknown>) {
  const resolved = implementation(theme, name);
  if (!resolved.component)
    return (
      <>
        <ExtensionPlaceholder name={name} />
        {props.children as ReactNode}
      </>
    );
  return createElement(resolved.component, {
    ...props,
    theme,
    componentName: name,
  });
}

/** Server-side equivalent of ThemeTemplate for content whose markup must remain static. */
export function ServerThemeTemplate({
  theme,
  name,
  context,
  children,
}: ThemeTemplateProps & { theme: string; name: string }) {
  const layers = themeRegistry.templates(theme, name, templateTargets(context));
  let output = children;
  for (const layer of layers)
    output = (
      <ServerThemeComponent
        theme={layer.theme}
        name={layer.component}
        context={context}
      >
        {output}
      </ServerThemeComponent>
    );
  return (
    <div
      className="theme-template"
      style={{ display: "contents" }}
      data-theme-template={name}
      data-theme-content={context.content?.id}
      data-theme-page={context.page?.implementation_id ?? context.page?.id}
      data-theme-page-instance={context.page?.id}
    >
      {output}
    </div>
  );
}

export function ServerThemeSlot({
  theme,
  name,
  context = {},
}: {
  theme: string;
  name: string;
  context?: ThemeViewContext;
}) {
  const slots = themeRegistry.slots(theme, name);
  if (!slots.length) return null;
  return (
    <div className="theme-slot" data-theme-slot={name}>
      {slots.map((slot) => (
        <ServerThemeComponent
          key={`${slot.theme}:${slot.component}`}
          theme={slot.theme}
          name={slot.component}
          context={context}
        />
      ))}
    </div>
  );
}
