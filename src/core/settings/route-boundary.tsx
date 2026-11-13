"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SettingsEditorProvider } from "./editor";
import { PluginImpactDialog } from "@/themes/argon/admin/settings/plugin-impact-dialog";

/** These pages have their own data and save flows. */
export function SettingsRouteBoundary({ children }: { children: ReactNode }) {
  const path = usePathname();
  return path === "/admin/settings/api-keys" ||
    path === "/admin/settings/nodes" ? (
    children
  ) : (
    <SettingsEditorProvider>
      {children}
      <PluginImpactDialog />
    </SettingsEditorProvider>
  );
}
