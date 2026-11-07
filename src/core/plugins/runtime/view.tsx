"use client";
import { Component, createElement, useEffect, type ReactNode } from "react";
import { usePluginRuntime } from "./context";
import { ExtensionPlaceholder } from "@/themes/argon/components/extension-placeholder";
class RuntimeBoundary extends Component<
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
        <ExtensionPlaceholder name={this.props.name} />
        {this.props.inherited}
        <Ready callback={this.props.onReady} />
      </>
    ) : (
      this.props.children
    );
  }
}
function Ready({ callback }: { callback: unknown }) {
  useEffect(() => {
    if (typeof callback === "function") callback();
  }, [callback]);
  return null;
}
export function RuntimeComponent({
  name,
  ...props
}: { name: string } & Record<string, unknown>) {
  const { catalog, components, loading } = usePluginRuntime();
  const owner = catalog?.plugins.find(
    (plugin) =>
      plugin.components.includes(name) && !catalog.disabled.includes(plugin.id),
  );
  const implementation = owner ? components.get(owner.id)?.[name] : undefined;
  const callback = props.notifyReady === false ? undefined : props.onReady;
  return (
    <RuntimeBoundary
      key={`${owner?.id ?? "missing"}:${name}`}
      name={name}
      inherited={props.children as ReactNode}
      onReady={props.onReady}
    >
      {implementation ? (
        <>
          {createElement(implementation, props)}
          <Ready callback={callback} />
        </>
      ) : (
        <>
          <ExtensionPlaceholder
            name={name}
            loading={Boolean(owner && loading)}
          />
          {props.children as ReactNode}
          {!loading && <Ready callback={props.onReady} />}
        </>
      )}
    </RuntimeBoundary>
  );
}
