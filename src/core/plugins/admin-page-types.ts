import type { AdminPageIcon } from "@/core/admin/registry";

/** Pages mount inside the confirmed administration workspace. */
export interface PluginAdminPage {
  readonly id: string;
  readonly label: string;
  readonly component: string;
  readonly icon?: AdminPageIcon;
  readonly description?: string;
  /** Use an existing host capability. The backend independently enforces its routes. */
  readonly permission: string;
  readonly menu?: { readonly group?: string; readonly order?: number } | false;
}

export interface PluginAdminMenuGroup {
  readonly id: string;
  readonly label: string;
  readonly order?: number;
  /** Place a collapsible group under a built-in sidebar section. */
  readonly parent?: string;
  readonly icon?: AdminPageIcon;
}

export interface PluginAdminPageProps {
  pluginId: string;
  pageId: string;
}

export type RegisteredPluginAdminPage = PluginAdminPage & {
  readonly pluginId: string;
};
export type RegisteredPluginAdminMenuGroup = PluginAdminMenuGroup & {
  readonly pluginId: string;
};
