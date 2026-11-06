"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SettingsEditorProvider } from "./editor";

/** Application credentials never enter the public settings editor or delivery projection. */
export function SettingsRouteBoundary({ children }: { children: ReactNode }) {
  return usePathname() === "/admin/settings/api-keys" ? (
    children
  ) : (
    <SettingsEditorProvider>{children}</SettingsEditorProvider>
  );
}
