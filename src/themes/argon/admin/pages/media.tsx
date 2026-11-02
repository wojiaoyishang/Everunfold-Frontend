import { AdminPageHeading } from "../components/page-heading";
import { MediaBrowser } from "../media/media-browser";
export function AdminMedia() {
  return (
    <div className="admin-settings-page admin-library-page">
      <AdminPageHeading title="媒体库" />
      <MediaBrowser />
    </div>
  );
}
