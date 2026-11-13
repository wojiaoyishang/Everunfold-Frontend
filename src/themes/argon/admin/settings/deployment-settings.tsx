import { UiText } from "@/core/i18n/provider";
import { SettingsSection } from "./shared";

export interface DeploymentSummary {
  nodeId: string;
  publicSiteUrl: string | null;
  backendBaseUrl: string;
  sourceBound: boolean;
  settingsReplicaDirectory: string | null;
  publicSnapshotDirectory: string | null;
}

function StorageDirectory({ directory }: { directory: string | null }) {
  return directory ? (
    <code>{directory}</code>
  ) : (
    <UiText text="项目外的自定义目录" />
  );
}

export function DeploymentSettings({
  runtime,
}: {
  runtime: DeploymentSummary;
}) {
  return (
    <SettingsSection
      id="settings-deployment"
      title="部署配置"
      description="这些信息属于当前前端节点，由服务器配置文件维护。"
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
            <UiText text="浏览器后端地址" />
          </dt>
          <dd>{runtime.backendBaseUrl}</dd>
        </div>
        <div>
          <dt>
            <UiText text="设置副本目录" />
          </dt>
          <dd>
            {runtime.sourceBound ? (
              <StorageDirectory directory={runtime.settingsReplicaDirectory} />
            ) : (
              <UiText text="未绑定后端来源" />
            )}
          </dd>
        </div>
        <div>
          <dt>
            <UiText text="公开快照目录" />
          </dt>
          <dd>
            <StorageDirectory directory={runtime.publicSnapshotDirectory} />
          </dd>
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
            {runtime.sourceBound ? (
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
