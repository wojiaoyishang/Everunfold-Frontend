"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SettingsEditorProvider } from "./editor";
import { PluginImpactDialog } from "@/themes/argon/admin/settings/plugin-impact-dialog";

/** Application credentials never enter the public settings editor or delivery projection. */
export function SettingsRouteBoundary({ children }: { children: ReactNode }) {
  return usePathname() === "/admin/settings/api-keys" ? (
    children
  ) : (
    <SettingsEditorProvider>
      {children}
      <PluginImpactDialog />
    </SettingsEditorProvider>
  );
}
