import { notFound } from "next/navigation";
import { contentType } from "@/core/content-management/registry";
import { ComponentDraftEditor } from "@/themes/argon/admin/content/component-draft-editor";
import { DraftEditor } from "@/themes/argon/admin/content/draft-editor";
export const metadata = { title: "编辑内容" };
export default async function EditContent({
  params,
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
  params: Promise<{ type: string; id: string }>;
}) {
  const values = await params;
  const type = contentType(values.type);
  if (!type || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(values.id))
    notFound();
  if (
    (type.id === "article" || type.id === "shuoshuo") &&
    (await searchParams).mode === "components"
  )
    return <ComponentDraftEditor key={values.id} type={type} id={values.id} />;
  return <DraftEditor key={values.id} type={type} id={values.id} />;
}
