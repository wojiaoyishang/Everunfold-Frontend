"use client";
import { useEffect, useState } from "react";
import type {
  ApplicationFields,
  ApplicationMutation,
  ApplicationState,
  PermissionDefinition,
} from "@/generated/accounts-contract";
import {
  commandApiCallback,
  createApiApplication,
  readApiApplications,
  rotateApiApplication,
  saveApiApplication,
} from "@/generated/accounts-client";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import { UiText, useLocale } from "@/core/i18n/provider";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AccountField } from "../../account/fields";
import { ApplicationScopes } from "./scopes";

const fields = (app: ApplicationState | null): ApplicationFields => ({
  name: app?.name ?? "",
  active: app?.active ?? true,
  callback_url: app?.callback_url ?? "",
  scopes:
    app && !app.builtin
      ? app.scopes.map((scope) => ({
          code: scope.code,
          label: scope.label,
          owner_scope: scope.owner_scope,
          api_key: true,
        }))
      : [],
});
const eventLabels: Record<string, string> = {
  "key.revoked": "Key 撤销",
  "user.authorization_changed": "用户授权变更",
  "application.authorization_changed": "应用授权变更",
  "application.credentials_rotated": "凭据轮换",
  "application.test": "回调测试",
  "application.resync": "重新同步",
};
const deliveryLabels = {
  pending: "等待投递",
  delivered: "已应用",
  failed: "投递失败",
  skipped: "未配置回调",
};
const callbackErrors: Record<string, string> = {
  invalid_signature: "回执签名无效",
  invalid_receipt: "回执内容不匹配",
  not_applied: "子项目已接收，等待应用",
  delivery_unavailable: "无法连接回调目标",
  origin_not_allowed: "回调来源未获部署放行",
  signing_or_target_unavailable: "签名或回调配置不可用",
  signing_unavailable: "签名凭据未就绪",
  target_removed: "回调地址已移除",
  receipt_too_large: "回执内容过大",
};

export function ApplicationEditor({
  app,
  definitions,
  onSaved,
  onDirty,
  onReveal,
}: {
  app: ApplicationState | null;
  definitions: PermissionDefinition[];
  onSaved: (app: ApplicationState) => void;
  onDirty: (value: boolean) => void;
  onReveal: (entries: { label: string; value: string }[]) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    { uiLocale: locale } = useLocale();
  const [baseline, setBaseline] = useState(app),
    [value, setValue] = useState(() => fields(app));
  const [appId, setAppId] = useState(app?.id ?? ""),
    [audience, setAudience] = useState(app?.audience ?? "everunfold");
  const [password, setPassword] = useState(""),
    [rotationPassword, setRotationPassword] = useState("");
  const [rotate, setRotate] = useState(false),
    [direction, setDirection] = useState<"query" | "callback" | "both">(
      "query",
    );
  const [discard, setDiscard] = useState(false),
    [rotationResult, setRotationResult] = useState<ApplicationMutation | null>(
      null,
    );
  const action = useAccountAction(),
    command = useAccountAction(),
    rotation = useAccountAction();
  const dirty =
    JSON.stringify(value) !== JSON.stringify(fields(baseline)) ||
    (!baseline && !!appId);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const accepted = (result: ApplicationMutation, preserveFields = false) => {
    setBaseline(result.application);
    if (!preserveFields) setValue(fields(result.application));
    setPassword("");
    onSaved(result.application);
    if (result.query_secret || result.callback_secret) {
      if (result.query_secret && result.callback_secret)
        onReveal([
          {
            label: "子项目连接配置（含密钥）",
            value: JSON.stringify(
              {
                appId: result.application.id,
                audience: result.application.audience,
                queryUrl: result.application.query_url,
                queryKeyId: result.application.query_key_id,
                querySecret: result.query_secret,
                callbackUrl: result.application.callback_url,
                callbackKeyId: result.application.callback_key_id,
                callbackSecret: result.callback_secret,
              },
              null,
              2,
            ),
          },
        ]);
      else
        onReveal([
          {
            label: result.query_secret ? "查询签名密钥" : "回调签名密钥",
            value: (result.query_secret ?? result.callback_secret)!,
          },
        ]);
    }
  };
  const loadLatest = () =>
    void action.run(async (signal) => {
      const result = await readApiApplications(baseUrl, { signal });
      const latest = result.data.items.find((item) => item.id === baseline?.id);
      if (!latest) return;
      if (!signal.aborted) {
        setBaseline(latest);
        setValue(fields(latest));
        setPassword("");
        onSaved(latest);
      }
    }, "已读取最新设置。");
  const controlsDisabled =
    !baseline ||
    dirty ||
    action.busy ||
    command.busy ||
    rotation.busy ||
    (!!app && app.revision !== baseline.revision);
  return (
    <>
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async (signal) => {
            if (baseline) {
              const input = {
                value,
                expected_revision: baseline.revision,
                current_password: password,
              };
              accepted(
                (
                  await saveApiApplication(
                    baseUrl,
                    baseline.id,
                    { ...input, operation_id: action.operation(input) },
                    csrfToken,
                    { signal },
                  )
                ).data,
              );
            } else {
              const input = {
                value,
                app_id: appId,
                audience: audience as "everunfold" | "self",
                current_password: password,
              };
              accepted(
                (
                  await createApiApplication(
                    baseUrl,
                    { ...input, operation_id: action.operation(input) },
                    csrfToken,
                    { signal },
                  )
                ).data,
              );
            }
          });
        }}
      >
        <section className="account-card">
          <header className="account-card-heading">
            <div>
              <h2>{baseline?.name ?? <UiText text="新建接入应用" />}</h2>
              {baseline && (
                <p>
                  {baseline.id} ·{" "}
                  <UiText
                    text={
                      baseline.audience === "everunfold"
                        ? "调用博客 API"
                        : "保护子项目 API"
                    }
                  />
                </p>
              )}
            </div>
            {baseline && (
              <Button
                className="admin-button"
                disabled={action.busy}
                onClick={() => {
                  if (dirty) setDiscard(true);
                  else loadLatest();
                }}
              >
                <UiText text="读取最新设置" />
              </Button>
            )}
          </header>
          {app && baseline && app.revision !== baseline.revision && (
            <p role="alert" className="account-secret-warning">
              <UiText text="应用设置已在其他地方修改。当前输入保留，请读取最新设置后合并更改。" />
            </p>
          )}
          <fieldset className="account-fieldset" disabled={action.busy}>
            <div className="account-form-grid">
              {!baseline && (
                <AccountField
                  label="应用标识"
                  value={appId}
                  onChange={setAppId}
                  required
                  minLength={2}
                  maxLength={64}
                  hint="创建后不可修改；使用小写字母、数字、点、下划线或短横线。"
                />
              )}
              <AccountField
                label="应用名称"
                value={value.name}
                onChange={(name) => setValue({ ...value, name })}
                required
                maxLength={100}
              />
              {!baseline && (
                <div className="account-field">
                  <span>
                    <UiText text="接口目标" />
                  </span>
                  <Select
                    name="application-audience"
                    label="接口目标"
                    value={audience}
                    programOptions
                    options={[
                      { value: "everunfold", label: "调用博客 API" },
                      { value: "self", label: "保护子项目 API" },
                    ]}
                    onValueChange={(next) => {
                      setAudience(next);
                      setValue({ ...value, scopes: [] });
                    }}
                  />
                </div>
              )}
              <div className="account-wide">
                <AccountField
                  label="回调地址"
                  value={value.callback_url ?? ""}
                  onChange={(callback_url) =>
                    setValue({ ...value, callback_url })
                  }
                  hint="可留空。填写子项目接收通知的完整地址，来源须在部署配置中放行。"
                  maxLength={2048}
                />
              </div>
              <div className="account-state-control">
                <span id="application-active-label">
                  <UiText text="启用应用" />
                </span>
                <Switch
                  aria-labelledby="application-active-label"
                  checked={value.active ?? true}
                  onCheckedChange={(active) => setValue({ ...value, active })}
                />
              </div>
            </div>
            <h3 className="account-subheading">
              <UiText text="应用可用权限" />
            </h3>
            <ApplicationScopes
              builtin={baseline?.builtin ?? false}
              audience={audience}
              definitions={definitions}
              value={value.scopes ?? []}
              onChange={(scopes) => setValue({ ...value, scopes })}
            />
            <div className="account-application-password">
              <AccountField
                label="当前管理员密码"
                value={password}
                onChange={setPassword}
                secret
                required
                autoComplete="current-password"
              />
            </div>
            <div className="account-actions">
              <Button
                className="admin-button admin-button-primary"
                type="submit"
                disabled={
                  !dirty || (!baseline?.builtin && !value.scopes?.length)
                }
              >
                <UiText
                  text={
                    action.busy
                      ? "正在保存…"
                      : baseline
                        ? "保存应用"
                        : "创建应用并生成凭据"
                  }
                />
              </Button>
            </div>
          </fieldset>
          <p className="account-message" role="status">
            <UiText text={action.message} />
          </p>
        </section>
      </Form>
      {baseline && (
        <>
          <section className="account-card">
            <header className="account-card-heading">
              <div>
                <h2>
                  <UiText text="签名凭据" />
                </h2>
                <p>
                  <UiText text="查询和回调使用独立密钥，仅生成时显示。" />
                </p>
              </div>
              <Button
                className="admin-button"
                disabled={
                  !baseline ||
                  action.busy ||
                  command.busy ||
                  rotation.busy ||
                  (!!app && app.revision !== baseline.revision)
                }
                onClick={() => {
                  rotation.setMessage("");
                  setRotate(true);
                }}
              >
                <UiText
                  text={baseline.query_key_id ? "轮换凭据" : "生成签名凭据"}
                />
              </Button>
            </header>
            <div className="account-form-grid">
              <div className="account-field account-wide">
                <span>
                  <UiText text="Key 校验接口" />
                </span>
                <TextField
                  aria-label="Key 校验接口"
                  value={baseline.query_url}
                  readOnly
                />
              </div>
              <div>
                <small>
                  <UiText text="查询密钥 ID" />
                </small>
                <p className="account-key-id">{baseline.query_key_id ?? "—"}</p>
              </div>
              <div>
                <small>
                  <UiText text="回调密钥 ID" />
                </small>
                <p className="account-key-id">
                  {baseline.callback_key_id ?? "—"}
                </p>
              </div>
            </div>
            {!baseline.signing_available && (
              <p role="alert">
                <UiText text="签名服务未就绪，请检查部署配置。" />
              </p>
            )}
          </section>
          <section className="account-card">
            <header className="account-card-heading">
              <div>
                <h2>
                  <UiText text="回调与同步" />
                </h2>
                <p>
                  <UiText text="使用已保存的地址投递；已接收和已应用分别记录。" />
                </p>
              </div>
            </header>
            <div className="account-actions">
              {(["test", "resync", "retry"] as const).map((operation) => (
                <Button
                  key={operation}
                  className="admin-button"
                  disabled={
                    controlsDisabled ||
                    !baseline.callback_url ||
                    !baseline.callback_key_id
                  }
                  onClick={() =>
                    void command.run(async (signal) => {
                      const input = { action: operation };
                      const response = await commandApiCallback(
                        baseUrl,
                        baseline.id,
                        { ...input, operation_id: command.operation(input) },
                        csrfToken,
                        { signal },
                      );
                      if (!signal.aborted) onSaved(response.data);
                    }, "请求已加入投递队列。")
                  }
                >
                  <UiText
                    text={
                      operation === "test"
                        ? "测试回调"
                        : operation === "resync"
                          ? "重新同步"
                          : "重试失败投递"
                    }
                  />
                </Button>
              ))}
            </div>
            <p className="account-message" role="status">
              <UiText text={command.message} />
            </p>
            {(app?.callbacks ?? baseline.callbacks).map((event) => (
              <div className="account-callback-row" key={event.id}>
                <div>
                  <strong>
                    <UiText
                      text={eventLabels[event.event_type] ?? event.event_type}
                    />
                  </strong>
                  <p>
                    {new Date(event.created_at).toLocaleString(locale)} ·{" "}
                    {event.attempts} <UiText text="次尝试" />
                  </p>
                  {event.last_error && (
                    <small>
                      <UiText
                        text={
                          callbackErrors[event.last_error] ?? event.last_error
                        }
                      />
                    </small>
                  )}
                </div>
                <span
                  className={`admin-badge ${event.status === "delivered" ? "admin-badge-success" : ""}`}
                >
                  <UiText
                    text={
                      event.status === "pending" && event.received_at
                        ? "已接收，等待应用"
                        : deliveryLabels[event.status]
                    }
                  />
                </span>
              </div>
            ))}
            {!(app?.callbacks ?? baseline.callbacks).length && (
              <p className="account-empty">
                <UiText text="暂无投递记录。" />
              </p>
            )}
          </section>
        </>
      )}
      <ConfirmDialog
        open={discard}
        title="载入最新应用设置？"
        description="当前未保存的输入会被替换。"
        confirmLabel="载入最新"
        onCancel={() => setDiscard(false)}
        onConfirm={() => true}
        onConfirmed={() => {
          setDiscard(false);
          loadLatest();
        }}
      />
      <ConfirmDialog
        open={rotate}
        title="生成或轮换签名凭据"
        description="所选方向的旧凭据立即失效。请将新凭据更新到子项目，再重新同步。"
        confirmLabel="确认生成"
        error={rotation.message}
        onCancel={() => setRotate(false)}
        onConfirm={() =>
          rotation.run(async (signal) => {
            if (!baseline) return;
            const input = {
              expected_revision: baseline.revision,
              direction,
              current_password: rotationPassword,
            };
            const response = await rotateApiApplication(
              baseUrl,
              baseline.id,
              { ...input, operation_id: rotation.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) {
              setRotationResult(response.data);
              setRotationPassword("");
            }
          }, "凭据已更新。")
        }
        onConfirmed={() => {
          setRotate(false);
          if (rotationResult) accepted(rotationResult, true);
          setRotationResult(null);
        }}
      >
        <div className="account-field">
          <span>
            <UiText text="轮换方向" />
          </span>
          <Select
            name="rotation-direction"
            label="轮换方向"
            value={direction}
            programOptions
            options={[
              { value: "query", label: "查询方向" },
              { value: "callback", label: "回调方向" },
              { value: "both", label: "两个方向" },
            ]}
            onValueChange={(next) => setDirection(next as typeof direction)}
          />
        </div>
        <AccountField
          label="当前管理员密码"
          value={rotationPassword}
          onChange={setRotationPassword}
          secret
          required
          autoComplete="current-password"
        />
      </ConfirmDialog>
    </>
  );
}
