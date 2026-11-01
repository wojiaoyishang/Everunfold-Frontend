import type { ReactNode } from "react";
import { SettingsEditorProvider } from "@/core/settings/editor";
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsEditorProvider>{children}</SettingsEditorProvider>;
}
