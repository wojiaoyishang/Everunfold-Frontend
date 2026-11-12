"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction, accountFailure } from "@/core/accounts/use-action";
import {
  activateTwoFactor,
  beginTwoFactor,
  disableTwoFactor,
  readTwoFactor,
  rotateRecoveryCodes,
  type TwoFactorSetup,
  type TwoFactorState,
} from "@/core/contracts/auth";
import { UiText } from "@/core/i18n/provider";
import { Button, Form } from "../components/ui/primitives";
import { AccountField } from "./fields";
import { SecretReveal } from "./secret-reveal";
import { RequestError } from "@/core/http/request";

function factorFailure(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 42277) return "验证码或恢复码不正确。";
    if (error.code === 40977) return "两步验证状态已更新，请刷新后重试。";
    if (error.code === 50377) return "服务器两步验证密钥不可用。";
  }
  return accountFailure(error);
}

export function TwoFactorCard() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const action = useAccountAction(factorFailure);
  const [state, setState] = useState<TwoFactorState | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    readTwoFactor(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setState(data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(accountFailure(cause));
      });
    return () => controller.abort();
  }, [baseUrl]);

  return (
    <section className="account-card" aria-labelledby="two-factor-heading">
      <header>
        <h2 id="two-factor-heading">
          <UiText text="两步验证" />
        </h2>
        <p>
          <UiText text="使用认证器验证码和一次性恢复码保护登录。" />
        </p>
      </header>
      {error && (
        <p role="alert">
          <UiText text={error} />
        </p>
      )}
      {state && !state.available && (
        <p role="status">
          <UiText text="服务器尚未配置两步验证密钥。" />
        </p>
      )}
      {state?.available && (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            const disable =
              submitter instanceof HTMLElement &&
              submitter.dataset.action === "disable";
            void action.run(async (signal) => {
              if (state.enabled) {
                const input = { current_password: password, code: code.trim() };
                if (disable) {
                  const response = await disableTwoFactor(
                    baseUrl,
                    input,
                    csrfToken,
                    { signal },
                  );
                  if (!signal.aborted) {
                    setState(response.data);
                    setCodes([]);
                  }
                } else {
                  const response = await rotateRecoveryCodes(
                    baseUrl,
                    input,
                    csrfToken,
                    { signal },
                  );
                  if (!signal.aborted) {
                    setCodes(response.data.recovery_codes);
                    setState({
                      ...state,
                      recovery_codes_remaining:
                        response.data.recovery_codes.length,
                    });
                  }
                }
              } else if (!setup) {
                const response = await beginTwoFactor(
                  baseUrl,
                  { current_password: password },
                  csrfToken,
                  { signal },
                );
                if (!signal.aborted) setSetup(response.data);
              } else {
                const response = await activateTwoFactor(
                  baseUrl,
                  { code: code.trim() },
                  csrfToken,
                  { signal },
                );
                if (!signal.aborted) {
                  setCodes(response.data.recovery_codes);
                  setSetup(null);
                  setState({
                    ...state,
                    enabled: true,
                    recovery_codes_remaining:
                      response.data.recovery_codes.length,
                  });
                }
              }
              if (!signal.aborted) {
                setPassword("");
                setCode("");
              }
            });
          }}
        >
          <fieldset className="account-fieldset" disabled={action.busy}>
            {setup && (
              <div className="account-two-factor-setup">
                <div className="account-two-factor-qr">
                  <QRCode value={setup.otpauth_uri} size={184} />
                </div>
                <p>
                  <UiText text="使用认证器扫描二维码，或手动输入以下密钥。密钥只在本次设置中显示。" />
                </p>
                <code>{setup.secret}</code>
              </div>
            )}
            <div className="account-form-grid">
              {(state.enabled || !setup) && (
                <AccountField
                  label="当前密码"
                  value={password}
                  onChange={setPassword}
                  secret
                  required
                  autoComplete="current-password"
                />
              )}
              {(state.enabled || setup) && (
                <AccountField
                  label="认证器验证码或恢复码"
                  value={code}
                  onChange={setCode}
                  required
                  maxLength={32}
                  autoComplete="one-time-code"
                />
              )}
            </div>
            <div className="account-actions">
              {state.enabled ? (
                <>
                  <Button
                    type="submit"
                    className="admin-button"
                    disabled={!password || !code}
                  >
                    <UiText text="重新生成恢复码" />
                  </Button>
                  <Button
                    type="submit"
                    data-action="disable"
                    className="admin-button"
                    disabled={!password || !code}
                  >
                    <UiText text="关闭两步验证" />
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={!setup ? !password : !code}
                >
                  <UiText text={setup ? "确认启用" : "开始设置"} />
                </Button>
              )}
              {setup && (
                <Button
                  type="button"
                  className="admin-button"
                  onClick={() => {
                    setSetup(null);
                    setCode("");
                    action.setMessage("");
                  }}
                >
                  <UiText text="重新开始设置" />
                </Button>
              )}
            </div>
          </fieldset>
        </Form>
      )}
      {state?.enabled && (
        <p>
          <UiText text="剩余恢复码" /> {state.recovery_codes_remaining}
        </p>
      )}
      {codes.length > 0 && (
        <SecretReveal
          title="保存恢复码"
          description="恢复码只显示一次，每个恢复码只能使用一次。请保存在安全的位置。"
          copyLabel="复制恢复码"
          entries={[{ label: "恢复码", value: codes.join("\n") }]}
          onClose={() => setCodes([])}
        />
      )}
      {action.message && (
        <p role="status">
          <UiText text={action.message} />
        </p>
      )}
    </section>
  );
}
