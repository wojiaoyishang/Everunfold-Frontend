import { AdminPageHeading } from "../components/page-heading";
import { IconBrowser } from "./icon-browser";
export function IconLibraryPage() {
  return (
    <div className="admin-settings-page admin-library-page">
      <AdminPageHeading title="图标库" />
      <IconBrowser />
    </div>
  );
}
