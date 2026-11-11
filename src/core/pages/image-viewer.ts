import type { PageImageViewerOptions } from "./registration";

export function pageImageViewerSettings(
  page: { show_image_viewer?: boolean },
  declaration?: PageImageViewerOptions,
) {
  return {
    enabled: page.show_image_viewer !== false && declaration?.enabled !== false,
    selector: declaration?.selector
      ? `[data-managed-page-body] ${declaration.selector} img[src]`
      : "[data-managed-page-body] img[src]",
  };
}
