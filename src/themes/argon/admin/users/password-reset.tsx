"use client";

import { useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure } from "@/core/accounts/use-action";
import {
  resetAccountUserPassword,
  type AccountProfile,
} from "@/core/contracts/accounts";
import { UiText, useT } from "@/core/i18n/provider";
import { AccountField } from "../../account/fields";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Button } from "../../components/ui/primitives";
import { useToastAction } from "../../components/ui/toast/feedback";

export function ManagedPasswordReset({
  user,
  onChanged,
}: {
  user: AccountProfile;
  onChanged: (user: AccountProfile) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <Button
        ref={trigger}
        className="admin-button"
        aria-label={t("强制修改 {username} 的密码", {
          username: user.username,
        })}
        onClick={() => setOpen(true)}
      >
        <UiText text="强制修改密码" />
      </Button>
      {open && (
        <PasswordResetDialog
          user={user}
          returnFocus={trigger}
          onChanged={onChanged}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PasswordResetDialog({
  user,
  returnFocus,
  onChanged,
  onClose,
}: {
  user: AccountProfile;
  returnFocus: React.RefObject<HTMLButtonElement | null>;
  onChanged: (user: AccountProfile) => void;
  onClose: () => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const action = useToastAction(accountFailure, true);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  return (
    <ConfirmDialog
      open
      title="强制修改密码"
      description={
        <UiText
          text="此操作将退出 @{username} 的全部会话并撤销现有 API Key。用户下次登录时必须更换临时密码。"
          values={{ username: user.username }}
        />
      }
      confirmLabel="确认重置"
      intent="danger"
      busy={action.busy}
      confirmDisabled={!current || [...password].length < 12 || !confirmation}
      returnFocus={returnFocus}
      onCancel={onClose}
      onConfirmed={onClose}
      onConfirm={() => {
        if (password !== confirmation) {
          action.notify("两次输入的密码不一致。");
          return false;
        }
        return action.run(async (signal) => {
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
          if (!signal.aborted) onChanged(response.data);
        }, "用户密码已重置。");
      }}
    >
      <div className="account-form-grid">
        <AccountField
          label="新的临时密码"
          value={password}
          onChange={setPassword}
          secret
          disabled={action.busy}
          minLength={12}
          maxLength={1024}
          autoComplete="new-password"
          hint="至少12个字符。"
        />
        <AccountField
          label="确认临时密码"
          value={confirmation}
          onChange={setConfirmation}
          secret
          disabled={action.busy}
          maxLength={1024}
          autoComplete="new-password"
        />
        <AccountField
          label="你的当前密码"
          value={current}
          onChange={setCurrent}
          secret
          disabled={action.busy}
          maxLength={1024}
          autoComplete="current-password"
        />
      </div>
    </ConfirmDialog>
  );
}
