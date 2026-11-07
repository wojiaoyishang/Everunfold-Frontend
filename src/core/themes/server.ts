import "server-only";
import { cache } from "react";
import { readConfiguration } from "@/core/config/server";
import { themeRegistry } from "@/core/extensions/themes";

/** Request-local identity, shared by the public shell and authorized preview entries. */
export const readActiveTheme = cache(() => {
  const id = readConfiguration().theme.active;
  themeRegistry.chain(id);
  return id;
});
