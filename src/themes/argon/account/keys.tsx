"use client";
import { useEffect, useState } from "react";
import type {
  KeyList,
  KeyOptions,
  KeyState,
} from "@/generated/accounts-contract";
import {
  createApiKey,
  readApiKeyOptions,
  readApiKeys,
  revokeApiKey,
} from "@/generated/accounts-client";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { UiText, useLocale } from "@/core/i18n/provider";
import { Button, Form } from "../components/ui/primitives";
import { Select } from "../components/ui/select";
import { DateTimeField } from "../components/ui/date-time-field";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { AccountField } from "./fields";
import { PermissionPicker, type PermissionValues } from "./permissions";
import { SecretReveal } from "./secret-reveal";
import { UnsavedAccountChanges } from "./unsaved";

const statusLabels = {
  active: "可用",
  revoked: "已撤销",
  expired: "已到期",
  unavailable: "当前授权不可用",
};
export function AccountKeys({
  forcedPassword = false,
}: {
  forcedPassword?: boolean;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const { uiLocale: locale } = useLocale();
  const [options, setOptions] = useState<KeyOptions | null>(null),
    [list, setList] = useState<KeyList | null>(null);
  const [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false),
    [appId, setAppId] = useState("everunfold"),
    [name, setName] = useState("");
  const [permissions, setPermissions] = useState<PermissionValues>({}),
    [password, setPassword] = useState("");
  const [expires, setExpires] = useState<string | null>(() =>
    new Date(Date.now() + 90 * 86400000).toISOString(),
  );
  const [secret, setSecret] = useState<string | null>(null),
    [remove, setRemove] = useState<KeyState | null>(null);
  const [warning, setWarning] = useState("");
  const action = useAccountAction(),
    revoke = useAccountAction();
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      readApiKeyOptions(baseUrl, {
        signal: controller.signal,
        headers: { "X-Site-Locale": "zh-CN" },
      }),
      readApiKeys(
        baseUrl,
        { page, page_size: 20 },
        { signal: controller.signal },
      ),
    ])
      .then(([choices, rows]) => {
        if (!controller.signal.aborted) {
          setOptions(choices.data);
          setList(rows.data);
          setError("");
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, page, refresh, csrfToken]);
  const app =
    options?.applications.find((item) => item.id === appId) ??
    options?.applications[0];
  return (
    <>
      <section className="account-card">
        <header className="account-card-heading">
          <div>
            <h2>API Key</h2>
            <p>
              <UiText text="为脚本或其他项目创建具有明确权限和期限的密钥。" />
            </p>
          </div>
          <Button
            className="admin-button admin-button-primary"
            disabled={forcedPassword || !options?.applications.length}
            onClick={() => setCreating((value) => !value)}
          >
            <UiText text={creating ? "收起创建" : "创建 Key"} />
          </Button>
        </header>
        {forcedPassword && (
          <p>
            <UiText text="请先修改初始密码。" />
          </p>
        )}
        {options && !options.applications.length && !forcedPassword && (
          <p>
            <UiText text="当前账号没有可用于 Key 的权限，请联系管理员授权。" />
          </p>
        )}
        {error && (
          <p role="alert">
            <UiText text={error} />
          </p>
        )}
        {creating && app && (
          <Form
            className="account-key-create"
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async (signal) => {
                const input = {
                  app_id: app.id,
                  name,
                  permissions,
                  expires_at: expires!,
                  current_password: password,
                };
                const response = await createApiKey(
                  baseUrl,
                  { ...input, operation_id: action.operation(input) },
                  csrfToken,
                  { signal },
                );
                if (!signal.aborted) {
                  setPassword("");
                  setName("");
                  setPermissions({});
                  setCreating(false);
                  setPage(1);
                  setRefresh((value) => value + 1);
                  if (response.data.secret) setSecret(response.data.secret);
                  else
                    setWarning(
                      "生成已确认，但密钥明文无法再次读取；如未保存请撤销后重新生成。",
                    );
                }
              });
            }}
          >
            <fieldset className="account-fieldset" disabled={action.busy}>
              <div className="account-form-grid">
                <AccountField
                  label="密钥名称"
                  value={name}
                  onChange={setName}
                  maxLength={100}
                  required
                />
                <div className="account-field">
                  <span>
                    <UiText text="接入应用" />
                  </span>
                  <Select
                    name="key-application"
                    label="接入应用"
                    value={app.id}
                    options={options!.applications.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    onValueChange={(value) => {
                      setAppId(value);
                      setPermissions({});
                    }}
                  />
                </div>
                <div className="account-field">
                  <span>
                    <UiText text="到期时间" />
                  </span>
                  <DateTimeField
                    label="到期时间"
                    value={expires}
                    onValueChange={setExpires}
                  />
                </div>
                <AccountField
                  label="当前密码"
                  value={password}
                  onChange={setPassword}
                  secret
                  required
                  autoComplete="current-password"
                />
              </div>
              <h3 className="account-subheading">
                <UiText text="允许的权限" />
              </h3>
              <PermissionPicker
                programLabels={app.audience === "everunfold"}
                definitions={app.scopes}
                ceiling={app.permissions}
                value={permissions}
                onChange={setPermissions}
              />
              <div className="account-actions">
                <Button
                  className="admin-button admin-button-primary"
                  type="submit"
                  disabled={!expires || !Object.keys(permissions).length}
                >
                  <UiText text={action.busy ? "正在创建…" : "生成密钥"} />
                </Button>
              </div>
            </fieldset>
          </Form>
        )}
        {list?.items.map((key) => (
          <div className="account-key-row" key={key.id}>
            <div className="account-key-info">
              <div className="account-key-title">
                <strong>{key.name}</strong>
                <span
                  className={`admin-badge ${key.status === "active" ? "admin-badge-success" : ""}`}
                >
                  <UiText text={statusLabels[key.status]} />
                </span>
              </div>
              <p>
                <code>{key.masked}</code> · {key.application_name}
              </p>
              <div className="account-scope-tags">
                {Object.entries(key.permissions).map(([code, scope]) => (
                  <span key={code}>
                    {code} <UiText text={scope === "own" ? "仅本人" : "全部"} />
                  </span>
                ))}
              </div>
              <p>
                <UiText text="到期" />{" "}
                {new Date(key.expires_at).toLocaleString(locale)}
                {key.last_used_at && (
                  <>
                    {" "}
                    · <UiText text="最近使用" />{" "}
                    {new Date(key.last_used_at).toLocaleString(locale)}
                  </>
                )}
              </p>
            </div>
            {!key.revoked_at && (
              <Button
                className="admin-button"
                disabled={revoke.busy}
                onClick={() => {
                  revoke.setMessage("");
                  setRemove(key);
                }}
              >
                <UiText text="撤销 Key" />
              </Button>
            )}
          </div>
        ))}
        {list && !list.items.length && (
          <p className="account-empty">
            <UiText text="尚未创建 API Key。" />
          </p>
        )}
        <div className="account-actions">
          <Button
            className="admin-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            <UiText text="刷新" />
          </Button>
          {list && list.total > 20 && (
            <>
              <Button
                className="admin-button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <UiText text="上一页" />
              </Button>
              <span>
                {page} / {Math.ceil(list.total / 20)}
              </span>
              <Button
                className="admin-button"
                disabled={page * 20 >= list.total}
                onClick={() => setPage((value) => value + 1)}
              >
                <UiText text="下一页" />
              </Button>
            </>
          )}
        </div>
        <p className="account-message" role="status">
          <UiText text={action.message} />
        </p>
        {warning && (
          <p role="alert">
            <UiText text={warning} />
          </p>
        )}
      </section>
      {secret && (
        <SecretReveal
          entries={[{ label: "API Key", value: secret }]}
          onClose={() => setSecret(null)}
        />
      )}
      <ConfirmDialog
        open={!!remove}
        title="永久撤销 API Key？"
        description="对应程序将无法继续使用此密钥。撤销不可恢复，需要重新创建。"
        confirmLabel="撤销密钥"
        intent="danger"
        error={revoke.message}
        onCancel={() => setRemove(null)}
        onConfirm={() =>
          revoke.run(async (signal) => {
            const input = { key_id: remove!.id };
            await revokeApiKey(
              baseUrl,
              { ...input, operation_id: revoke.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) setRefresh((value) => value + 1);
          }, "密钥已撤销。")
        }
        onConfirmed={() => setRemove(null)}
      />
      <UnsavedAccountChanges
        dirty={!!name || !!password || !!Object.keys(permissions).length}
        busy={action.busy}
      />
    </>
  );
}
