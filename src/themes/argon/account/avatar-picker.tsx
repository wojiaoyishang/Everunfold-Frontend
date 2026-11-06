"use client";
import { useState } from "react";
import type { AvatarItem } from "@/generated/accounts-contract";
import { useAvatarLibrary } from "@/core/accounts/avatar-library";
import { useAdminRequest } from "@/core/admin/account-context";
import { removeAccountAvatar } from "@/generated/accounts-client";
import { useAccountAction } from "@/core/accounts/use-action";
import { UiText, useT } from "@/core/i18n/provider";
import { formatBytes } from "@/core/media/image-editor";
import { Modal } from "../components/ui/modal";
import { Button } from "../components/ui/primitives";
import { FilePicker } from "../components/ui/file-picker";
import { UploadQueueView } from "../components/ui/upload-queue";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Avatar } from "../components/ui/avatar";
import { Icon } from "../components/icon";
import { AccountField } from "./fields";

export function AvatarPicker({
  selectedId,
  protectedId,
  onSelect,
  onClose,
}: {
  selectedId?: string | null;
  protectedId?: string | null;
  onSelect: (avatar: AvatarItem) => void;
  onClose: () => void;
}) {
  const library = useAvatarLibrary(),
    action = useAccountAction();
  const { baseUrl, csrfToken } = useAdminRequest();
  const [closing, setClosing] = useState(false),
    [selection, setSelection] = useState<AvatarItem | null>(null);
  const [query, setQuery] = useState(""),
    [remove, setRemove] = useState<AvatarItem | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const t = useT();
  const uploading = library.uploads.some((item) =>
    ["queued", "uploading", "saving"].includes(item.state),
  );
  const select = (avatar: AvatarItem) => {
    setSelection(avatar);
    setClosing(true);
  };
  const items = library.catalog?.items.filter((item) =>
    item.filename
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Modal
      title="个人头像图库"
      className="account-avatar-modal"
      closing={closing}
      closeLabel="关闭头像图库"
      onClose={() => {
        if (uploading) setConfirmClose(true);
        else setClosing(true);
      }}
      onExited={() => {
        if (selection) onSelect(selection);
        else onClose();
      }}
    >
      <div className="account-avatar-picker-body">
        <div className="account-avatar-upload">
          <div className="account-avatar-upload-icon">
            <Icon name="image" />
          </div>
          <div>
            <h3>
              <UiText text="上传一张喜欢的图片" />
            </h3>
            <p>
              <UiText text="仅展示你为头像上传的图片。" />
            </p>
            {library.catalog && (
              <small>
                {t("静态 JPG / PNG / WebP · 单张 {size} · 最长边 {edge}px", {
                  size: formatBytes(
                    library.catalog.policy.max_bytes ?? 2097152,
                  ),
                  edge: library.catalog.policy.max_edge ?? 512,
                })}
              </small>
            )}
          </div>
          <FilePicker
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            label={t("上传头像")}
            disabled={!library.catalog || closing}
            onFiles={(files) => library.queue.add(files, "avatar")}
          />
        </div>
        {library.catalog && (
          <div className="account-avatar-quota">
            <span>
              {t("个人图库 {used} / {limit}", {
                used: library.catalog.retained,
                limit: library.catalog.policy.retained_images ?? 20,
              })}
            </span>
            <span>
              {t("今日上传 {used} / {limit}", {
                used: library.catalog.uploaded_today,
                limit: library.catalog.policy.daily_uploads ?? 10,
              })}
            </span>
          </div>
        )}
        <UploadQueueView
          items={library.uploads}
          onCancel={(id) => library.queue.cancel(id)}
          onRetry={(id) => library.queue.retry(id)}
          onClear={() => library.queue.clearFinished()}
          onSelect={select}
        />
        <AccountField
          label="搜索头像"
          type="search"
          value={query}
          onChange={setQuery}
        />
        {library.error && (
          <p role="alert">
            <UiText text={library.error} />
            <Button className="admin-button" onClick={library.refresh}>
              <UiText text="重新读取" />
            </Button>
          </p>
        )}
        <div className="account-avatar-grid">
          {items?.map((item) => (
            <div className="account-avatar-option" key={item.id}>
              <Button
                className="account-avatar-choice"
                aria-label={t("选择头像：{name}", { name: item.filename })}
                aria-pressed={selectedId === item.id}
                disabled={item.status !== "ready" || closing}
                onClick={() => select(item)}
              >
                <Avatar src={item.url} name={item.filename} size={84} />
                <span title={item.filename}>{item.filename}</span>
                {selectedId === item.id && (
                  <i>
                    <Icon name="check" />
                  </i>
                )}
                {item.status !== "ready" && (
                  <small>
                    <UiText
                      text={
                        item.status === "pending"
                          ? "等待完成，可原请求重试"
                          : "资源暂不可用"
                      }
                    />
                  </small>
                )}
              </Button>
              <Button
                className="account-avatar-remove"
                disabled={protectedId === item.id || action.busy}
                title={
                  protectedId === item.id
                    ? t("当前头像需先更换或清除")
                    : undefined
                }
                onClick={() => {
                  action.setMessage("");
                  setRemove(item);
                }}
              >
                <UiText text="移除" />
              </Button>
            </div>
          ))}
        </div>
        {items?.length === 0 && (
          <div className="account-avatar-empty">
            <Icon name="image" />
            <UiText
              text={
                query
                  ? "没有匹配的图片。"
                  : "还没有头像图片，从上方上传第一张。"
              }
            />
          </div>
        )}
        {!library.catalog && !library.error && (
          <p role="status">
            <UiText text="正在读取头像图库…" />
          </p>
        )}
        <p className="account-avatar-help">
          <UiText text="选择后需保存资料才会生效。移除图片不会恢复当日上传次数。" />
        </p>
      </div>
      <ConfirmDialog
        open={!!remove}
        title="从个人头像图库移除？"
        description="已选为当前头像的图片需先更换。移除后不能直接恢复，但可以重新上传。"
        confirmLabel="移除图片"
        error={action.message}
        onCancel={() => setRemove(null)}
        onConfirm={() =>
          action.run(async (signal) => {
            const input = { avatar_id: remove!.id };
            await removeAccountAvatar(
              baseUrl,
              { ...input, operation_id: action.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) library.refresh();
          }, "已移除。")
        }
        onConfirmed={() => setRemove(null)}
      />
      <ConfirmDialog
        open={confirmClose}
        title="停止上传并关闭？"
        description="将停止等待当前上传，已完成的图片会保留。重新打开可以查看服务端已接收的图片。"
        confirmLabel="停止并关闭"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          library.queue.dispose();
          return true;
        }}
        onConfirmed={() => {
          setConfirmClose(false);
          setClosing(true);
        }}
      />
    </Modal>
  );
}
