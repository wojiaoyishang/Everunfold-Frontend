"use client";
import { createContext, useContext, type ComponentType } from "react";
import type { RuntimeCatalog } from "./types";

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
