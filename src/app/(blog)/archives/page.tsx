import type { Metadata } from "next";
import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { Archives } from "@/themes/argon/components/archives";
export const metadata: Metadata = { title: "文章归档" };
export default async function ArchivesPage() {
  return <Archives snapshot={await readPublicSnapshot()} />;
}
