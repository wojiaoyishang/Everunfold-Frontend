"use client";

import { UiText } from "@/core/i18n/provider";
import { useSettingsEditor } from "@/core/settings/editor";
import { RouteLink } from "../../components/ui/route-link";
import { AdminPageHeading } from "../components/page-heading";
import { CaptchaSettingsPanel } from "./captcha";
import { SettingsLayout } from "./section-navigation";
import { DeliveryBadge, SettingsSection } from "./shared";

export interface RuntimeSummary {
  nodeId: string;
  publicSiteUrl: string | null;
  backendBaseUrl: string;
  settingsDirectory: string;
  snapshotDirectory: string;
  receiverConfigured: boolean;
}
function DeploymentSettings({ runtime }: { runtime: RuntimeSummary }) {
  return (
    <SettingsSection
      id="settings-deployment"
      title="部署配置"
      description="这些值属于当前 Next.js 实例，通过服务器配置文件维护。"
      group="部署信息"
    >
      <dl className="admin-runtime-list">
        <div>
          <dt>
            <UiText text="当前节点" />
          </dt>
          <dd>{runtime.nodeId}</dd>
        </div>
        <div>
          <dt>
            <UiText text="公开站点地址" />
          </dt>
          <dd>{runtime.publicSiteUrl ?? <UiText text="未配置" />}</dd>
        </div>
        <div>
          <dt>
            <UiText text="后端地址" />
          </dt>
          <dd>{runtime.backendBaseUrl}</dd>
        </div>
        <div>
          <dt>
            <UiText text="设置副本" />
          </dt>
          <dd>{runtime.settingsDirectory}</dd>
        </div>
        <div>
          <dt>
            <UiText text="公开快照目录" />
          </dt>
          <dd>{runtime.snapshotDirectory}</dd>
        </div>
        <div>
          <dt>
            <UiText text="公开快照有效期" />
          </dt>
          <dd>
            <UiText text="无时间过期，按发布版本更新" />
          </dd>
        </div>
        <div>
          <dt>
            <UiText text="页面生成" />
          </dt>
          <dd>
            <UiText text="从本地公开快照按请求渲染" />
          </dd>
        </div>
        <div>
          <dt>
            <UiText text="私有账号数据" />
          </dt>
          <dd>
            <UiText text="不进入共享缓存" />
          </dd>
        </div>
        <div>
          <dt>
            <UiText text="配置来源绑定" />
          </dt>
          <dd>
            {runtime.receiverConfigured ? (
              <UiText text="已配置" />
            ) : (
              <UiText text="待配置" />
            )}
          </dd>
        </div>
      </dl>
    </SettingsSection>
  );
}
export function SystemSettingsPage({ runtime }: { runtime: RuntimeSummary }) {
  const siteEditor = useSettingsEditor();
  return (
    <SettingsLayout>
      <AdminPageHeading title="系统设置" />
      <SettingsSection
        id="settings-nodes"
        title="缓存管理"
        description="在缓存管理中配置各节点的请求策略和查看磁盘状态。"
        group="节点与发布"
      >
        <RouteLink
          href="/admin/settings/cache#settings-nodes"
          className="admin-settings-link"
        >
          <UiText text="前往节点策略" />
        </RouteLink>
      </SettingsSection>
      <SettingsSection
        id="settings-delivery"
        title="站点与主题发布"
        description="保存完成表示数据库已提交；节点应用完成表示整份配置已写入该节点。"
        group="节点与发布"
      >
        <div className="admin-delivery-list">
          {siteEditor.saved?.delivery.map((item) => (
            <div key={item.node_id}>
              <span>{item.node_id}</span>
              <span>
                <UiText text="版本" />
                {item.applied_revision ?? "—"} / {item.desired_revision}
              </span>
              <DeliveryBadge value={item} />
            </div>
          )) ?? (
            <p>
              <UiText text="尚未取得发布状态。" />
            </p>
          )}
        </div>
      </SettingsSection>
      <CaptchaSettingsPanel
        trailing={<DeploymentSettings runtime={runtime} />}
      />
    </SettingsLayout>
  );
}
