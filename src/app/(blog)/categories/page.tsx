import type { Metadata } from "next";
import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { TaxonomyIndex } from "@/themes/argon/components/taxonomy-index";
export const metadata: Metadata = { title: "文章分类" };
export default async function CategoriesPage() {
  return (
    <TaxonomyIndex snapshot={await readPublicSnapshot()} kind="category" />
  );
}
