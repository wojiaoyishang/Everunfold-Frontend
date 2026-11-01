import { AdminPageHeading } from "../components/page-heading";
import { IconBrowser } from "./icon-browser";
export function IconLibraryPage() {
  return (
    <div className="admin-settings-page admin-library-page">
      <AdminPageHeading
        title="图标库"
        description="统一浏览内置图标与自己的上传，在菜单和页面中重复使用。"
      />
      <IconBrowser />
    </div>
  );
}
