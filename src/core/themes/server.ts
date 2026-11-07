import "server-only";
import { cache } from "react";
import { readRuntimeCatalog } from "@/server/plugins/current";

export const readActiveTheme = cache(
  async () => (await readRuntimeCatalog()).theme,
);
