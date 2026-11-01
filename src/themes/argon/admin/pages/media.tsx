import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { AdminPageHeading } from "../components/page-heading";
import { CollectionToolbar } from "../components/collection-toolbar";
import { PreparationState } from "../components/preparation-state";
export function AdminMedia() {
  return (
    <>
      <AdminPageHeading
        title="媒体库"
        description="集中存放和整理图片、视频与文件。"
        action={
          <Button
            className="admin-button admin-button-primary"
            disabled
            title="媒体上传正在准备中"
          >
            <Icon name="upload" />
            上传文件
          </Button>
        }
      />
      <CollectionToolbar
        filters={["全部", "图片", "视频", "文件"]}
        searchLabel="搜索文件名称"
      />
      <section
        className="admin-collection admin-media-collection"
        aria-label="媒体列表"
      >
        <PreparationState icon="image" title="媒体库正在准备中">
          上传、查找与引用文件将在这里完成。
          <br />
          现有文章资源不受影响。
        </PreparationState>
        <footer>
          <span>暂未开放媒体上传</span>
          <span className="admin-badge">准备中</span>
        </footer>
      </section>
    </>
  );
}
