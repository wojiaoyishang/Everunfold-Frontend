import { readPageSnapshot } from "@/core/i18n/server";
import { CodePage, codePageMetadata, type PageParameters } from "./code-page";
export async function generateMetadata() {
  return codePageMetadata(await readPageSnapshot(), "/");
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<PageParameters>;
}) {
  const [snapshot, parameters] = await Promise.all([
    readPageSnapshot(),
    searchParams,
  ]);
  return <CodePage snapshot={snapshot} path="/" parameters={parameters} />;
}
