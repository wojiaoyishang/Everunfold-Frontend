import { ManagedPageTypes } from "@/themes/argon/admin/pages/page-types";
import { NewManagedPage } from "@/themes/argon/admin/pages/new-page";
export const metadata = { title: "新建页面" };
export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const { type } = await searchParams;
  return typeof type === "string" && type ? (
    <NewManagedPage key={type} typeId={type} />
  ) : (
    <ManagedPageTypes choose />
  );
}
