import { Suspense } from "react";
import { notFound } from "next/navigation";
import { contentType } from "@/core/content-management/registry";
import { DraftVersionsPage } from "@/themes/argon/admin/content/versions-page";

export const metadata = {
  title: "版本修订",
  robots: { index: false, follow: false, nocache: true },
};
export default async function VersionsPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const values = await params;
  const type = contentType(values.type);
  if (!type || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(values.id))
    notFound();
  return (
    <Suspense fallback={<p role="status">正在打开版本对比…</p>}>
      <DraftVersionsPage key={values.id} type={type} id={values.id} />
    </Suspense>
  );
}
