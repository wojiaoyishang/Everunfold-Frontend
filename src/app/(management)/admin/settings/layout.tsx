import type { ReactNode } from "react";
import { SettingsRouteBoundary } from "@/core/settings/route-boundary";
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsRouteBoundary>{children}</SettingsRouteBoundary>;
}
