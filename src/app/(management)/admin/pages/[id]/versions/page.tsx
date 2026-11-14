import { PageVersionsPage } from "@/themes/argon/admin/pages/versions-page";

export default async function PageVersionsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageVersionsPage key={id} id={id} />;
}
