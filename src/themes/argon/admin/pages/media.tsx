import { AdminPageHeading } from "../components/page-heading";
import { MediaBrowser } from "../media/media-browser";
export function AdminMedia() {
  return (
    <div className="admin-settings-page admin-library-page">
      <AdminPageHeading
        title="媒体库"
        description="集中保存图片与视频，在站点设置和主题中复用。"
      />
      <MediaBrowser />
    </div>
  );
}
