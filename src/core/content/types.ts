import type { PublicSnapshot } from "@/generated/public-contract";

export type { PublicSnapshot };
export type Site = PublicSnapshot["site"];
export type Content = PublicSnapshot["contents"][number];
export type ReadableContent = Omit<Content, "kind">;
export type Taxonomy = PublicSnapshot["taxonomies"][number];
export type PublicComment = PublicSnapshot["comments"][string][number];
