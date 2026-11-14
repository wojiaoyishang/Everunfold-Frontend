"use client";

import { createElement, type ComponentType } from "react";
import type { PluginAdminSettingsProps } from "@/core/forms/admin-field-types";
import { useAdminPluginRuntime } from "./runtime/context";

function usePluginAdminSettings(pluginId: string) {
  const { catalog, components } = useAdminPluginRuntime();
  const name = `${pluginId}.settings`;
  const plugin = catalog?.plugins.find((item) => item.id === pluginId);
  if (
    !plugin?.components.includes(name) ||
    catalog?.disabled.includes(pluginId)
  )
    return null;
  return (
    (components.get(pluginId)?.[name] as
      ComponentType<PluginAdminSettingsProps> | undefined) ?? null
  );
}

export function useHasPluginAdminSettings(pluginId: string) {
  return Boolean(usePluginAdminSettings(pluginId));
}

export function PluginAdminSettings(props: PluginAdminSettingsProps) {
  const Settings = usePluginAdminSettings(props.pluginId);
  return Settings ? createElement(Settings, props) : null;
}
