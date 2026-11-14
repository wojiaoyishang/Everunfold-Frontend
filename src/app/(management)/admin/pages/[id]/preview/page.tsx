import { PublicTheme } from "@/core/themes/presentation";
import { readActiveTheme } from "@/core/themes/server";
import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { isManagedPagePreviewPath } from "@/core/pages/preview";
import { ManagedPagePreview } from "@/themes/argon/preview/page-preview";
import { pageArticleSources } from "@/core/pages/articles";
import "@/themes/argon/argon.css";
export const metadata = {
  title: "页面预览",
  robots: { index: false, follow: false, nocache: true },
};
export default async function PagePreview({
  params,
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ id: string }>;
}) {
  const query = await searchParams;
  const { id } = await params;
  if (!isManagedPagePreviewPath(`/admin/pages/${id}/preview`)) notFound();
  const snapshot = await readPublicSnapshot().catch(() => null);
  return (
    <PublicTheme theme={await readActiveTheme()}>
      <ManagedPagePreview
        key={id}
        id={id}
        liveWorkspace={query["live-workspace"] === "1"}
        template={query.template === "1"}
        site={snapshot?.site ?? null}
        articleSources={snapshot ? pageArticleSources(snapshot) : []}
      />
    </PublicTheme>
  );
}
