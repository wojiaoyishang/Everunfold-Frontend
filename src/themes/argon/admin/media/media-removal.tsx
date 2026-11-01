"use client";
import { useEffect, useState } from "react";
import type {
  MediaDetails,
  MediaRemovalPreview,
} from "@/generated/settings-contract";
import { useMediaRemoval } from "@/core/media/media-removal";
import { Button } from "../../components/ui/primitives";
import { Checkbox } from "../../components/ui/checkbox";
import { Icon } from "../../components/icon";

function scopeLabel(plan: MediaRemovalPreview) {
  if (!plan.delete_original) return "移入回收站后可恢复，实际文件会保留。";
  if (plan.file_retained)
    return "仅永久删除当前记录。仍有相同文件的记录，实际文件会保留。";
  if (plan.safe_delete)
    return `这是最后一条记录，将永久删除，并清理 ${plan.file_count} 个实际文件。`;
  return `将永久删除全部 ${plan.record_count} 条相同文件记录，以及 ${plan.file_count} 个实际文件。`;
}

export function MediaRemovalControls({
  detail,
  disabled,
  onComplete,
  onBusy,
}: {
  detail: MediaDetails;
  disabled: boolean;
  onComplete: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const removal = useMediaRemoval(detail);
  const [confirm, setConfirm] = useState(false);
  const [original, setOriginal] = useState(Boolean(detail.deleted));
  const [safe, setSafe] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const { prepare } = removal;
  useEffect(() => {
    onBusy(removal.busy);
  }, [onBusy, removal.busy]);
  useEffect(() => {
    if (!confirm) return;
    const controller = new AbortController();
    void prepare(original, safe, controller.signal);
    return () => controller.abort();
  }, [confirm, original, safe, attempt, prepare]);
  const apply = async (action: "remove" | "restore") => {
    if (await removal.run(action)) onComplete();
  };
  const resuming = Boolean(removal.plan?.resume_operation_id);
  return (
    <div className="admin-media-removal">
      <div className="admin-media-removal-actions">
        {detail.deleted && !detail.purge_pending && (
          <Button
            className="admin-button"
            disabled={disabled || removal.busy}
            onClick={() => void apply("restore")}
          >
            <Icon name="refresh" />
            恢复文件
          </Button>
        )}
        <Button
          className="admin-upload-text-button admin-media-remove-button"
          disabled={disabled || removal.busy}
          aria-expanded={confirm}
          onClick={() => setConfirm((value) => !value)}
        >
          {detail.purge_pending
            ? "重试删除文件"
            : detail.deleted
              ? "永久删除"
              : "删除文件"}
        </Button>
      </div>
      {confirm && (
        <div className="admin-media-removal-confirm">
          <strong>{resuming ? "继续完成这次删除？" : "删除文件？"}</strong>
          <div className="admin-media-removal-options">
            <label>
              <Checkbox
                checked={resuming ? removal.plan!.delete_original : original}
                disabled={removal.busy || resuming}
                onChange={(e) => setOriginal(e.target.checked)}
              />
              删除实际文件
            </label>
            <label>
              <Checkbox
                checked={resuming ? removal.plan!.safe_delete : safe}
                disabled={removal.busy || resuming || !original}
                onChange={(e) => setSafe(e.target.checked)}
              />
              安全删除
            </label>
          </div>
          <p role="status">
            {removal.checking
              ? "正在确认删除范围…"
              : removal.plan
                ? scopeLabel(removal.plan)
                : "请先确认文件的使用状态。"}
          </p>
          <div>
            <Button
              className="admin-button"
              disabled={removal.busy}
              onClick={() => setConfirm(false)}
            >
              取消
            </Button>
            {!removal.plan && !removal.checking ? (
              <Button
                className="admin-button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                重新读取
              </Button>
            ) : (
              <Button
                className="admin-button admin-media-remove-button"
                disabled={removal.busy || removal.checking || !removal.plan}
                onClick={() => void apply("remove")}
              >
                {removal.busy ? "正在处理…" : "确认删除"}
              </Button>
            )}
          </div>
        </div>
      )}
      {removal.error && (
        <p className="admin-media-removal-error" role="alert">
          {removal.error}
        </p>
      )}
    </div>
  );
}
