"use client";
import { createContext, useContext, type ComponentType } from "react";
import type { RuntimeCatalog } from "./types";
import type { RegisteredAdminFormFieldHook } from "@/core/forms/admin-field-types";

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
  fieldHooks: readonly RegisteredAdminFormFieldHook[];
}>({ catalog: null, components: new Map(), fieldHooks: [] });

export const useAdminPluginRuntime = () =>
  useContext(AdminPluginRuntimeContext);
