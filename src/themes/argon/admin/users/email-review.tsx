"use client";

import { useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import {
  reviewAccountEmail,
  type AccountProfile,
} from "@/core/contracts/accounts";
import { UiText, useLocale, useT } from "@/core/i18n/provider";
import { AccountField } from "../../account/fields";
import { Button } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

export function ManagedEmailReview({
  profile,
  disabled,
  onReviewed,
}: {
  profile: AccountProfile;
  disabled: boolean;
  onReviewed: (profile: AccountProfile) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const { uiLocale } = useLocale();
  const t = useT();
  const operation = useAccountAction();
  const trigger = useRef<HTMLButtonElement>(null);
  const reviewed = useRef<AccountProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const source = profile.email_verification_source;
  const approve = !source;
  const label = approve ? "人工通过" : "撤销邮箱验证";
  return (
    <div className="account-email-review">
      <div>
        <span className="admin-badge">
          <UiText
            text={
              source === "mailbox"
                ? "邮箱验证码通过"
                : source === "admin"
                  ? "管理员通过"
                  : "未验证"
            }
          />
        </span>{" "}
        {profile.email_verification_at && (
          <time dateTime={profile.email_verification_at}>
            {new Date(profile.email_verification_at).toLocaleString(uiLocale)}
          </time>
        )}
      </div>
      <Button
        ref={trigger}
        type="button"
        className="admin-button"
        disabled={disabled || !profile.email || operation.busy}
        onClick={() => {
          setReason("");
          operation.setMessage("");
          setOpen(true);
        }}
      >
        <UiText text={label} />
      </Button>
      {disabled && (
        <small>
          <UiText text="请先保存邮箱修改。" />
        </small>
      )}
      <ConfirmDialog
        open={open}
        title={label}
        intent={approve ? "positive" : "warning"}
        description={
          <UiText
            text="将修改 {email} 的验证状态，并记录操作原因。"
            values={{ email: profile.email ?? "" }}
          />
        }
        confirmLabel={label}
        confirmDisabled={!reason.trim() || disabled}
        busy={operation.busy}
        error={operation.message ? t(operation.message) : ""}
        returnFocus={trigger}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          operation.run(async (signal) => {
            const input = {
              action: approve ? ("approve" as const) : ("revoke" as const),
              expected_revision: profile.revision,
              reason: reason.trim(),
            };
            const result = await reviewAccountEmail(
              baseUrl,
              profile.id,
              { ...input, operation_id: operation.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) reviewed.current = result.data;
          }, "")
        }
        onConfirmed={() => {
          setOpen(false);
          if (reviewed.current) onReviewed(reviewed.current);
          reviewed.current = null;
        }}
      >
        <AccountField
          label="操作原因"
          value={reason}
          onChange={setReason}
          required
          multiline
          maxLength={500}
          disabled={operation.busy}
        />
      </ConfirmDialog>
    </div>
  );
}
