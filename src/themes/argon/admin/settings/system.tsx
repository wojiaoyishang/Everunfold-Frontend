"use client";
import { UiText } from "@/core/i18n/provider";

import { useId, useState } from "react";
import type { CachePolicy } from "@/core/contracts/settings";
import { useFrontendNodes } from "@/core/settings/nodes";
import { useSettingsEditor } from "@/core/settings/editor";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsSection, DeliveryBadge } from "./shared";
import { SettingsLayout } from "./section-navigation";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
const fields = [
  {
    key: "dynamic_freshness_seconds",
    label: "动态数据刷新间隔",
    unit: "秒",
    min: 5,
    max: 3600,
    fallback: 30,
    hint: "返回标签页时，超过此间隔再检查动态数据。",
  },
  {
    key: "request_timeout_seconds",
    label: "单次请求超时",
    unit: "秒",
    min: 1,
    max: 30,
    fallback: 8,
    hint: "只影响公开动态数据请求；正文离线阅读不受影响。",
  },
  {
    key: "retry_delay_ms",
    label: "失败后重试间隔",
    unit: "毫秒",
    min: 100,
    max: 5000,
    fallback: 1500,
    hint: "短暂网络错误等待后重试一次，写操作不自动重试。",
  },
  {
    key: "batch_delay_ms",
    label: "浏览量合并窗口",
    unit: "毫秒",
    min: 0,
    max: 250,
    fallback: 24,
    hint: "合并同一时刻出现的文章卡片请求，减少重复连接。",
  },
] as const;
function PolicyField({
  field,
  value,
  onChange,
}: {
  field: (typeof fields)[number];
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="admin-settings-field">
      <label htmlFor={id}>{field.label}</label>
      <div className="admin-number-field">
        <TextField
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-describedby={`${id}-hint`}
        />
        <span>{field.unit}</span>
      </div>
      <small id={`${id}-hint`}>
        {field.hint} <UiText text="范围" />
        {field.min}–{field.max}。
      </small>
    </div>
  );
}
export interface RuntimeSummary {
  nodeId: string;
  publicSiteUrl: string | null;
  backendBaseUrl: string;
  settingsDirectory: string;
  snapshotDirectory: string;
  receiverConfigured: boolean;
}
export function SystemSettingsPage({ runtime }: { runtime: RuntimeSummary }) {
  const editor = useFrontendNodes();
  const siteEditor = useSettingsEditor();
  const editable = can(useAdminAccount(), "settings:write");
  const [selected, setSelected] = useState("");
  const node =
    editor.nodes.find((node) => node.node_id === selected) ??
    editor.nodes.find((node) => node.node_id === runtime.nodeId) ??
    editor.nodes[0];
  const draft = node ? editor.drafts[node.node_id] : undefined;
  const dirty = Boolean(
    node && draft && JSON.stringify(draft) !== JSON.stringify(node.value),
  );
  const valid =
    draft &&
    fields.every(
      (field) =>
        Number.isInteger(draft[field.key] ?? field.fallback) &&
        (draft[field.key] ?? field.fallback) >= field.min &&
        (draft[field.key] ?? field.fallback) <= field.max,
    );
  const update = (value: Partial<CachePolicy>) => {
    if (node)
      editor.setDrafts((current) => ({
        ...current,
        [node.node_id]: { ...current[node.node_id], ...value },
      }));
  };
  return (
    <SettingsLayout>
      <AdminPageHeading title="系统设置" />
      <SettingsSection
        id="settings-nodes"
        title="节点策略"
        description="策略由后端保存，节点接收后保留本地副本。后端暂时离线时继续使用上次成功应用的版本。"
      >
        {editor.loading ? (
          <p role="status">
            <UiText text="正在读取节点…" />
          </p>
        ) : !node ? (
          <p>
            <UiText text="尚未配置前端节点，请先在后端部署配置中登记节点。" />
          </p>
        ) : (
          <>
            <Select
              name="frontend-node"
              label="前端节点"
              value={node.node_id}
              options={editor.nodes.map((row) => ({
                value: row.node_id,
                label: row.node_id,
              }))}
              onValueChange={setSelected}
            />
            <div className="admin-node-status">
              <div>
                <strong>{node.node_id}</strong>
                <span>
                  <UiText text="期望版本" />
                  {node.revision} <UiText text="· 已应用" />{" "}
                  {node.delivery.applied_revision ?? <UiText text="尚无" />}
                </span>
              </div>
              <DeliveryBadge value={node.delivery} />
            </div>
            {draft && (
              <Form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid) void editor.save(node);
                }}
              >
                <fieldset
                  className="admin-settings-form"
                  disabled={Boolean(editor.busy) || !editable}
                >
                  <div className="admin-settings-two-col">
                    {fields.map((field) => (
                      <PolicyField
                        key={field.key}
                        field={field}
                        value={draft[field.key] ?? field.fallback}
                        onChange={(value) => update({ [field.key]: value })}
                      />
                    ))}
                  </div>
                </fieldset>
                {!valid && (
                  <p className="admin-settings-message is-error" role="alert">
                    <UiText text="请输入有效范围内的整数。" />
                  </p>
                )}
                <div className="admin-settings-inline-actions">
                  <Button
                    type="submit"
                    className="admin-button admin-button-primary"
                    disabled={
                      Boolean(editor.busy) || !dirty || !valid || !editable
                    }
                  >
                    <Icon name="check" />
                    {editor.busy === node.node_id ? (
                      <UiText text="正在处理" />
                    ) : (
                      <UiText text="保存节点策略" />
                    )}
                  </Button>
                  <Button
                    className="admin-button"
                    disabled={Boolean(editor.busy) || !editable}
                    onClick={() =>
                      editable &&
                      void editor
                        .retry(node.node_id)
                        .then(() => siteEditor.refreshDelivery())
                    }
                  >
                    <Icon name="refresh" />
                    <UiText text="重新同步" />
                  </Button>
                  <Button
                    className="admin-text-action"
                    disabled={Boolean(editor.busy)}
                    onClick={() => void editor.refresh()}
                  >
                    <UiText text="检查状态" />
                  </Button>
                </div>
              </Form>
            )}
          </>
        )}
        {editor.error && (
          <div className="admin-settings-message is-error" role="alert">
            {editor.error}
            <Button
              className="admin-button"
              onClick={() => void editor.refresh(true)}
            >
              <UiText text="放弃修改并重新读取" />
            </Button>
          </div>
        )}
        {editor.message && (
          <p className="admin-settings-message" role="status">
            {editor.message}
          </p>
        )}
      </SettingsSection>
      <SettingsSection
        id="settings-delivery"
        title="站点与主题发布"
        description="保存完成表示数据库已提交；节点应用完成表示整份配置已写入该节点。"
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
      <SettingsSection
        id="settings-deployment"
        title="部署配置"
        description="这些值属于当前 Next.js 实例，通过服务器配置文件维护。"
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
    </SettingsLayout>
  );
}
