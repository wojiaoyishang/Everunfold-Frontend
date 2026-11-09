"use client";
import { useId, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { useAccountAction } from "@/core/accounts/use-action";
import { useAdminRequest } from "@/core/admin/account-context";
import { draftError } from "@/core/content-management/draft-state";
import {
  previewTaxonomyChange,
  saveTaxonomyChange,
  type TaxonomyCommand,
  type TaxonomyItem,
  type TaxonomyImpact,
} from "@/core/contracts/content-admin";
import { Modal } from "../../components/ui/modal";
import { Form, TextField } from "../../components/ui/primitives";
import { FormField } from "../../components/ui/form-field";
import { Select } from "../../components/ui/select";
import { AdminActionButton } from "../components/action-button";
import styles from "./taxonomy.module.css";
export function TaxonomyDialog({
  kind,
  action,
  item,
  choices,
  onClose,
  onSaved,
}: {
  kind: "category" | "tag";
  action: TaxonomyCommand["action"];
  item?: TaxonomyItem;
  choices: TaxonomyItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const id = useId(),
    request = useAccountAction(draftError),
    { baseUrl, csrfToken } = useAdminRequest();
  const [name, setName] = useState(item?.name ?? ""),
    [parent, setParent] = useState(item?.parent_id ?? ""),
    [target, setTarget] = useState("");
  const [impact, setImpact] = useState<TaxonomyImpact | null>(null),
    [closing, setClosing] = useState(false),
    [done, setDone] = useState(false);
  const title = {
    create: kind === "category" ? "添加分类" : "添加标签",
    update: "编辑名称与层级",
    merge: "合并分类或标签",
    remove: "删除分类或标签",
  }[action];
  const payload: Omit<TaxonomyCommand, "operation_id"> = {
    action,
    kind,
    id: item?.id,
    expected_revision: item?.revision,
    ...(action === "create" || action === "update"
      ? { name: name.trim(), parent_id: parent || null }
      : {}),
    ...(action === "merge"
      ? {
          target_id: target,
          expected_target_revision: choices.find((c) => c.id === target)
            ?.revision,
        }
      : {}),
    impact_token: impact?.token,
  };
  const close = () => {
    if (!request.busy) setClosing(true);
  };
  const submit = async () => {
    if (action !== "create" && !impact) {
      await request.run(async (signal) => {
        const result = await previewTaxonomyChange(
          baseUrl,
          { ...payload, operation_id: request.operation(payload) },
          csrfToken,
          { signal },
        );
        if (!signal.aborted) setImpact(result.data);
      }, "");
      return;
    }
    const ok = await request.run(async (signal) => {
      await saveTaxonomyChange(
        baseUrl,
        { ...payload, operation_id: request.operation(payload) },
        csrfToken,
        { signal },
      );
    }, "");
    if (ok) {
      setDone(true);
      setClosing(true);
    }
  };
  return (
    <Modal
      title={title}
      className={styles.dialog}
      closing={closing}
      onClose={close}
      onExited={done ? onSaved : onClose}
    >
      <Form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {item && <strong className={styles.termName}>{item.name}</strong>}
        {!impact && (
          <>
            {(action === "create" || action === "update") && (
              <>
                <FormField id={`${id}-name`} label="名称">
                  <TextField
                    id={`${id}-name`}
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={request.busy}
                  />
                </FormField>
                {kind === "category" && (
                  <FormField id={`${id}-parent`} label="父分类">
                    <Select
                      name={`${id}-parent`}
                      label="父分类"
                      value={parent}
                      options={[
                        { value: "", label: t("无父级") },
                        ...choices
                          .filter((c) => c.id !== item?.id)
                          .map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      onValueChange={setParent}
                      disabled={request.busy}
                    />
                  </FormField>
                )}
              </>
            )}
            {action === "merge" && (
              <FormField id={`${id}-target`} label="合并到">
                <Select
                  name={`${id}-target`}
                  label="合并到"
                  value={target}
                  options={[
                    { value: "", label: t("选择目标") },
                    ...choices
                      .filter((c) => c.id !== item?.id)
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  onValueChange={setTarget}
                  disabled={request.busy}
                />
              </FormField>
            )}
          </>
        )}
        {impact && (
          <div className={styles.impact}>
            <h3>
              <UiText text="确认影响范围" />
            </h3>
            <dl>
              {[
                ["工作稿", impact.drafts],
                ["已发布", impact.published],
                ["定时版本", impact.scheduled],
                ["直接子分类", impact.children],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>
                    <UiText text={String(label)} />
                  </dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p>
              <UiText text="会更新工作稿及当前公开内容的分类关联，正文和历史版本保持。旧草稿再次发布时使用调整后的名称。" />
            </p>
            {action === "remove" && (
              <p>
                <UiText text="只移除分类关联，不删除文章；子分类上移一级。" />
              </p>
            )}
          </div>
        )}
        {request.message && (
          <p role="alert" className={styles.error}>
            <UiText text={request.message} />
          </p>
        )}
        <footer className={styles.actions}>
          <AdminActionButton
            icon="close"
            disabled={request.busy}
            onClick={close}
          >
            <UiText text="取消" />
          </AdminActionButton>
          {impact && (
            <AdminActionButton
              icon="arrow-left"
              disabled={request.busy}
              onClick={() => {
                setImpact(null);
                request.setMessage("");
              }}
            >
              <UiText text="重新检查" />
            </AdminActionButton>
          )}
          <AdminActionButton
            icon={impact || action === "create" ? "save" : "eye"}
            tone={action === "remove" ? "danger" : "accent"}
            type="submit"
            disabled={
              request.busy || closing || (action === "merge" && !target)
            }
          >
            <UiText
              text={
                request.busy
                  ? "正在处理…"
                  : impact
                    ? "确认并保存"
                    : action === "create"
                      ? "添加"
                      : "查看影响"
              }
            />
          </AdminActionButton>
        </footer>
      </Form>
    </Modal>
  );
}
