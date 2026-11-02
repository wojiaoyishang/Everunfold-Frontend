"use client";
import type { DraftDetail } from "@/generated/content-admin-contract";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";

export function EditorActions({
  detail,
  busy,
  uncertain,
  dirty,
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
  return (
    <>
      {detail?.published_revision && (
        <Button
          className="admin-button"
          disabled={disabled || uncertain}
          onClick={onWithdraw}
        >
          <Icon name="eye-off" />
          撤回
        </Button>
      )}
      <Button
        className={`admin-button ${!detail || uncertain ? "admin-button-primary" : ""}`}
        disabled={disabled || Boolean(!dirty && detail && !uncertain)}
        onClick={() => onSave("save")}
      >
        <Icon
          name={busy ? "refresh" : "check"}
          className={busy ? "admin-draft-spin" : ""}
        />
        {busy ? "正在保存…" : uncertain ? "重试上次操作" : "保存草稿"}
      </Button>
      {detail && !uncertain && (
        <Button
          className="admin-button admin-button-primary"
          disabled={
            disabled ||
            (!dirty && detail.published_revision === detail.revision)
          }
          onClick={() => onSave("publish")}
        >
          <Icon name="send" />
          {detail.published_revision ? "更新发布" : "发布"}
        </Button>
      )}
    </>
  );
}
