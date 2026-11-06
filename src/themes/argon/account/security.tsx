"use client";
import { useEffect, useState } from "react";
import type { AccountProfile, SessionList } from "@/core/contracts/accounts";
import type { AuthSessionState } from "@/core/contracts/auth";
import {
  changeAccountPassword,
  readAccountSessions,
  revokeAccountSession,
} from "@/core/contracts/accounts";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { UiText, useLocale } from "@/core/i18n/provider";
import { Button, Form } from "../components/ui/primitives";
import { Checkbox } from "../components/ui/checkbox";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { AccountField } from "./fields";
import { UnsavedAccountChanges } from "./unsaved";

export function AccountSecurity({
  profile,
  onChanged,
}: {
  profile: AccountProfile;
  onChanged: (session: AuthSessionState) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const { uiLocale: locale } = useLocale();
  const action = useAccountAction(),
    sessionsAction = useAccountAction();
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [revokeKeys, setRevokeKeys] = useState(true);
  const [sessions, setSessions] = useState<SessionList | null>(null);
  const [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [remove, setRemove] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    readAccountSessions(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setSessions(data);
          setError("");
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, refresh, csrfToken]);
  const dirty = !!(current || password || confirmation);
  return (
    <>
      <section className="account-card">
        <header>
          <h2>
            <UiText text="修改密码" />
          </h2>
          <p>
            <UiText
              text={
                profile.must_change_password
                  ? "请修改初始密码后继续使用。"
                  : "修改密码会退出其他会话，并为当前设备建立新会话。"
              }
            />
          </p>
        </header>
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            if (password !== confirmation) {
              action.setMessage("两次输入的密码不一致。");
              return;
            }
            void action.run(async (signal) => {
              const input = {
                expected_revision: profile.revision,
                current_password: current,
                new_password: password,
                revoke_api_keys: revokeKeys,
              };
              const response = await changeAccountPassword(
                baseUrl,
                { ...input, operation_id: action.operation(input) },
                csrfToken,
                { signal },
              );
              if (!signal.aborted) {
                setCurrent("");
                setPassword("");
                setConfirmation("");
                onChanged(response.data);
              }
            }, "密码已修改，其他会话已退出。");
          }}
        >
          <fieldset disabled={action.busy} className="account-fieldset">
            <div className="account-form-grid">
              <div className="account-wide">
                <AccountField
                  label="当前密码"
                  value={current}
                  onChange={setCurrent}
                  secret
                  required
                  autoComplete="current-password"
                />
              </div>
              <AccountField
                label="新密码"
                value={password}
                onChange={setPassword}
                secret
                required
                minLength={12}
                maxLength={1024}
                autoComplete="new-password"
                hint="至少12个字符。"
              />
              <AccountField
                label="确认新密码"
                value={confirmation}
                onChange={setConfirmation}
                secret
                required
                minLength={12}
                maxLength={1024}
                autoComplete="new-password"
              />
            </div>
            <label className="account-check">
              <Checkbox
                checked={revokeKeys}
                onChange={(event) => setRevokeKeys(event.target.checked)}
              />
              <UiText text="同时永久撤销已有 API Key" />
            </label>
            <div className="account-actions">
              <Button
                type="submit"
                className="admin-button admin-button-primary"
              >
                <UiText text={action.busy ? "正在保存…" : "修改密码"} />
              </Button>
            </div>
          </fieldset>
        </Form>
        <p className="account-message" role="status">
          <UiText text={action.message} />
        </p>
      </section>
      <section className="account-card">
        <header className="account-card-heading">
          <div>
            <h2>
              <UiText text="登录会话" />
            </h2>
            <p>
              <UiText text="此处仅显示当前账号仍然有效的登录会话。" />
            </p>
          </div>
          <Button
            className="admin-button"
            disabled={sessionsAction.busy}
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
        {sessions?.items.map((session) => (
          <div className="account-list-row" key={session.id}>
            <div>
              <strong>
                <UiText text={session.current ? "当前会话" : "其他会话"} />
              </strong>
              <p>
                {new Date(session.created_at).toLocaleString(locale)} ·{" "}
                <UiText text="到期" />{" "}
                {new Date(session.expires_at).toLocaleString(locale)}
              </p>
            </div>
            {!session.current && (
              <Button
                className="admin-button"
                onClick={() => setRemove(session.id)}
                disabled={sessionsAction.busy}
              >
                <UiText text="退出此会话" />
              </Button>
            )}
          </div>
        ))}
        {sessions && sessions.items.some((item) => !item.current) && (
          <div className="account-actions">
            <Button
              className="admin-button"
              onClick={() => setRemove("others")}
              disabled={sessionsAction.busy}
            >
              <UiText text="退出所有其他会话" />
            </Button>
          </div>
        )}
        <p className="account-message" role="status">
          <UiText text={sessionsAction.message} />
        </p>
        <ConfirmDialog
          open={!!remove}
          title="撤销登录会话？"
          description="对应设备需要重新登录，当前会话保留。"
          confirmLabel="撤销会话"
          onCancel={() => setRemove(null)}
          error={sessionsAction.message}
          onConfirm={() =>
            sessionsAction.run(async (signal) => {
              const input = { session_id: remove! };
              const result = await revokeAccountSession(
                baseUrl,
                { ...input, operation_id: sessionsAction.operation(input) },
                csrfToken,
                { signal },
              );
              if (!signal.aborted) setSessions(result.data);
            }, "会话已撤销。")
          }
          onConfirmed={() => setRemove(null)}
        />
      </section>
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
    </>
  );
}
