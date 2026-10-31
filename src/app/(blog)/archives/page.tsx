import type { Metadata } from "next";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { Archives } from "@/themes/argon/components/archives";
export const metadata: Metadata = { title: "文章归档" };
export default async function ArchivesPage() {
  return <Archives snapshot={await readPublicSnapshot()} />;
}
