import type { ReactNode } from "react";
import type { ReadableContent, Site } from "@/core/content/types";
import type { PublicManagedPage } from "@/core/contracts/pages";

export interface ThemeDefinition {
  id: string;
  version: string;
  /** Other themes inherit Argon unless an explicit standalone root is requested. */
  parent?: string | null;
  components?: readonly string[];
  templates?: Readonly<Record<string, string>>;
  slots?: Readonly<Record<string, readonly string[] | false>>;
  styles?: boolean;
}

/** Per-view data only. Never pass a full public snapshot or private account state. */
export interface ThemeViewContext {
  site?: Site;
  content?: ReadableContent;
  page?: PublicManagedPage;
  path?: string;
  preview?: boolean;
}

export interface ThemeTemplateProps {
  children: ReactNode;
  context: ThemeViewContext;
  /** A replacing asynchronous preview template reports readiness itself. */
  onReady?: () => void;
}

export interface ThemeSlotProps {
  context: ThemeViewContext;
}
