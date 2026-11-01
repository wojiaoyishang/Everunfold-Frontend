import { notFound } from "next/navigation";
import { contentType } from "@/core/content-management/registry";
import { DraftEditor } from "@/themes/argon/admin/content/draft-editor";
export const metadata = { title: "新建内容" };
export default async function NewContent({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const type = contentType((await params).type);
  if (!type) notFound();
  return <DraftEditor key={`${type.id}-new`} type={type} id={null} />;
}
