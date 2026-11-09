import type { ReactNode } from "react";
import type { ReadableContent, Site } from "@/core/content/types";
import type { PublicManagedPage } from "@/core/contracts/pages";
import type { InstalledTheme } from "@/core/contracts/settings";
import type { FontDefinition, ThemeTypography } from "@/core/fonts/types";

type ThemeMetadata = Partial<
  Pick<
    InstalledTheme,
    | "title"
    | "description"
    | "preview"
    | "author"
    | "homepage"
    | "repository"
    | "license"
  >
>;

export interface ThemeDefinition extends ThemeMetadata {
  id: string;
  version: string;
  /** Other themes inherit Argon unless an explicit standalone root is requested. */
  parent?: string | null;
  components?: readonly string[];
  templates?: Readonly<Record<string, string>>;
  slots?: Readonly<Record<string, readonly string[] | false>>;
  styles?: boolean;
  fonts?: readonly FontDefinition[];
  typography?: ThemeTypography;
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
