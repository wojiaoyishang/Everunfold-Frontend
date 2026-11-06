import { notFound } from "next/navigation";
import { isLivePreviewPath } from "@/core/preview/routes";
import { LivePreviewWorkspace } from "@/themes/argon/preview/live-workspace";
export const metadata = {
  title: "实时预览",
  robots: { index: false, follow: false },
};
export default async function ContentLive({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const { id, type } = await params;
  if (
    (type !== "article" && type !== "shuoshuo") ||
    !isLivePreviewPath(`/admin/content/${type}/${id}/live`)
  )
    notFound();
  return <LivePreviewWorkspace key={id} kind={type} id={id} />;
}
