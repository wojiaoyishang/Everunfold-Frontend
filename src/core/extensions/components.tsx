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
import { themeModules } from "./discovered";
import { RuntimeComponent } from "@/core/plugins/runtime/view";
import { themeRegistry as themes } from "./themes";
import { ExtensionPlaceholder } from "@/themes/argon/components/extension-placeholder";
import { ThemeContext } from "./theme-context";
export { useThemeId } from "./theme-context";

type UIComponent = ComponentType<Record<string, unknown>>;
type ComponentModule = { default: Record<string, UIComponent> };
const modules = {
  ...import.meta.glob<ComponentModule>("/src/themes/*/components.tsx"),
};
const ImplementationThemeContext = createContext<string | null>(null);
const cache = new Map<string, UIComponent>();

export function ThemeComponentsProvider({
  theme,
  children,
}: {
  theme: string;
  children: ReactNode;
}) {
  themes.chain(theme);
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
  {
    name: string;
    children: ReactNode;
    inherited?: ReactNode;
    onReady?: unknown;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <>
        <Missing name={this.props.name} />
        {this.props.inherited}
        <Ready callback={this.props.onReady} />
      </>
    ) : (
      this.props.children
    );
  }
}

function componentPath(name: string, theme: string) {
  const selected = themes.owner(theme, name);
  if (selected)
    return {
      owner: selected,
      path: Object.entries(themeModules)
        .find(([, value]) => value.id === selected)?.[0]
        .replace(/theme\.ts$/, "components.tsx"),
    };
  return { owner: null, path: undefined };
}

function MissingAdapter(props: Record<string, unknown>) {
  return (
    <>
      <Missing name={String(props.componentName ?? "unknown")} />
      {props.children as ReactNode}
      {props.notifyReady === false && <Ready callback={props.onReady} />}
    </>
  );
}
function prepareComponent(name: string, theme: string): UIComponent {
  const { path, owner } = componentPath(name, theme);
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
      <ComponentBoundary
        name={name}
        inherited={props.children as ReactNode}
        onReady={props.onReady}
      >
        <Suspense fallback={<ExtensionPlaceholder name={name} loading />}>
          <ImplementationThemeContext.Provider value={owner}>
            {createElement(Impl, { ...props, componentName: name })}
          </ImplementationThemeContext.Provider>
          <Ready
            callback={props.notifyReady === false ? undefined : props.onReady}
          />
        </Suspense>
      </ComponentBoundary>
    );
  };
}
const names = new Set([
  ...themes.all.flatMap((theme) => [
    ...(theme.components ?? []),
    ...Object.values(theme.templates ?? {}),
    ...Object.values(theme.slots ?? {}).flatMap((slot) =>
      slot === false ? [] : slot,
    ),
  ]),
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
  return renderThemeComponent(theme, name, props);
}

export function renderThemeComponent(
  theme: string,
  name: string,
  props: Record<string, unknown>,
): ReactNode {
  const owned = themes.owner(theme, name);
  if (!owned) return <RuntimeComponent name={name} {...props} />;
  const component = cache.get(`${theme}:${name}`);
  if (!component)
    return (
      <>
        <MissingAdapter componentName={name} {...props} />
        <Ready
          callback={props.notifyReady === false ? undefined : props.onReady}
        />
      </>
    );
  return createElement(component, { componentName: name, ...props });
}

export function ExtensionComponent({
  name,
  ...props
}: { name: string } & Record<string, unknown>) {
  return useThemeComponent(name, props);
}

/** Start above the implementation being rendered, even in multi-level inheritance. */
export function ParentThemeComponent({
  name,
  ...props
}: { name: string } & Record<string, unknown>) {
  const owner = useContext(ImplementationThemeContext);
  const parent = owner ? themes.get(owner)?.parent : null;
  return parent ? (
    renderThemeComponent(parent, name, props)
  ) : (
    <MissingAdapter componentName={name} {...props} />
  );
}
