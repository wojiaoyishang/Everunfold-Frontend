import { notFound } from "next/navigation";
import { isLivePreviewPath } from "@/core/preview/routes";
import { LivePreviewWorkspace } from "@/themes/argon/preview/live-workspace";
export const metadata = {
  title: "实时预览",
  robots: { index: false, follow: false },
};
export default async function PageLive({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isLivePreviewPath(`/admin/pages/${id}/live`)) notFound();
  return <LivePreviewWorkspace key={id} kind="page" id={id} />;
}
