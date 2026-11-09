"use client";
import { useState } from "react";
import { useLanguageCatalog, useT, UiText } from "@/core/i18n/provider";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import { draftError } from "@/core/content-management/draft-state";
import { batchTargets } from "@/core/content-management/batch-targets";
import {
  mutateDraftBatch,
  type DraftListItem,
  type MetadataPatch,
  type TermChange,
} from "@/core/contracts/content-admin";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { TokenField } from "../../components/ui/token-field";
import { Form } from "../../components/ui/primitives";
import { AdminActionButton } from "../components/action-button";
import styles from "./management.module.css";
export function BatchEditor({
  rows,
  mode,
  onClose,
  onSaved,
}: {
  rows: DraftListItem[];
  mode: "edit" | "trash" | "restore";
  onClose: () => void;
  onSaved: () => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    action = useAccountAction(draftError),
    languages = useLanguageCatalog(),
    t = useT();
  const [scope, setScope] = useState(mode === "edit" ? "original" : "all"),
    [patch, setPatch] = useState<MetadataPatch>({}),
    [closing, setClosing] = useState(false),
    [done, setDone] = useState(false);
  const targets = batchTargets(rows, scope, mode === "restore");
  const dirty = Object.keys(patch).length > 0;
  const close = () => {
    if (!action.busy) setClosing(true);
  };
  const set = (
    field: keyof MetadataPatch,
    value: TermChange | boolean | undefined,
  ) =>
    setPatch((current) => {
      const next = { ...current, [field]: value };
      if (value === undefined) delete next[field];
      return next;
    });
  const save = async () => {
    const input = {
      action: mode,
      items: targets.map(({ id, expected_revision, expected_seq }) => ({
        id,
        expected_revision,
        expected_seq,
      })),
      ...(mode === "edit" ? { patch } : {}),
    };
    if (
      await action.run(async (signal) => {
        await mutateDraftBatch(
          baseUrl,
          { ...input, operation_id: action.operation(input) },
          csrfToken,
          { signal },
        );
      }, "")
    ) {
      setDone(true);
      setClosing(true);
    }
  };
  return (
    <Modal
      title={
        mode === "edit"
          ? "批量编辑"
          : mode === "trash"
            ? "批量移至回收站"
            : "批量恢复草稿"
      }
      className={styles.batchDialog}
      onClose={close}
      closing={closing}
      onExited={done ? onSaved : onClose}
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className={styles.batchForm}
      >
        <div className={styles.batchBody}>
          <label className={styles.fieldLabel}>
            <UiText text="语言范围" />
            <Select
              name="batch-language-scope"
              label="语言范围"
              value={scope}
              disabled={action.busy}
              options={[
                { value: "original", label: t("仅原文") },
                { value: "all", label: t("全部语言版本") },
                ...languages.languages.map((language) => ({
                  value: language.code,
                  label: language.name,
                })),
              ]}
              onValueChange={setScope}
            />
          </label>
          <p className={styles.batchSummary}>
            <UiText
              text="已选 {groups} 组，本次操作 {count} 份语言版本。"
              values={{ groups: rows.length, count: targets.length }}
            />
          </p>
          <ul className={styles.targets}>
            {targets.map((target) => (
              <li key={target.id}>
                <span>{target.title || t("未命名说说")}</span>
                <small>
                  {target.language} · V{target.expected_revision}
                </small>
              </li>
            ))}
          </ul>
          {mode === "edit" ? (
            <fieldset disabled={action.busy} className={styles.quickFields}>
              <div className={styles.metadataGrid}>
                {(["categories", "tags"] as const).map((field) => (
                  <div className={styles.batchTerm} key={field}>
                    <label className={styles.fieldLabel}>
                      <UiText
                        text={field === "categories" ? "分类调整" : "标签调整"}
                      />
                      <Select
                        name={`batch-${field}`}
                        label={field === "categories" ? "分类调整" : "标签调整"}
                        programOptions
                        value={patch[field]?.mode ?? "keep"}
                        options={[
                          { value: "keep", label: "不修改" },
                          { value: "add", label: "添加" },
                          { value: "remove", label: "移除指定项" },
                          { value: "replace", label: "替换全部" },
                        ]}
                        onValueChange={(value) =>
                          set(
                            field,
                            value === "keep"
                              ? undefined
                              : {
                                  mode: value as TermChange["mode"],
                                  values: patch[field]?.values ?? [],
                                },
                          )
                        }
                      />
                    </label>
                    {patch[field] && (
                      <TokenField
                        label={t(field === "categories" ? "分类" : "标签")}
                        multiple
                        value={patch[field]?.values ?? []}
                        onChange={(values) =>
                          set(field, {
                            mode: patch[field]?.mode ?? "replace",
                            values,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.metadataGrid}>
                {(["pinned", "comments_open"] as const).map((field) => (
                  <label key={field} className={styles.fieldLabel}>
                    <UiText text={field === "pinned" ? "置顶" : "允许评论"} />
                    <Select
                      name={`batch-${field}`}
                      label={field === "pinned" ? "置顶" : "允许评论"}
                      programOptions
                      value={
                        patch[field] === undefined
                          ? "keep"
                          : String(patch[field])
                      }
                      options={[
                        { value: "keep", label: "不修改" },
                        { value: "true", label: "是" },
                        { value: "false", label: "否" },
                      ]}
                      onValueChange={(value) =>
                        set(
                          field,
                          value === "keep" ? undefined : value === "true",
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <p className={styles.batchSummary}>
                <UiText text="仅保存工作稿，不改变已发布内容或已冻结的定时版本。" />
              </p>
            </fieldset>
          ) : (
            <p className={styles.batchSummary}>
              <UiText
                text={
                  mode === "trash"
                    ? "所列内容将从前台撤下，可在回收站恢复。回收原文时需要包含其全部语言版本。"
                    : "所列内容将恢复为工作稿，需要单独发布才会显示在前台。"
                }
              />
            </p>
          )}
          {(action.message || targets.length > 50) && (
            <p className={styles.error} role="alert">
              {targets.length > 50 ? (
                <UiText text="一次最多操作 50 份语言版本，请减少选择。" />
              ) : (
                <UiText text={action.message} />
              )}
            </p>
          )}
        </div>
        <footer className={styles.quickFooter}>
          <AdminActionButton
            icon="close"
            onClick={close}
            disabled={action.busy}
          >
            <UiText text="取消" />
          </AdminActionButton>
          <AdminActionButton
            type="submit"
            icon={
              mode === "trash" ? "trash" : mode === "restore" ? "undo" : "save"
            }
            tone={mode === "trash" ? "danger" : "accent"}
            disabled={
              !targets.length ||
              targets.length > 50 ||
              action.busy ||
              closing ||
              (mode === "edit" && !dirty)
            }
          >
            <UiText
              text={
                action.busy
                  ? "正在处理…"
                  : mode === "edit"
                    ? "保存到草稿"
                    : mode === "trash"
                      ? "确认移至回收站"
                      : "确认恢复"
              }
            />
          </AdminActionButton>
        </footer>
      </Form>
    </Modal>
  );
}
