"use client";

import { useEffect, useState } from "react";
import { useAccountAction } from "@/core/accounts/use-action";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  createInvitationBatch,
  listInvitations,
  revokeInvitation,
  type InvitationItem,
} from "@/core/contracts/accounts";
import { UiText, useLocale } from "@/core/i18n/provider";
import { SecretReveal } from "../../account/secret-reveal";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { DateTimeField } from "../../components/ui/date-time-field";
import { Select } from "../../components/ui/select";
import { SettingsSection } from "../settings/shared";

export function RegistrationInvitations() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const { uiLocale } = useLocale();
  const action = useAccountAction();
  const [items, setItems] = useState<InvitationItem[] | null>(null);
  const [days, setDays] = useState("7");
  const [count, setCount] = useState("1");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [inputError, setInputError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [asOf, setAsOf] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void listInvitations(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setItems(data.items);
          setAsOf(Date.now());
          setError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [baseUrl, reload]);
  const date = new Intl.DateTimeFormat(uiLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <SettingsSection
      id="access-invitations"
      title="邀请码"
      description="每个邀请码只可注册一次。"
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          setInputError("");
          const amount = Number(count);
          if (!Number.isInteger(amount) || amount < 1 || amount > 100) return;
          if (
            days === "custom" &&
            (!expiresAt || Date.parse(expiresAt) <= Date.now())
          ) {
            setInputError("邀请码到期时间必须晚于当前时间。");
            return;
          }
          const expiry =
            days === "permanent"
              ? null
              : days === "custom"
                ? expiresAt
                : new Date(
                    Date.now() + Number(days) * 86_400_000,
                  ).toISOString();
          void action.run(async (signal) => {
            const { data } = await createInvitationBatch(
              baseUrl,
              { count: amount, expires_at: expiry },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) {
              setCodes(data.items.map((item) => item.code));
              setReload((value) => value + 1);
            }
          }, "已生成邀请码。");
        }}
      >
        <fieldset
          className="admin-settings-form access-invitation-fields"
          disabled={action.busy}
        >
          <div className="admin-settings-field">
            <label htmlFor="invitation-count">
              <UiText text="生成数量" />
            </label>
            <TextField
              id="invitation-count"
              type="number"
              min={1}
              max={100}
              step={1}
              required
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
            <small>
              <UiText text="一次最多生成 100 个邀请码。" />
            </small>
          </div>
          <div className="admin-settings-field">
            <label htmlFor="invitation-days">
              <UiText text="邀请码有效期" />
            </label>
            <Select
              id="invitation-days"
              label="邀请码有效期"
              name="invitation-days"
              programOptions
              value={days}
              onValueChange={(value) => {
                setDays(value);
                setInputError("");
              }}
              options={[
                { value: "1", label: "1 天" },
                { value: "7", label: "7 天" },
                { value: "30", label: "30 天" },
                { value: "custom", label: "自定义到期时间" },
                { value: "permanent", label: "永久有效" },
              ]}
            />
          </div>
          {days === "custom" && (
            <div className="admin-settings-field">
              <label>
                <UiText text="邀请码到期时间" />
              </label>
              <DateTimeField
                label="邀请码到期时间"
                value={expiresAt}
                onValueChange={(value) => {
                  setExpiresAt(value);
                  setInputError("");
                }}
              />
              <small>
                <UiText text="按当前设备时区选择。" />
              </small>
            </div>
          )}
          {inputError && (
            <p role="alert" className="admin-settings-message is-error">
              <UiText text={inputError} />
            </p>
          )}
          <div className="admin-settings-actions">
            <Button
              type="submit"
              className="admin-button admin-button-primary"
              disabled={action.busy}
            >
              <UiText text={action.busy ? "正在生成…" : "生成邀请码"} />
            </Button>
          </div>
        </fieldset>
      </Form>
      {action.message && !revoking && (
        <p role="status">
          <UiText text={action.message} />
        </p>
      )}
      {error ? (
        <div className="account-actions">
          <p role="alert">
            <UiText text="无法读取邀请码。" />
          </p>
          <Button
            className="admin-button"
            onClick={() => setReload((value) => value + 1)}
          >
            <UiText text="重新读取" />
          </Button>
        </div>
      ) : items?.length ? (
        <ul className="access-invitations">
          {items.map((item) => {
            const status = item.consumed_at
              ? "已使用"
              : item.revoked_at
                ? "已撤销"
                : item.expires_at && Date.parse(item.expires_at) <= asOf
                  ? "已过期"
                  : "可使用";
            return (
              <li key={item.id} className="account-actions">
                <code>{item.id.slice(0, 8)}</code>
                <span
                  className={`admin-badge${status === "可使用" ? " admin-badge-success" : ""}`}
                >
                  <UiText text={status} />
                </span>
                {item.expires_at ? (
                  <time dateTime={item.expires_at}>
                    {date.format(new Date(item.expires_at))}
                  </time>
                ) : (
                  <span>
                    <UiText text="永久有效" />
                  </span>
                )}
                {status === "可使用" && (
                  <Button
                    className="admin-button"
                    disabled={action.busy}
                    onClick={() => {
                      setRevoking(item.id);
                      action.setMessage("");
                    }}
                  >
                    <UiText text="撤销邀请码" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p>
          <UiText text={items ? "暂无邀请码。" : "正在读取邀请码…"} />
        </p>
      )}
      {codes.length > 0 && (
        <SecretReveal
          title="邀请码已生成"
          description="邀请码只在本次显示，请复制后交给受邀用户。"
          copyLabel={codes.length > 1 ? "复制全部邀请码" : "复制邀请码"}
          entries={[{ label: "邀请码", value: codes.join("\n") }]}
          onClose={() => setCodes([])}
        />
      )}
      <ConfirmDialog
        open={!!revoking}
        title="撤销邀请码"
        description="撤销后，正在使用此邀请码注册的用户也无法完成注册。"
        intent="danger"
        confirmLabel="撤销邀请码"
        busy={action.busy}
        error={action.message}
        onCancel={() => setRevoking(null)}
        onConfirm={() =>
          action.run(async (signal) => {
            if (!revoking) return;
            const { data } = await revokeInvitation(
              baseUrl,
              { id: revoking },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) setItems(data.items);
          }, "邀请码已撤销。")
        }
        onConfirmed={() => setRevoking(null)}
      />
    </SettingsSection>
  );
}
