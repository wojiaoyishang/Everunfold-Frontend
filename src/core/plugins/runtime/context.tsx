"use client";
import { createContext, useContext, type ComponentType } from "react";
import type { RuntimeCatalog } from "./types";
import type { RegisteredAdminFormFieldHook } from "@/core/forms/admin-field-types";
import type {
  RegisteredPluginAdminPage,
  RegisteredPluginAdminMenuGroup,
} from "../admin-page-types";

export type RuntimeComponents = ReadonlyMap<
  string,
  Record<string, ComponentType<Record<string, unknown>>>
>;
export const RuntimeContext = createContext<{
  catalog: RuntimeCatalog | null;
  components: RuntimeComponents;
  loading: boolean;
}>({ catalog: null, components: new Map(), loading: false });
export const usePluginRuntime = () => useContext(RuntimeContext);

export const AdminPluginRuntimeContext = createContext<{
  catalog: RuntimeCatalog | null;
  components: RuntimeComponents;
  loading: boolean;
  fieldHooks: readonly RegisteredAdminFormFieldHook[];
  adminPages: readonly RegisteredPluginAdminPage[];
  adminMenuGroups: readonly RegisteredPluginAdminMenuGroup[];
}>({
  catalog: null,
  components: new Map(),
  loading: false,
  fieldHooks: [],
  adminPages: [],
  adminMenuGroups: [],
});

export const useAdminPluginRuntime = () =>
  useContext(AdminPluginRuntimeContext);
