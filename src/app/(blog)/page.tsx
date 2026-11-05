import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { pageNumber } from "@/core/content/query";
import { feedType } from "@/core/content/presentation";
import { Feed } from "@/themes/argon/components/feed";
import { SearchResults } from "@/themes/argon/components/search-results";
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [snapshot, params] = await Promise.all([
    readPublicSnapshot(),
    searchParams,
  ]);
  const query =
    typeof params.q === "string"
      ? params.q
      : typeof params.s === "string"
        ? params.s
        : "";
  const type = feedType(params.type);
  return query ? (
    <SearchResults
      snapshot={snapshot}
      query={query}
      type={type}
      page={pageNumber(params.page)}
    />
  ) : (
    <Feed
      snapshot={snapshot}
      page={pageNumber(params.page)}
      type={type === "page" ? "all" : type}
    />
  );
}
