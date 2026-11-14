import { ManagedPageTypes } from "@/themes/argon/admin/pages/page-types";
import { NewManagedPage } from "@/themes/argon/admin/pages/new-page";
import { readAppliedSettings } from "@/server/settings/current";
export const metadata = { title: "新建页面" };
export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const { type } = await searchParams;
  if (typeof type !== "string" || !type) return <ManagedPageTypes choose />;
  const settings = await readAppliedSettings().catch(() => null);
  return (
    <NewManagedPage
      key={type}
      typeId={type}
      timeZone={settings?.publicSettings?.site.reading?.time_zone}
    />
  );
}
