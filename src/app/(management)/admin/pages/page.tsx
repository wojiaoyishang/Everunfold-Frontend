import { AdminPageHeading } from "@/themes/argon/admin/components/page-heading";
import { PreparationState } from "@/themes/argon/admin/components/preparation-state";
export const metadata = { title: "页面" };
export default function PagesDirectory() {
  return (
    <>
      <AdminPageHeading title="页面" description="管理由代码提供的独立页面。" />
      <section className="admin-panel">
        <PreparationState icon="copy" title="还没有接入自定义页面">
          页面由代码注册，后续可在这里管理启用状态及页面提供的选项。
        </PreparationState>
      </section>
    </>
  );
}
