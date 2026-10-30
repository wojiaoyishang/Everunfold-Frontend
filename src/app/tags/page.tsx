import type { Metadata } from "next";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { TaxonomyIndex } from "@/themes/argon/components/taxonomy-index";
export const metadata: Metadata = { title: "文章标签" };
export default async function TagsPage() {
  return <TaxonomyIndex snapshot={await readPublicSnapshot()} kind="tag" />;
}
