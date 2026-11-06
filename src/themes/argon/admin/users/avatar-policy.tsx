"use client";
import { useEffect, useState } from "react";
import {
  readAvatarPolicy,
  saveAvatarPolicy,
} from "@/generated/accounts-client";
import type {
  AvatarLimits,
  AvatarPolicyState,
} from "@/generated/accounts-contract";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { UiText } from "@/core/i18n/provider";
import { Modal } from "../../components/ui/modal";
import { Button, Form } from "../../components/ui/primitives";
import { AccountField } from "../../account/fields";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AdminWarning } from "../components/warning";

export function AvatarPolicyEditor({ onClose }: { onClose: () => void }) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [saved, setSaved] = useState<AvatarPolicyState | null>(null),
    [value, setValue] = useState<AvatarLimits | null>(null);
  const [error, setError] = useState(""),
    [closing, setClosing] = useState(false),
    [discard, setDiscard] = useState(false);
  const action = useAccountAction();
  useEffect(() => {
    const controller = new AbortController();
    readAvatarPolicy(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setSaved(data);
          setValue({
            max_bytes: data.max_bytes,
            max_edge: data.max_edge,
            daily_uploads: data.daily_uploads,
            retained_images: data.retained_images,
          });
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl]);
  const dirty =
    !!saved &&
    !!value &&
    Object.entries(value).some(
      ([key, item]) => item !== saved[key as keyof AvatarLimits],
    );
  return (
    <Modal
      title="头像上传限制"
      className="account-policy-modal"
      closing={closing}
      onExited={onClose}
      onClose={() => {
        if (action.busy) return;
        if (dirty) setDiscard(true);
        else setClosing(true);
      }}
    >
      {error && (
        <p role="alert">
          <UiText text={error} />
        </p>
      )}
      {value && saved ? (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async (signal) => {
              const input = {
                value,
                expected_revision: saved.revision,
              };
              const response = await saveAvatarPolicy(
                baseUrl,
                { ...input, operation_id: action.operation(input) },
                csrfToken,
                { signal },
              );
              if (!signal.aborted) {
                setSaved(response.data);
              }
            });
          }}
        >
          <p className="account-policy-help">
            <UiText text="仅影响个人头像上传，不授予媒体库权限。调小限制不会删除已有图片。" />
          </p>
          <AdminWarning text="这些限制会影响所有用户的头像上传。保存前请核对大小、上传次数和保留数量。" />
          <fieldset className="account-fieldset" disabled={action.busy}>
            <div className="account-form-grid">
              <AccountField
                label="单张上限（MiB）"
                value={String((value.max_bytes ?? 2097152) / 1048576)}
                onChange={(next) =>
                  setValue({
                    ...value,
                    max_bytes: Math.round(Number(next) * 1048576),
                  })
                }
                type="number"
                required
                min={0.0625}
                max={20}
                step={0.0625}
              />
              <AccountField
                label="图片最长边（px）"
                value={String(value.max_edge ?? 512)}
                onChange={(next) =>
                  setValue({ ...value, max_edge: Number(next) })
                }
                type="number"
                required
                min={64}
                max={2048}
              />
              <AccountField
                label="每日上传次数"
                value={String(value.daily_uploads ?? 10)}
                onChange={(next) =>
                  setValue({ ...value, daily_uploads: Number(next) })
                }
                type="number"
                required
                min={1}
                max={1000}
                hint="按 UTC 每日重置，移除图片不返还当日次数。"
              />
              <AccountField
                label="个人图库最多保留"
                value={String(value.retained_images ?? 20)}
                onChange={(next) =>
                  setValue({ ...value, retained_images: Number(next) })
                }
                type="number"
                required
                min={1}
                max={1000}
              />
            </div>
            <div className="account-actions">
              <Button
                type="submit"
                className="admin-button admin-button-primary"
                disabled={!dirty}
              >
                <UiText text={action.busy ? "正在保存…" : "保存限制"} />
              </Button>
            </div>
          </fieldset>
          <p className="account-message" role="status">
            <UiText text={action.message} />
          </p>
        </Form>
      ) : (
        !error && (
          <p role="status">
            <UiText text="正在读取设置…" />
          </p>
        )
      )}
      <ConfirmDialog
        open={discard}
        title="放弃未保存的修改？"
        confirmLabel="放弃修改"
        onCancel={() => setDiscard(false)}
        onConfirm={() => true}
        onConfirmed={() => {
          setDiscard(false);
          setClosing(true);
        }}
      />
    </Modal>
  );
}
