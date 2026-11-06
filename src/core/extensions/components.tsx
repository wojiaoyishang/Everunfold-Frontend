"use client";
import {
  Component,
  Suspense,
  createContext,
  createElement,
  lazy,
  useContext,
  useEffect,
  type ComponentType,
  type ReactNode,
} from "react";
import { pluginModules, themeModules } from "./discovered";
import { pluginRegistry } from "@/core/plugins/registry";
import { collectThemes } from "./component-descriptors";
import { ExtensionPlaceholder } from "@/themes/argon/components/extension-placeholder";

type UIComponent = ComponentType<Record<string, unknown>>;
type ComponentModule = { default: Record<string, UIComponent> };
const modules = {
  ...import.meta.glob<ComponentModule>("/src/plugins/*/components.tsx"),
  ...import.meta.glob<ComponentModule>("/src/themes/*/components.tsx"),
};
const themes = collectThemes(Object.values(themeModules));
const ThemeContext = createContext("argon");
const cache = new Map<string, UIComponent>();

export function ThemeComponentsProvider({
  theme,
  children,
}: {
  theme: string;
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

function Missing({ name }: { name: string }) {
  return <ExtensionPlaceholder name={name} />;
}
function Ready({ callback }: { callback: unknown }) {
  useEffect(() => {
    if (typeof callback === "function") callback();
  }, [callback]);
  return null;
}

class ComponentBoundary extends Component<
  { name: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Missing name={this.props.name} />
    ) : (
      this.props.children
    );
  }
}

function componentPath(name: string, theme: string) {
  const selected = themes.get(theme)?.components.includes(name)
    ? theme
    : themes.get("argon")?.components.includes(name)
      ? "argon"
      : null;
  if (selected)
    return Object.entries(themeModules)
      .find(([, value]) => value.id === selected)?.[0]
      .replace(/theme\.ts$/, "components.tsx");
  const owner = pluginRegistry.componentOwner(name);
  return Object.entries(pluginModules)
    .find(([, value]) => value.id === owner)?.[0]
    .replace(/plugin\.ts$/, "components.tsx");
}

function MissingAdapter(props: Record<string, unknown>) {
  return (
    <>
      <Missing name={String(props.componentName ?? "unknown")} />
      <Ready callback={props.onReady} />
    </>
  );
}
function prepareComponent(name: string, theme: string): UIComponent {
  const path = componentPath(name, theme);
  const load = path ? modules[path] : undefined;
  const Impl = load
    ? lazy(async () => {
        const source = await load();
        const component =
          source.default && Object.hasOwn(source.default, name)
            ? source.default[name]
            : undefined;
        return {
          default:
            typeof component === "function" ||
            (component && typeof component === "object")
              ? component
              : MissingAdapter,
        };
      })
    : MissingAdapter;
  return function RegisteredComponent(props) {
    return (
      <ComponentBoundary name={name}>
        <Suspense fallback={<ExtensionPlaceholder name={name} loading />}>
          {createElement(Impl, { ...props, componentName: name })}
          <Ready callback={props.onReady} />
        </Suspense>
      </ComponentBoundary>
    );
  };
}
const names = new Set([
  ...themes.all.flatMap((theme) => theme.components),
  ...pluginRegistry.componentNames,
]);
for (const theme of themes.all)
  for (const name of names)
    cache.set(`${theme.id}:${name}`, prepareComponent(name, theme.id));

/** Identity is prepared at module load, so editing values never remounts controls. */
export function useThemeComponent(
  name: string,
  props: Record<string, unknown> = {},
): ReactNode {
  const theme = useContext(ThemeContext);
  const component =
    cache.get(`${theme}:${name}`) ??
    cache.get(`argon:${name}`) ??
    MissingAdapter;
  return createElement(component, { componentName: name, ...props });
}

export function ExtensionComponent({
  name,
  ...props
}: { name: string } & Record<string, unknown>) {
  return useThemeComponent(name, props);
}
