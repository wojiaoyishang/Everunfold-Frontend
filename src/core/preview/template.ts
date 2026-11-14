import type { PublicManagedPage, TitledPageCode } from "@/core/contracts/pages";
import type { MediaURL } from "@/core/contracts/content-admin";
export function templatePreviewPage(
  id: string,
  value: TitledPageCode,
  revision = 1,
  media: Record<string, MediaURL> = {},
): PublicManagedPage {
  return {
    ...value,
    id,
    title: value.title || "未命名模板",
    path: "/preview",
    source: "custom",
    revision,
    enabled: true,
    media_urls: media,
  };
}
