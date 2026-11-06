import type { PublicSnapshot as StoredSnapshot } from "@/generated/public-contract";

import type {
  CachePolicy,
  PublicSettings,
} from "@/generated/settings-contract";
export type Site = StoredSnapshot["site"] & {
  locale?: string;
  contentLocales?: Record<string, string>;
  contentTranslations?: Record<
    string,
    NonNullable<StoredSnapshot["contents"][number]["translations"]>
  >;
  navigationResources?: Record<string, string>;
  settings?: PublicSettings;
  settingsRevision?: number;
  cachePolicy?: CachePolicy;
};
export type PublicSnapshot = Omit<StoredSnapshot, "site"> & { site: Site };
export type Content = PublicSnapshot["contents"][number];
export type ReadableContent = Omit<Content, "kind">;
export type Taxonomy = PublicSnapshot["taxonomies"][number];
export type PublicComment = PublicSnapshot["comments"][string][number];
