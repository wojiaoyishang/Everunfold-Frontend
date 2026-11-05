import type { Metadata } from "next";
import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { pageNumber } from "@/core/content/query";
import { feedType } from "@/core/content/presentation";
import { SearchResults } from "@/themes/argon/components/search-results";
export const metadata: Metadata = {
  title: "站内搜索",
  robots: { index: false, follow: true },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [snapshot, params] = await Promise.all([
    readPublicSnapshot(),
    searchParams,
  ]);
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  return (
    <SearchResults
      snapshot={snapshot}
      query={query}
      type={feedType(params.type)}
      page={pageNumber(params.page)}
      allLanguages={params.languages === "all"}
    />
  );
}
