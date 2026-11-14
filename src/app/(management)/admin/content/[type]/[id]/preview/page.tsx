import { PublicTheme } from "@/core/themes/presentation";
import { readActiveTheme } from "@/core/themes/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { contentType } from "@/core/content-management/registry";
import { isContentPreviewPath } from "@/core/content-management/preview";
import { ContentPreview } from "@/themes/argon/preview/content-preview";
import "@/themes/argon/argon.css";
import "@/themes/argon/preview/block-editor-styles";

export const metadata: Metadata = {
  title: "前台预览",
  robots: { index: false, follow: false, nocache: true },
};
export default async function PreviewPage({
  params,
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ type: string; id: string }>;
}) {
  const query = await searchParams;
  const { type, id } = await params;
  if (
    !contentType(type) ||
    !isContentPreviewPath(`/admin/content/${type}/${id}/preview`)
  )
    notFound();
  // Only public theme data crosses SSR. Draft content is fetched after the workspace confirms identity.
  const publicData = await readPublicSnapshot().catch(() => null);
  return (
    <PublicTheme theme={await readActiveTheme()}>
      <ContentPreview
        type={type}
        id={id}
        liveWorkspace={query["live-workspace"] === "1"}
        site={publicData?.site ?? null}
        terms={publicData?.taxonomies ?? []}
      />
    </PublicTheme>
  );
}
