import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { AdminPageHeading } from "../components/page-heading";
import { CollectionToolbar } from "../components/collection-toolbar";
import { PreparationState } from "../components/preparation-state";
export function AdminContent() {
  return (
    <>
      <AdminPageHeading
        title="内容"
        description="集中管理文章与说说。"
        action={
          <Button
            className="admin-button admin-button-primary"
            disabled
            title="内容编辑正在准备中"
          >
            <Icon name="plus" />
            新建内容
          </Button>
        }
      />
      <CollectionToolbar
        filters={["全部", "文章", "说说"]}
        searchLabel="搜索标题"
      />
      <section className="admin-collection" aria-label="内容列表">
        <div className="admin-table-scroll">
          <table className="admin-content-table">
            <caption className="sr-only">
              内容管理尚未开放，未查询文章数据
            </caption>
            <thead>
              <tr>
                <th scope="col">标题</th>
                <th scope="col">类型</th>
                <th scope="col">状态</th>
                <th scope="col">更新时间</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4}>
                  <PreparationState icon="copy" title="内容管理正在准备中">
                    这里将统一整理文章与说说。
                    <br />
                    现有内容仍可在站点中阅读。
                  </PreparationState>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer>
          <span>暂未开放内容编辑</span>
          <span className="admin-badge">准备中</span>
        </footer>
      </section>
    </>
  );
}
