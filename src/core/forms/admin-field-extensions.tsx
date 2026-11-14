"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAdminPluginRuntime } from "@/core/plugins/runtime/context";
import { OptionalPluginBoundary } from "@/core/plugins/runtime/optional-component";
import { prepareAdminFormField } from "./admin-field-hooks";
import type {
  AdminFormFieldContext,
  AdminFormFieldView,
} from "./admin-field-types";

export function AdminFormFieldExtensions({
  field,
  view = {},
  children,
}: {
  field: AdminFormFieldContext;
  view?: AdminFormFieldView;
  children: (view: AdminFormFieldView, actions: ReactNode) => ReactNode;
}) {
  const { catalog, components, fieldHooks } = useAdminPluginRuntime();
  const latest = useRef<AdminFormFieldContext | null>(null);
  useEffect(() => {
    latest.current = field;
    return () => {
      latest.current = null;
    };
  }, [field]);
  const { resourceKey, scene, field: fieldName } = field;
  const apply = useCallback(
    (value: string) => {
      const current = latest.current;
      if (
        !current ||
        current.disabled ||
        current.resourceKey !== resourceKey ||
        current.scene !== scene ||
        current.field !== fieldName ||
        typeof value !== "string" ||
        (current.maxLength !== undefined && value.length > current.maxLength)
      )
        return false;
      return current.apply(value);
    },
    [resourceKey, scene, fieldName],
  );
  if (field.disabled || fieldHooks.length === 0) return children(view, null);
  const matches = fieldHooks.filter(
    (hook) => hook.scene === field.scene && hook.field === field.field,
  );
  const actions: ReactNode[] = [];
  for (const hook of matches) {
    if (hook.stage !== "render") continue;
    const Action = components.get(hook.pluginId)?.[hook.component];
    if (!Action) continue;
    const build = catalog?.plugins.find(
      (plugin) => plugin.id === hook.pluginId,
    )?.build;
    actions.push(
      <OptionalPluginBoundary
        key={JSON.stringify([hook.pluginId, hook.id, build, field.resourceKey])}
      >
        <FieldAction action={Action} field={field} apply={apply} />
      </OptionalPluginBoundary>,
    );
  }
  return children(
    prepareAdminFormField(field, view, matches),
    actions.length ? actions : null,
  );
}

function FieldAction({
  action,
  field,
  apply,
}: {
  action: React.ComponentType<Record<string, unknown>>;
  field: AdminFormFieldContext;
  apply: AdminFormFieldContext["apply"];
}) {
  return createElement(action, { field: { ...field, apply } });
}
