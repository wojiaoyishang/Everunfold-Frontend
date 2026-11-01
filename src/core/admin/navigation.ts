import { builtinAdminModule } from "./builtin-module";
import { createAdminRegistry } from "./registry";
import { contentAdminModule } from "@/core/content-management/registry";

/** Explicit trusted imports only. Backend responses must never mutate this catalog. */
export const adminRegistry = createAdminRegistry([
  builtinAdminModule,
  contentAdminModule,
]);
export const adminNavigationGroups = adminRegistry.navigation;
export const adminNavigation = Object.freeze(
  adminNavigationGroups.flatMap((group) => group.items),
);
export const adminDestination = adminRegistry.resolve;
export type { AdminPageRegistration as AdminDestination } from "./registry";
