"use client";
import { UiText } from "@/core/i18n/provider";

import type { DraftDetail } from "@/generated/content-admin-contract";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";

export function EditorActions({
  detail,
  busy,
  uncertain,
  disabled,
  onSave,
  onWithdraw,
}: {
  detail: DraftDetail | null;
  busy: boolean;
  uncertain: boolean;
  dirty: boolean;
  disabled: boolean;
  onSave: (action: "save" | "publish") => void;
  onWithdraw: () => void;
}) {
  const publishAllowed = can(
    useAdminAccount(),
    "content:publish",
    detail?.owner_id ?? null,
  );
  return (
    <>
      {publishAllowed && detail?.published_revision && (
        <Button
          className="admin-button"
          disabled={disabled || uncertain}
          onClick={onWithdraw}
        >
          <Icon name="eye-off" />
          <UiText text="撤回" />
        </Button>
      )}
      <Button
        className={`admin-button ${!detail || uncertain ? "admin-button-primary" : ""}`}
        title={uncertain ? "重试上次操作" : "保存版本 (Ctrl/Cmd+S)"}
        aria-keyshortcuts={
          uncertain
            ? undefined
            : "Control+s Meta+s Control+Shift+s Meta+Shift+s"
        }
        disabled={disabled}
        onClick={() => onSave("save")}
      >
        <Icon
          name={busy ? "refresh" : "check"}
          className={busy ? "admin-draft-spin" : ""}
        />
        {busy ? (
          <UiText text="正在保存…" />
        ) : uncertain ? (
          <UiText text="重试上次操作" />
        ) : detail ? (
          <UiText text="保存版本" />
        ) : (
          <UiText text="创建草稿" />
        )}
      </Button>
      {publishAllowed && detail && !uncertain && (
        <Button
          className="admin-button admin-button-primary"
          disabled={disabled}
          onClick={() => onSave("publish")}
        >
          <Icon name="send" />
          {detail.published_revision ? (
            <UiText text="更新发布" />
          ) : (
            <UiText text="发布" />
          )}
        </Button>
      )}
    </>
  );
}
