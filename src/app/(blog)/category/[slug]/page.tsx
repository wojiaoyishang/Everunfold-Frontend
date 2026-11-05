import { readPageSnapshot } from "@/core/i18n/server";
import { CodePage, type PageParameters } from "../../code-page";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<PageParameters>;
}) {
  const [snapshot, { slug }, parameters] = await Promise.all([
    readPageSnapshot(),
    params,
    searchParams,
  ]);
  return (
    <CodePage
      snapshot={snapshot}
      path={`/category/${slug}`}
      parameters={parameters}
    />
  );
}
