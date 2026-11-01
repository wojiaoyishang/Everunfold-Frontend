import { notFound } from "next/navigation";
import { contentType } from "@/core/content-management/registry";
import { DraftList } from "@/themes/argon/admin/content/draft-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  return { title: contentType((await params).type)?.label ?? "内容" };
}
export default async function ContentTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const type = contentType((await params).type);
  if (!type) notFound();
  return <DraftList key={type.id} type={type} />;
}
