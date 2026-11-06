import { ManagedPageEditor } from "@/themes/argon/admin/pages/editor";
export const metadata = { title: "编辑页面" };
export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ManagedPageEditor key={id} id={id} />;
}
