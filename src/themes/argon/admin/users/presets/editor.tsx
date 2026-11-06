"use client";
import { useEffect, useRef, useState } from "react";
import type {
  PermissionCatalog,
  UserPreset,
  UserPresetCatalog,
  UserPresetFields,
} from "@/generated/accounts-contract";
import {
  createUserPreset,
  removeUserPreset,
  saveUserPreset,
} from "@/generated/accounts-client";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import { UiText } from "@/core/i18n/provider";
import { Button, Form } from "../../../components/ui/primitives";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { AccountField } from "../../../account/fields";
import { UnsavedAccountChanges } from "../../../account/unsaved";
import { UserGrants } from "../grants";

const fields = (value?: UserPreset | null): UserPresetFields => ({
  name: value?.name ?? "",
  description: value?.description ?? "",
  grants: value?.grants ?? {},
});

export function UserPresetEditor({
  row,
  catalog,
  canManage,
  onSaved,
  onRemoved,
  onDirty,
}: {
  row: UserPreset | null | undefined;
  catalog: PermissionCatalog;
  canManage: boolean;
  onSaved: (row: UserPreset) => void;
  onRemoved: (catalog: UserPresetCatalog) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [saved, setSaved] = useState(row);
  const [value, setValue] = useState(() => fields(row));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState<"remove" | "reload" | null>(null);
  const [removePassword, setRemovePassword] = useState("");
  const removed = useRef<UserPresetCatalog | null>(null);
  const action = useAccountAction();
  const dirty = JSON.stringify(value) !== JSON.stringify(fields(saved));
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const changedElsewhere = !!saved && row?.revision !== saved.revision;
  return (
    <>
      <section className="account-card">
        <header className="account-card-heading">
          <div>
            <h2>
              <UiText text={saved ? "编辑身份预设" : "新建身份预设"} />
            </h2>
            <p className="account-policy-help">
              <UiText text="应用时复制权限。修改或删除预设不会改变已有用户。" />
            </p>
          </div>
          {saved && canManage && (
            <Button
              className="admin-button"
              disabled={action.busy}
              onClick={() => {
                action.setMessage("");
                setRemovePassword("");
                setConfirm("remove");
              }}
            >
              <UiText text="删除预设" />
            </Button>
          )}
        </header>
        {changedElsewhere && (
          <div className="account-policy-help" role="alert">
            <UiText text="预设已在其他地方更新或移除。当前输入已保留，请刷新目录后读取最新内容。" />
            {row && (
              <Button
                className="admin-button"
                onClick={() => setConfirm("reload")}
              >
                <UiText text="读取最新预设" />
              </Button>
            )}
          </div>
        )}
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async (signal) => {
              const input = {
                value,
                current_password: password,
                ...(saved ? { expected_revision: saved.revision } : {}),
              };
              const operation_id = action.operation(input);
              const response = saved
                ? await saveUserPreset(
                    baseUrl,
                    saved.id,
                    {
                      value,
                      current_password: password,
                      expected_revision: saved.revision,
                      operation_id,
                    },
                    csrfToken,
                    { signal },
                  )
                : await createUserPreset(
                    baseUrl,
                    { value, current_password: password, operation_id },
                    csrfToken,
                    { signal },
                  );
              if (!signal.aborted) {
                setSaved(response.data);
                setValue(fields(response.data));
                setPassword("");
                onSaved(response.data);
              }
            });
          }}
        >
          <fieldset
            className="account-fieldset"
            disabled={!canManage || action.busy}
          >
            <div className="account-form-grid">
              <AccountField
                label="预设名称"
                value={value.name}
                onChange={(name) => setValue({ ...value, name })}
                required
                maxLength={100}
              />
              <AccountField
                label="预设说明"
                value={value.description ?? ""}
                onChange={(description) => setValue({ ...value, description })}
                maxLength={500}
              />
            </div>
            <h3 className="account-subheading">
              <UiText text="预设权限" />
            </h3>
            <UserGrants
              catalog={catalog}
              value={value.grants ?? {}}
              onChange={(grants) => setValue({ ...value, grants })}
            />
            {canManage && (
              <div className="account-application-password">
                <AccountField
                  label="当前管理员密码"
                  value={password}
                  onChange={setPassword}
                  secret
                  autoComplete="current-password"
                  required
                />
              </div>
            )}
            {canManage && (
              <div className="account-actions">
                <Button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={!dirty || changedElsewhere}
                >
                  <UiText text={action.busy ? "正在保存…" : "保存预设"} />
                </Button>
              </div>
            )}
          </fieldset>
        </Form>
        <p className="account-message" role="status">
          <UiText text={action.message} />
        </p>
      </section>
      <ConfirmDialog
        open={confirm === "remove"}
        title="删除此身份预设？"
        description="已有用户的身份名称和权限将保持不变。当前未保存的预设修改会被丢弃。"
        intent="danger"
        confirmLabel="删除预设"
        confirmDisabled={!removePassword}
        error={action.message}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          action.run(async (signal) => {
            const input = {
              expected_revision: saved!.revision,
              current_password: removePassword,
            };
            const response = await removeUserPreset(
              baseUrl,
              saved!.id,
              { ...input, operation_id: action.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) removed.current = response.data;
          }, "预设已删除。")
        }
        onConfirmed={() => {
          setConfirm(null);
          if (removed.current) onRemoved(removed.current);
        }}
      >
        <AccountField
          label="当前管理员密码"
          value={removePassword}
          onChange={setRemovePassword}
          secret
          autoComplete="current-password"
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "reload"}
        title="读取最新预设？"
        description="当前未保存的修改将被替换。"
        confirmLabel="读取最新"
        onCancel={() => setConfirm(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          setSaved(row);
          setValue(fields(row));
          setPassword("");
          action.setMessage("");
          setConfirm(null);
        }}
      />
      <UnsavedAccountChanges dirty={dirty} busy={action.busy} />
    </>
  );
}
