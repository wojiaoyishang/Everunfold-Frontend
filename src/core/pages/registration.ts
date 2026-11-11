import type { PageRegistration } from "@/core/contracts/pages";
import type { SettingsModel } from "@/core/forms/schema";

export interface PageCommentsPlacement {
  /** Auto appends the shared section; manual pages opt in with PageComments. */
  placement: "auto" | "manual";
  /** A selector within this page's body, never the surrounding site shell. */
  selector?: string;
}

export interface PageImageViewerOptions {
  /** Registered pages default to enabled; declarations can opt out. */
  enabled?: boolean;
  /** Optional descendant container whose images use the shared viewer. */
  selector?: string;
}

export interface CustomPageDefinition {
  registration: PageRegistration;
  component: string;
  settingsModel?: SettingsModel;
  /** Share options across the configured language paths; translations stay in code. */
  localized?: boolean;
  comments?: PageCommentsPlacement;
  imageViewer?: PageImageViewerOptions;
}

export function collectCustomPages(
  definitions: readonly Pick<
    CustomPageDefinition,
    "registration" | "localized"
  >[],
) {
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const { registration: page } of definitions) {
    if (
      !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(page.id) ||
      !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(page.version) ||
      ids.has(page.id) ||
      paths.has(page.path)
    )
      throw new Error(`Invalid or duplicate custom page: ${page.id}`);
    ids.add(page.id);
    paths.add(page.path);
  }
  return {
    manifest: {
      protocol: "pages-1" as const,
      pages: definitions.map((d) => d.registration),
    },
    localized: new Set(
      definitions.filter((d) => d.localized).map((d) => d.registration.id),
    ),
  };
}
