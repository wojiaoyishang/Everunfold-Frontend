"use client";
import { useEffect, useState } from "react";
import type {
  AccountProfile,
  KeyList,
  KeyState,
} from "@/generated/accounts-contract";
import {
  readUserApiKeys,
  resetAccountUserPassword,
  revokeUserApiKey,
} from "@/generated/accounts-client";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { UiText, useLocale } from "@/core/i18n/provider";
import { Button, Form } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AccountField } from "../../account/fields";

export function ManagedUserSecurity({
  user,
  onChanged,
  isSelf,
}: {
  user: AccountProfile;
  onChanged: (user: AccountProfile) => void;
  isSelf: boolean;
}) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    { uiLocale: locale } = useLocale();
  const action = useAccountAction(),
    revoke = useAccountAction();
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [reset, setReset] = useState(false),
    [keys, setKeys] = useState<KeyList | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1);
  const [remove, setRemove] = useState<KeyState | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    readUserApiKeys(
      baseUrl,
      user.id,
      { page, page_size: 20 },
      { signal: controller.signal },
    )
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setKeys(data);
          setError("");
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, user.id, refresh, page, user.auth_version]);
  return (
    <>
      {!isSelf && (
        <section className="account-card">
          <header>
            <h2>
              <UiText text="重置用户密码" />
            </h2>
            <p>
              <UiText text="会退出该用户全部会话并永久撤销已有 Key，下次登录必须修改初始密码。" />
            </p>
          </header>
          <Form
            onSubmit={(event) => {
              event.preventDefault();
              if (password !== confirmation) {
                action.setMessage("两次输入的密码不一致。");
                return;
              }
              setReset(true);
            }}
          >
            <fieldset className="account-fieldset" disabled={action.busy}>
              <div className="account-form-grid">
                <AccountField
                  label="新的临时密码"
                  value={password}
                  onChange={setPassword}
                  secret
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
                <AccountField
                  label="确认临时密码"
                  value={confirmation}
                  onChange={setConfirmation}
                  secret
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
                <AccountField
                  label="管理员当前密码"
                  value={current}
                  onChange={setCurrent}
                  secret
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="account-actions">
                <Button className="admin-button" type="submit">
                  <UiText text="重置密码" />
                </Button>
              </div>
            </fieldset>
          </Form>
          <p role="status" className="account-message">
            <UiText text={action.message} />
          </p>
        </section>
      )}
      <section className="account-card">
        <header className="account-card-heading">
          <div>
            <h2>
              <UiText text="用户的 API Key" />
            </h2>
            <p>
              <UiText text="仅显示名称、范围和状态，不能读取已有密钥明文。" />
            </p>
          </div>
          <Button
            className="admin-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            <UiText text="刷新" />
          </Button>
        </header>
        {error && (
          <p role="alert">
            <UiText text={error} />
          </p>
        )}
        {keys?.items.map((key) => (
          <div className="account-key-row" key={key.id}>
            <div className="account-key-info">
              <strong>{key.name}</strong>
              <p>
                {key.masked} · {key.application_name}
              </p>
              <p>
                {new Date(key.expires_at).toLocaleString(locale)} ·{" "}
                <UiText
                  text={
                    key.status === "active"
                      ? "可用"
                      : key.status === "expired"
                        ? "已到期"
                        : key.status === "revoked"
                          ? "已撤销"
                          : "当前授权不可用"
                  }
                />
              </p>
            </div>
            {!key.revoked_at && (
              <Button
                className="admin-button"
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
        {keys && !keys.total && (
          <p className="account-empty">
            <UiText text="尚未创建 API Key。" />
          </p>
        )}
        {keys && keys.total > 20 && (
          <div className="account-actions">
            <Button
              className="admin-button"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <UiText text="上一页" />
            </Button>
            <span>
              {page} / {Math.ceil(keys.total / 20)}
            </span>
            <Button
              className="admin-button"
              disabled={page * 20 >= keys.total}
              onClick={() => setPage((value) => value + 1)}
            >
              <UiText text="下一页" />
            </Button>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={reset}
        title="重置此用户的密码？"
        description="所有会话和已有 API Key 将失效。请通过安全方式将临时密码交给用户。"
        confirmLabel="确认重置"
        intent="danger"
        error={action.message}
        onCancel={() => setReset(false)}
        onConfirm={() =>
          action.run(async (signal) => {
            const input = {
              expected_revision: user.revision,
              current_password: current,
              new_password: password,
            };
            const response = await resetAccountUserPassword(
              baseUrl,
              user.id,
              { ...input, operation_id: action.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) {
              setCurrent("");
              setPassword("");
              setConfirmation("");
              onChanged(response.data);
              setRefresh((value) => value + 1);
            }
          }, "密码已重置。")
        }
        onConfirmed={() => setReset(false)}
      />
      <ConfirmDialog
        open={!!remove}
        title="永久撤销 API Key？"
        confirmLabel="撤销密钥"
        intent="danger"
        error={revoke.message}
        onCancel={() => setRemove(null)}
        onConfirm={() =>
          revoke.run(async (signal) => {
            const input = { key_id: remove!.id };
            await revokeUserApiKey(
              baseUrl,
              user.id,
              { ...input, operation_id: revoke.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) setRefresh((value) => value + 1);
          }, "密钥已撤销。")
        }
        onConfirmed={() => setRemove(null)}
      />
    </>
  );
}
