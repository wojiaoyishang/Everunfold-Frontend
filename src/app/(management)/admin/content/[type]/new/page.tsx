import { notFound } from "next/navigation";
import { contentType } from "@/core/content-management/registry";
import { ComponentDraftEditor } from "@/themes/argon/admin/content/component-draft-editor";
import { DraftEditor } from "@/themes/argon/admin/content/draft-editor";
export const metadata = { title: "新建内容" };
export default async function NewContent({
  params,
  searchParams,
}: {
  searchParams: Promise<{ mode?: string | string[] }>;
  params: Promise<{ type: string }>;
}) {
  const type = contentType((await params).type);
  if (!type) notFound();
  if (
    (type.id === "article" || type.id === "shuoshuo") &&
    (await searchParams).mode === "components"
  )
    return <ComponentDraftEditor key={type.id} type={type} id={null} />;
  return <DraftEditor key={`${type.id}-new`} type={type} id={null} />;
}
