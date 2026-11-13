import { ManagedPagesDirectory } from "@/themes/argon/admin/pages/page";
export const metadata = { title: "页面" };
export default async function PagesDirectory({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const { type } = await searchParams;
  const filter = typeof type === "string" ? type : "";
  return <ManagedPagesDirectory key={filter} initialType={filter} />;
}
