import { UserEditor } from "@/themes/argon/admin/users/editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserEditor key={id} id={id} />;
}
