import { registeredContentTypes } from "@/core/content-management/registry";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";

export function AdminContent() {
  return (
    <>
      <AdminPageHeading title="内容" />
      <div className="admin-content-type-grid">
        {registeredContentTypes.map((type) => (
          <RouteLink
            className="admin-shortcut admin-content-type-card"
            key={type.id}
            href={`/admin/content/${type.id}`}
          >
            <Icon name={type.icon === "leaf" ? "leaf" : "book"} />
            <h2>{type.label}</h2>
            <span>
              打开草稿列表
              <Icon name="arrow" />
            </span>
          </RouteLink>
        ))}
        <RouteLink
          className="admin-shortcut admin-content-type-card"
          href="/admin/pages"
        >
          <Icon name="copy" />
          <h2>页面</h2>
          <p>查看由代码提供的独立页面。</p>
          <span>
            打开页面目录
            <Icon name="arrow" />
          </span>
        </RouteLink>
      </div>
    </>
  );
}
