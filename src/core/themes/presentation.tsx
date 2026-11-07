"use client";
import type { ReactNode } from "react";
import {
  renderThemeComponent,
  ThemeComponentsProvider,
  useThemeId,
} from "@/core/extensions/components";
import { themeRegistry } from "@/core/extensions/themes";
import { themeModules } from "@/core/extensions/discovered";
import { templateTargets } from "./targets";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import type {
  ThemeTemplateProps,
  ThemeViewContext,
} from "@/core/extensions/types";

const styles = import.meta.glob<{ default: string }>(
  "/src/themes/*/styles.ts",
  { eager: true },
);
const styleById = new Map(
  Object.entries(themeModules).map(([path, theme]) => [
    theme.id,
    styles[path.replace(/theme\.ts$/, "styles.ts")]?.default,
  ]),
);

/** CSS is emitted only for this public tree, in the same order as the inheritance chain. */
export function PublicTheme({
  theme,
  children,
  followActive = true,
}: {
  followActive?: boolean;
  theme: string;
  children: ReactNode;
}) {
  const runtime = usePluginRuntime();
  theme = (followActive && runtime.catalog?.theme) || theme;
  const chain = themeRegistry.chain(theme);
  return (
    <ThemeComponentsProvider theme={theme}>
      <div
        className="public-theme"
        data-public-theme={theme}
        data-theme-chain={chain.map((item) => item.id).join(" ")}
      >
        {[...chain]
          .reverse()
          .filter((item) => item.styles)
          .map((item) => (
            <style
              key={item.id}
              data-theme-style={item.id}
              dangerouslySetInnerHTML={{ __html: styleById.get(item.id) ?? "" }}
            />
          ))}
        {children}
      </div>
    </ThemeComponentsProvider>
  );
}

/** Each child receives the fully rendered parent as children; wrappers need no copied template. */
export function ThemeTemplate({
  name,
  context,
  children,
  onReady,
}: ThemeTemplateProps & { name: string }) {
  const theme = useThemeId();
  const layers = themeRegistry.templates(theme, name, templateTargets(context));
  let output = children;
  for (const layer of layers)
    output = renderThemeComponent(layer.theme, layer.component, {
      context,
      children: output,
      onReady,
      notifyReady: false,
    });
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

export function ThemeSlot({
  name,
  context = {},
}: {
  name: string;
  context?: ThemeViewContext;
}) {
  const theme = useThemeId();
  const slots = themeRegistry.slots(theme, name);
  if (!slots.length) return null;
  return (
    <div className="theme-slot" data-theme-slot={name}>
      {slots.map((slot) => (
        <SlotEntry
          key={`${slot.theme}:${slot.component}`}
          theme={theme}
          component={slot.component}
          context={context}
        />
      ))}
    </div>
  );
}
function SlotEntry({
  theme,
  component,
  context,
}: {
  theme: string;
  component: string;
  context: ThemeViewContext;
}) {
  return renderThemeComponent(theme, component, { context });
}
