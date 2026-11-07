import { PublicTheme } from "@/core/themes/presentation";
import { readActiveTheme } from "@/core/themes/server";
import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { isManagedPagePreviewPath } from "@/core/pages/preview";
import { ManagedPagePreview } from "@/themes/argon/preview/page-preview";
import "@/themes/argon/argon.css";
export const metadata = {
  title: "页面预览",
  robots: { index: false, follow: false, nocache: true },
};
export default async function PagePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isManagedPagePreviewPath(`/admin/pages/${id}/preview`)) notFound();
  const snapshot = await readPublicSnapshot().catch(() => null);
  return (
    <PublicTheme theme={await readActiveTheme()}>
      <ManagedPagePreview key={id} id={id} site={snapshot?.site ?? null} />
    </PublicTheme>
  );
}
