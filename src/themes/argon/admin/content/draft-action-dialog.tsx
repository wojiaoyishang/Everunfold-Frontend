"use client";
import { UiText } from "@/core/i18n/provider";

import type { DraftListItem } from "@/core/contracts/content-admin";
import { useDraftAction } from "@/core/content-management/use-draft-action";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

export function DraftActionDialog({
  item,
  onClose,
  onDone,
}: {
  item: DraftListItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const action = useDraftAction(item);
  const restoring = item.status === "trash";
  return (
    <ConfirmDialog
      open
      title={restoring ? "恢复这份内容？" : "移至回收站？"}
      icon={restoring ? "undo" : "trash"}
      intent={restoring ? "default" : "danger"}
      confirmLabel={restoring ? "恢复草稿" : "移至回收站"}
      description={
        <>
          <strong>
            {item.title || item.preview.slice(0, 45) || (
              <UiText text="未命名说说" />
            )}
          </strong>
          <p>
            {(item.translations?.length ?? 0) > 1 ? (
              <UiText
                text="此操作包含全部 {count} 个语言版本。"
                values={{ count: item.translations!.length }}
              />
            ) : (
              ""
            )}
            {restoring ? (
              <UiText text="恢复后可以继续编辑。" />
            ) : (
              <UiText text="内容会移入回收站，并从前台撤下，之后可以恢复。" />
            )}
          </p>
        </>
      }
      error={action.error}
      onCancel={onClose}
      onConfirm={action.run}
      onConfirmed={onDone}
    />
  );
}
