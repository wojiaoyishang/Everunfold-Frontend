import { notFound } from "next/navigation";
import { contentType } from "@/core/content-management/registry";
import { DraftEditor } from "@/themes/argon/admin/content/draft-editor";
export const metadata = { title: "编辑内容" };
export default async function EditContent({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const values = await params;
  const type = contentType(values.type);
  if (!type || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(values.id))
    notFound();
  return <DraftEditor key={values.id} type={type} id={values.id} />;
}
