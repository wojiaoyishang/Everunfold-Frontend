import { notFound } from "next/navigation";
import { isLivePreviewPath } from "@/core/preview/routes";
import { LivePreviewWorkspace } from "@/themes/argon/preview/live-workspace";
export const metadata = {
  title: "模板实时预览",
  robots: { index: false, follow: false },
};
export default async function TemplateLive({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isLivePreviewPath(`/admin/pages/templates/${id}/live`)) notFound();
  return <LivePreviewWorkspace key={id} kind="template" id={id} />;
}
