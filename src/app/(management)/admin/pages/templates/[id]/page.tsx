import { PageTemplateEditor } from "@/themes/argon/admin/pages/template-editor";

export const metadata = { title: "自定义页面模板" };

export default async function EditPageTemplate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageTemplateEditor key={id} id={id === "new" ? undefined : id} />;
}
