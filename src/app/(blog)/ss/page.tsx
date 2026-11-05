import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { pageNumber } from "@/core/content/query";
import { Feed } from "@/themes/argon/components/feed";
export const metadata = { title: "说说", robots: { index: false } };
export default async function MomentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Feed
      snapshot={await readPublicSnapshot()}
      page={pageNumber((await searchParams).page)}
      type="shuoshuo"
      pathname="/ss"
    />
  );
}
