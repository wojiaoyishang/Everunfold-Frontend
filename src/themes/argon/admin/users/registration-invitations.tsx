"use client";

import { useEffect, useState } from "react";
import { useAccountAction } from "@/core/accounts/use-action";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  type InvitationItem,
} from "@/core/contracts/accounts";
import { UiText, useLocale } from "@/core/i18n/provider";
import { SecretReveal } from "../../account/secret-reveal";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { SettingsSection } from "../settings/shared";

export function RegistrationInvitations() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const { uiLocale } = useLocale();
  const action = useAccountAction();
  const [items, setItems] = useState<InvitationItem[] | null>(null);
  const [days, setDays] = useState("7");
  const [code, setCode] = useState("");
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
      <div className="account-actions">
        <Select
          label="邀请码有效期"
          name="invitation-days"
          value={days}
          onValueChange={setDays}
          options={[
            { value: "1", label: "1 天" },
            { value: "7", label: "7 天" },
            { value: "30", label: "30 天" },
          ]}
        />
        <Button
          className="admin-button admin-button-primary"
          disabled={action.busy}
          onClick={() => {
            void action.run(async (signal) => {
              const { data } = await createInvitation(
                baseUrl,
                { days_valid: Number(days) },
                csrfToken,
                { signal },
              );
              if (!signal.aborted) {
                setCode(data.code);
                setReload((value) => value + 1);
              }
            }, "已生成邀请码。");
          }}
        >
          <UiText text="生成邀请码" />
        </Button>
      </div>
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
                : Date.parse(item.expires_at) <= asOf
                  ? "已过期"
                  : "可使用";
            return (
              <li key={item.id} className="account-actions">
                <code>{item.id.slice(0, 8)}</code>
                <UiText text={status} />
                <time dateTime={item.expires_at}>
                  {date.format(new Date(item.expires_at))}
                </time>
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
      {code && (
        <SecretReveal
          title="邀请码已生成"
          description="邀请码只在本次显示，请复制后交给受邀用户。"
          copyLabel="复制邀请码"
          entries={[{ label: "邀请码", value: code }]}
          onClose={() => setCode("")}
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
