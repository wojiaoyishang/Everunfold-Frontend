import type { PageRegistration } from "@/core/contracts/pages";
import type { SettingsModel } from "@/core/forms/schema";

export const customPageTypeId = "core.custom";

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
  /** A registered page may use the reading column without the desktop sidebar. */
  layout?: "wide";
  /** The registered component renders the page's primary heading. */
  heading?: "component";
  /** Project a category of publicly readable articles from the local snapshot. */
  articleCollection?: { categoryOption: string; pageSize: number };
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
  for (const { registration: page } of definitions) {
    if (
      !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(page.id) ||
      !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(page.version) ||
      page.id === customPageTypeId ||
      ids.has(page.id)
    )
      throw new Error(`Invalid or duplicate custom page: ${page.id}`);
    ids.add(page.id);
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
